#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "geography" / "staged" / "four-region-landscape-areas-001.json"
OUT = ROOT / "data" / "geography" / "staged" / "four-region-landscape-area-classification-audit-001.json"

# This is an audit only. It does not rewrite the staged Area package.

ADMIN_HINTS = (
    "district", "region", "ward", "board", "rohe", "city",
)

LANDSCAPE_HINTS = {
    "FOREST": ("forest", "bush"),
    "RESERVE_SANCTUARY": ("reserve", "sanctuary", "park"),
    "ISLAND": ("island", "motu"),
    "HARBOUR_BAY": ("harbour", "bay", "sound"),
    "CATCHMENT": ("catchment",),
    "RIVER_STREAM": ("river", "stream", "creek"),
    "WETLAND_LAKE": ("wetland", "lake", "lagoon", "swamp"),
    "VALLEY": ("valley", "gully", "gorge"),
    "RANGE_MOUNTAIN": ("range", "ranges", "maunga", "mount", "mountain", "hill", "hills"),
    "PENINSULA": ("peninsula",),
    "COASTAL_AREA": ("coast", "coastal", "beach", "estuary", "headland"),
}

PLACE_SUFFIXES = (
    "beach", "springs", "heads", "junction", "village", "township",
)

def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").casefold()).strip()

def classify_other(name: str):
    n = norm(name)

    for area_type, hints in LANDSCAPE_HINTS.items():
        if any(h in n for h in hints):
            return "LIKELY_LANDSCAPE", area_type

    if any(h in n for h in ADMIN_HINTS):
        return "ADMIN_OR_WIDER_AREA", None

    if "/" in name or "," in name or " and " in n:
        return "COMPOUND_OR_MULTI_PLACE", None

    if any(n.endswith(sfx) for sfx in PLACE_SUFFIXES):
        return "LIKELY_NAMED_PLACE", None

    # Single/simple names with no landscape signal are more likely to be
    # named places than landscape Areas. Keep them out of automatic Area
    # creation until reviewed.
    if len(name.split()) <= 3:
        return "LIKELY_NAMED_PLACE", None

    return "NEEDS_REVIEW", None

def main():
    if not SRC.exists():
        raise SystemExit(f"Missing staged area package: {SRC}")

    data = json.loads(SRC.read_text(encoding="utf-8"))
    rows = data.get("areas", [])

    result_rows = []
    counts = Counter()
    by_region = defaultdict(Counter)

    for row in rows:
        if row.get("areaType") != "OTHER_LANDSCAPE":
            continue

        cls, suggested_type = classify_other(row.get("name", ""))
        counts[cls] += 1
        by_region[row.get("region")][cls] += 1

        result_rows.append({
            "id": row.get("id"),
            "name": row.get("name"),
            "region": row.get("region"),
            "participantCount": row.get("participantCount"),
            "currentAreaType": row.get("areaType"),
            "auditClass": cls,
            "suggestedAreaType": suggested_type,
            "participantNames": row.get("participantNames", []),
        })

    result_rows.sort(
        key=lambda r: (r["auditClass"], r["region"], r["name"].casefold())
    )

    out = {
        "schema": "EXG-LM-LANDSCAPE-AREA-CLASSIFICATION-AUDIT-001",
        "source": str(SRC.relative_to(ROOT)),
        "policy": {
            "audit_only": True,
            "source_not_modified": True,
            "simple_named_places_not_auto_promoted_to_landscape_areas": True,
        },
        "otherLandscapeCount": len(result_rows),
        "counts": dict(sorted(counts.items())),
        "countsByRegion": {
            region: dict(sorted(counter.items()))
            for region, counter in sorted(by_region.items())
        },
        "records": result_rows,
    }

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("EX GAMES LIVING MAP — LANDSCAPE AREA CLASSIFICATION AUDIT")
    print("=" * 76)
    print(f"OTHER_LANDSCAPE records audited: {len(result_rows)}")
    print()
    print("Classification:")
    for k, v in sorted(counts.items()):
        print(f"  {k:28} {v:4d}")

    print()
    print("By region:")
    for region, counter in sorted(by_region.items()):
        print(f"\n  {region}")
        for k, v in sorted(counter.items()):
            print(f"    {k:26} {v:4d}")

    print()
    print("Likely landscapes:")
    for r in result_rows:
        if r["auditClass"] == "LIKELY_LANDSCAPE":
            print(f"  {r['region']:24} | {r['name']:38} | {r['suggestedAreaType']}")

    print()
    print("Likely named places (first 60):")
    named = [r for r in result_rows if r["auditClass"] == "LIKELY_NAMED_PLACE"]
    for r in named[:60]:
        print(f"  {r['region']:24} | {r['name']}")
    if len(named) > 60:
        print(f"  ... +{len(named)-60} more")

    print()
    print(f"Audit output: {OUT.relative_to(ROOT)}")
    print("No Area records were modified.")
    print("Nothing was copied to public/data or registered in the LM.")

if __name__ == "__main__":
    main()
