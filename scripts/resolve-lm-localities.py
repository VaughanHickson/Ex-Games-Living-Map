#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
import re
import unicodedata
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALITY_FILE = ROOT / "public" / "data" / "nz-suburbs-localities.geojson"
STAGED = ROOT / "data" / "participants" / "staged"
OUT = ROOT / "data" / "participants" / "resolved"
REPORTS = ROOT / "data" / "geography"

REGIONS = {
    "Northland Region": "participants-northland-located-002.json",
    "Auckland": "participants-auckland-located-002.json",
    "Waikato Region": "participants-waikato-located-001.json",
    "Bay of Plenty Region": "participants-bay-of-plenty-located-003.json",
}

# Explicit aliases are deliberately conservative. They only cover obvious
# orthographic/macron variants and known LM naming variants. Wider areas,
# ecological landscapes, catchments and compound descriptions are not forced
# into a locality.
EXPLICIT_ALIASES = {
    "Northland Region": {
        "Okaihau": "Ōkaihau",
        "Ruakaka": "Ruakākā",
        "Whangarei": "Whangārei",
        "Whangarei Heads": "Whangārei Heads",
        "Hukerenui": "Hūkerenui",
        "Mokau": "Mōkau",
        "Okura": "Ōkura",
        "Taupo Bay": "Taupō Bay",
        "Kaitāia": "Kaitaia",
        "Kokopu, Whangārei": "Kokopu",
    },
    "Auckland": {
        "Okura": "Ōkura",
        "Pākiri": "Pakiri",
        "Te Henga (Bethells Beach)": "Bethells Beach",
        "Te Henga / Bethells": "Bethells Beach",
    },
    "Waikato Region": {
        "Atiamuri": "Ātiamuri",
        "Kāwhia": "Kawhia",
        "Cooks Beach/Ferry Landing": "Cooks Beach",
    },
    "Bay of Plenty Region": {
        "Waihī Beach": "Waihi Beach",
        "Lake Ōkāreka": "Lake Okareka",
        "Maketū": "Maketu",
        "Pāpāmoa": "Papamoa",
        "Pahoia": "Pahoia",
        "Ōhinemutu": "Ohinemutu",
    },
}

# Terms which strongly indicate that the source is a wider/landscape geography
# rather than a suburb/locality. These remain unresolved for classification.
LANDSCAPE_HINTS = (
    "region", "district", "harbour", "catchment", "stream", "river", "valley",
    "ranges", "range", "forest", "peninsula", "island", "bay of islands",
    "coastal", "coast", "maunga", "mount", "mountain", "reserve", "lagoon",
    "wetland", "headland", "estuary", "multiple", "boundary", "wider area",
)

def strip_diacritics(value: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", value)
        if not unicodedata.combining(c)
    )

