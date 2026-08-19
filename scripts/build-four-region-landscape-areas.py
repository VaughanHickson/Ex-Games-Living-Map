#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "data" / "geography" / "four-region-locality-resolution-001.json"
OUTDIR = ROOT / "data" / "geography" / "staged"
OUTFILE = OUTDIR / "four-region-landscape-areas-001.json"

TYPE_RULES = [
    ("FOREST", ("forest",)),
    ("RESERVE_SANCTUARY", ("reserve", "sanctuary")),
    ("ISLAND", ("island",)),
    ("HARBOUR_BAY", ("harbour", "bay")),
    ("CATCHMENT", ("catchment",)),
    ("RIVER_STREAM", ("river", "stream")),
    ("WETLAND_LAKE", ("wetland", "lake", "lagoon")),
    ("VALLEY", ("valley",)),
    ("RANGE_MOUNTAIN", ("range", "ranges", "maunga", "mount", "mountain")),
    ("PENINSULA", ("peninsula",)),
]

def slug(value: str) -> str:
    norm = "".join(
        c for c in unicodedata.normalize("NFKD", value)
        if not unicodedata.combining(c)
    ).casefold()
    norm = norm.replace("&", " and ")
    norm = re.sub(r"[^a-z0-9]+", "-", norm).strip("-")
    return norm[:96] or "area"

def classify(name: str, classification: str) -> str:
    text = name.casefold()
    for area_type, words in TYPE_RULES:
        if any(word in text for word in words):
            return area_type
    if classification == "WIDER_OR_LANDSCAPE":
        return "WIDER_ECOLOGICAL_AREA"
    return "OTHER_LANDSCAPE"

def canonical_name(name: str) -> str:
    # Preserve the public/source wording, only normalize whitespace.
    return re.sub(r"\s+", " ", name).strip()

def main():
    if not REPORT.exists():
        raise SystemExit(f"Missing resolution report: {REPORT}")

    payload = json.loads(REPORT.read_text(encoding="utf-8"))
    areas = {}
    participant_links = defaultdict(list)

    for region, region_data in payload["regions"].items():
        unresolved_lookup = {
            row["name"]: row
            for row in region_data.get("unresolved_locality_values", [])
        }

        for participant in region_data.get("participants", []):
            pid = participant.get("id")
            pname = participant.get("name")
            for result in participant.get("resolution", []):
                status = result.get("status")
                source = result.get("source")
                if not source:
                    continue

                # Landscape candidates are the clearly classified wider terms,
                # plus unresolved/compound source geography. Region-only and
                # no-locality values are excluded.
                if status not in {
                    "WIDER_OR_LANDSCAPE",
                    "COMPOUND_PLACE",
                    "UNRESOLVED_PLACE",
                }:
                    continue

                name = canonical_name(source)
                meta = unresolved_lookup.get(source, {})
                area_type = classify(name, status)
                key = (region, name.casefold())

                if key not in areas:
                    area_id = f"area-{slug(region.replace(' Region',''))}-{slug(name)}"
                    areas[key] = {
                        "id": area_id,
                        "name": name,
                        "areaType": area_type,
                        "region": region,
                        "boundaryStatus": "UNRESOLVED",
                        "geometryStatus": "NOT_ATTACHED",
                        "sourceTerms": [name],
                        "sourceResolutionClasses": [status],
                        "participantIds": [],
                        "participantNames": [],
                        "evidence": {
                            "origin": "four-region-locality-resolution-001",
                            "participantCountFromResolver": meta.get("count"),
                        },
                    }
                area = areas[key]
                if status not in area["sourceResolutionClasses"]:
                    area["sourceResolutionClasses"].append(status)
                if pid and pid not in area["participantIds"]:
                    area["participantIds"].append(pid)
                    participant_links[pid].append(area["id"])
                if pname and pname not in area["participantNames"]:
                    area["participantNames"].append(pname)

    rows = sorted(
        areas.values(),
        key=lambda x: (x["region"], x["areaType"], x["name"].casefold())
    )

    for row in rows:
        row["participantCount"] = len(row["participantIds"])

    counts_by_region = defaultdict(int)
    counts_by_type = defaultdict(int)
    for row in rows:
        counts_by_region[row["region"]] += 1
        counts_by_type[row["areaType"]] += 1

    out = {
        "schema": "EXG-LM-LANDSCAPE-AREAS-001",
        "areaModel": "EXG-LM-AREA-MODEL-002",
        "status": "STAGED",
        "geometryPolicy": "No boundaries invented; all candidate landscape areas remain NOT_ATTACHED/UNRESOLVED until authoritative or accepted geometry is supplied.",
        "areaCount": len(rows),
        "countsByRegion": dict(sorted(counts_by_region.items())),
        "countsByType": dict(sorted(counts_by_type.items())),
        "areas": rows,
        "participantAreaLinks": dict(sorted(participant_links.items())),
    }

    OUTDIR.mkdir(parents=True, exist_ok=True)
    OUTFILE.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("EX GAMES LIVING MAP — FOUR-REGION LANDSCAPE AREA BUILD")
    print("=" * 76)
    print(f"Areas staged: {len(rows)}")
    print()
    print("By region:")
    for region, count in sorted(counts_by_region.items()):
        print(f"  {region:28} {count:4d}")
    print()
    print("By type:")
    for typ, count in sorted(counts_by_type.items()):
        print(f"  {typ:28} {count:4d}")
    print()
    print(f"Output: {OUTFILE.relative_to(ROOT)}")
    print("No boundaries were invented.")
    print("Nothing was copied to public/data or registered in the LM.")

if __name__ == "__main__":
    main()