def key(value: str) -> str:
    value = strip_diacritics(value or "").casefold()
    value = value.replace("&", " and ")
    value = re.sub(r"[’'`]", "", value)
    value = re.sub(r"[/,_()–—-]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value

def source_localities(participant: dict) -> list[str]:
    vals = participant.get("mapLocalities")
    if isinstance(vals, list) and vals:
        return [str(v).strip() for v in vals if str(v).strip()]
    vals = participant.get("localities")
    if isinstance(vals, list):
        return [str(v).strip() for v in vals if str(v).strip()]
    val = participant.get("locality")
    if val:
        return [str(val).strip()]
    return []

def classify_unresolved(name: str, region_name: str) -> str:
    k = key(name)
    if not k:
        return "NO_LOCALITY"
    if k in {key(region_name), key(region_name.replace(" Region", ""))}:
        return "REGION_ONLY"
    if any(h in k for h in LANDSCAPE_HINTS):
        return "WIDER_OR_LANDSCAPE"
    if "/" in name or "," in name:
        return "COMPOUND_PLACE"
    return "UNRESOLVED_PLACE"

def load_locality_index():
    data = json.loads(LOCALITY_FILE.read_text(encoding="utf-8"))
    by_region = defaultdict(list)
    for f in data["features"]:
        p = f.get("properties") or {}
        region = p.get("region")
        name = p.get("name") or p.get("major_name")
        if region and name:
            by_region[region].append(str(name))

    indexes = {}
    for region, names in by_region.items():
        exact = set(names)
        normalized = defaultdict(list)
        for name in names:
            normalized[key(name)].append(name)
        indexes[region] = {
            "names": sorted(exact),
            "exact": exact,
            "normalized": normalized,
        }
    return indexes

def resolve_one(name: str, region: str, idx: dict):
    if name in idx["exact"]:
        return name, "EXACT", 1.0

    alias = EXPLICIT_ALIASES.get(region, {}).get(name)
    if alias and alias in idx["exact"]:
        return alias, "EXPLICIT_ALIAS", 1.0

    matches = idx["normalized"].get(key(name), [])
    if len(matches) == 1:
        return matches[0], "NORMALIZED", 0.99

    # Conservative fuzzy matching: only accept a very close unique match.
    # This catches punctuation/spacing quirks but avoids forcing wider areas
    # into unrelated suburbs.
    if classify_unresolved(name, region) in {"WIDER_OR_LANDSCAPE", "REGION_ONLY"}:
        return None, None, None

    target = key(name)
    scored = []
    for candidate in idx["names"]:
        ratio = SequenceMatcher(None, target, key(candidate)).ratio()
        if ratio >= 0.94:
            scored.append((ratio, candidate))
    scored.sort(reverse=True)

    if scored and (len(scored) == 1 or scored[0][0] - scored[1][0] >= 0.04):
        return scored[0][1], "FUZZY_HIGH", round(scored[0][0], 4)

    return None, None, None

def main():
    if not LOCALITY_FILE.exists():
        raise SystemExit(f"Missing {LOCALITY_FILE}")

    indexes = load_locality_index()
    OUT.mkdir(parents=True, exist_ok=True)
    REPORTS.mkdir(parents=True, exist_ok=True)

    overall = Counter()
    report = {
        "schema": "EXG-LM-LOCALITY-RESOLUTION-001",
        "policy": {
            "source_participant_files_unchanged": True,
            "exact_and_obvious_alias_resolution_only": True,
            "wider_landscape_terms_not_forced_into_localities": True,
        },
        "regions": {},
    }

    print("EX GAMES LIVING MAP — FOUR-REGION LOCALITY RESOLVER")
    print("=" * 76)

    for region, filename in REGIONS.items():
        src = STAGED / filename
        if not src.exists():
            raise SystemExit(f"Missing staged dataset: {src}")

        idx = indexes.get(region)
        if not idx:
            raise SystemExit(f"No locality index for region: {region}")

        payload = json.loads(src.read_text(encoding="utf-8"))
        participants = payload.get("participants", [])
        resolved_payload = copy.deepcopy(payload)

        counts = Counter()
        unresolved = defaultdict(lambda: {"count": 0, "participants": [], "classification": None})
        resolution_rows = []

        for original, participant in zip(participants, resolved_payload["participants"]):
            raw_places = source_localities(original)
            map_localities = []
            details = []

            if not raw_places:
                counts["NO_LOCALITY"] += 1
                details.append({"source": None, "status": "NO_LOCALITY"})
            else:
                for place in raw_places:
                    resolved, method, confidence = resolve_one(place, region, idx)
                    if resolved:
                        if resolved not in map_localities:
                            map_localities.append(resolved)
                        counts[method] += 1
                        details.append({
                            "source": place,
                            "resolved": resolved,
                            "status": method,
                            "confidence": confidence,
                        })
                    else:
                        classification = classify_unresolved(place, region)
                        counts[classification] += 1
                        item = unresolved[place]
                        item["count"] += 1
                        item["classification"] = classification
                        if len(item["participants"]) < 10:
                            item["participants"].append(original.get("name"))
                        details.append({
                            "source": place,
                            "status": classification,
                        })

            # Preserve evidence-bearing source geography; mapLocalities is the
            # derived display/resolution field.
            participant["mapLocalities"] = map_localities
            participant["localityResolution"] = {
                "version": "001",
                "results": details,
            }

            resolution_rows.append({
                "id": original.get("id"),
                "name": original.get("name"),
                "sourceLocalities": raw_places,
                "mapLocalities": map_localities,
                "resolution": details,
            })

        output_name = filename.replace(".json", "-resolved-001.json")
        target = OUT / output_name
        target.write_text(
            json.dumps(resolved_payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

        resolved_participants = sum(1 for p in resolved_payload["participants"] if p.get("mapLocalities"))
        unresolved_participants = len(participants) - resolved_participants

        region_report = {
            "source": str(src.relative_to(ROOT)),
            "output": str(target.relative_to(ROOT)),
            "participant_count": len(participants),
            "participants_with_resolved_map_locality": resolved_participants,
            "participants_without_resolved_map_locality": unresolved_participants,
            "resolution_counts_by_locality_value": dict(sorted(counts.items())),
            "unresolved_locality_values": [
                {
                    "name": name,
                    **meta,
                }
                for name, meta in sorted(
                    unresolved.items(),
                    key=lambda kv: (-kv[1]["count"], kv[0].casefold()),
                )
            ],
            "participants": resolution_rows,
        }
        report["regions"][region] = region_report
        overall.update(counts)

        print()
        print(region.upper())
        print("-" * 76)
        print(f"Participants:                              {len(participants):5d}")
        print(f"Participants resolved to >=1 locality:    {resolved_participants:5d}")
        print(f"Participants still unresolved:            {unresolved_participants:5d}")
        print(f"Exact locality values:                    {counts['EXACT']:5d}")
        print(f"Explicit aliases:                         {counts['EXPLICIT_ALIAS']:5d}")
        print(f"Normalized/macron variants:               {counts['NORMALIZED']:5d}")
        print(f"High-confidence fuzzy:                    {counts['FUZZY_HIGH']:5d}")
        print(f"Wider/landscape values retained:          {counts['WIDER_OR_LANDSCAPE']:5d}")
        print(f"Compound place values retained:           {counts['COMPOUND_PLACE']:5d}")
        print(f"Other unresolved place values:            {counts['UNRESOLVED_PLACE']:5d}")
        print(f"Region-only values:                       {counts['REGION_ONLY']:5d}")
        print(f"No-locality participants:                 {counts['NO_LOCALITY']:5d}")
        print(f"Output: {target.relative_to(ROOT)}")

        unresolved_sorted = sorted(
            unresolved.items(),
            key=lambda kv: (-kv[1]["count"], kv[0].casefold()),
        )
        if unresolved_sorted:
            print("\nTop unresolved values:")
            for name, meta in unresolved_sorted[:25]:
                examples = ", ".join(x for x in meta["participants"][:3] if x)
                print(
                    f"  {name[:38]:38} {meta['count']:3d} "
                    f"{meta['classification']:20} {examples}"
                )

    report["overall_resolution_counts_by_locality_value"] = dict(sorted(overall.items()))
    report_path = REPORTS / "four-region-locality-resolution-001.json"
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print()
    print("=" * 76)
    print(f"Resolution report: {report_path.relative_to(ROOT)}")
    print("Source participant files were not modified.")
    print("Nothing was copied to public/data or registered in the LM.")

if __name__ == "__main__":
    main()
