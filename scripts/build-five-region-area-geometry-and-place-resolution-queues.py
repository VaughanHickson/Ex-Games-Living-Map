#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "geography" / "staged" / "five-region-landscape-areas-002.json"
OUTDIR = ROOT / "data" / "geography" / "staged"
GEOM = OUTDIR / "five-region-area-geometry-queue-001.json"
PLACE = OUTDIR / "five-region-place-resolution-queue-001.json"

# Geometry acquisition priority:
# A = likely to have authoritative/public polygon geometry and high LM value
# B = likely to have useful public geometry, but source matching may be harder
# C = named ecological/wider area that may require representative/derived geometry later
PRIORITY_BY_TYPE = {
    "FOREST": "A",
    "RESERVE_SANCTUARY": "A",
    "ISLAND": "A",
    "HARBOUR_BAY": "A",
    "WETLAND_LAKE": "A",
    "RIVER_STREAM": "B",
    "CATCHMENT": "B",
    "PENINSULA": "B",
    "RANGE_MOUNTAIN": "B",
    "VALLEY": "B",
    "COASTAL_AREA": "B",
    "WIDER_ECOLOGICAL_AREA": "C",
}

# Suggested source classes only. This script does not fetch external data.
SOURCE_HINTS = {
    "FOREST": ["DOC public conservation land", "LINZ/place datasets", "regional/council GIS"],
    "RESERVE_SANCTUARY": ["DOC public conservation land", "council reserve GIS"],
    "ISLAND": ["LINZ coastline/island geometry", "DOC public conservation land"],
    "HARBOUR_BAY": ["LINZ hydro/coastline", "regional/council GIS"],
    "WETLAND_LAKE": ["LINZ hydro", "regional/council GIS", "DOC"],
    "RIVER_STREAM": ["LINZ hydro", "regional/council GIS"],
    "CATCHMENT": ["regional council catchment GIS", "LAWA/council source"],
    "PENINSULA": ["LINZ/place/coastline", "regional/council GIS"],
    "RANGE_MOUNTAIN": ["LINZ/place/topographic data", "DOC/council GIS"],
    "VALLEY": ["LINZ/place/topographic data", "regional/council GIS"],
    "COASTAL_AREA": ["LINZ coastline/place data", "regional/council GIS"],
    "WIDER_ECOLOGICAL_AREA": ["case-specific authoritative source", "representative geometry only if necessary"],
}

def main():
    if not SRC.exists():
        raise SystemExit(f"Missing refined area package: {SRC}")

    data = json.loads(SRC.read_text(encoding="utf-8"))
    areas = data.get("areas", [])
    excluded = data.get("excludedCandidates", [])

    geometry_rows = []
    by_priority = Counter()
    by_region = Counter()
    by_type = Counter()

    for area in areas:
        area_type = area["areaType"]
        priority = PRIORITY_BY_TYPE.get(area_type, "C")
        row = {
            "areaId": area["id"],
            "name": area["name"],
            "region": area["region"],
            "areaType": area_type,
            "participantCount": area.get("participantCount", 0),
            "priority": priority,
            "currentBoundaryStatus": area.get("boundaryStatus"),
            "currentGeometryStatus": area.get("geometryStatus"),
            "suggestedSourceClasses": SOURCE_HINTS.get(area_type, []),
            "geometryDecision": "PENDING",
        }
        geometry_rows.append(row)
        by_priority[priority] += 1
        by_region[area["region"]] += 1
        by_type[area_type] += 1

    geometry_rows.sort(
        key=lambda r: (
            r["priority"],
            -r["participantCount"],
            r["region"],
            r["areaType"],
            r["name"].casefold(),
        )
    )

    geometry_payload = {
        "schema": "EXG-LM-AREA-GEOMETRY-QUEUE-001",
        "source": str(SRC.relative_to(ROOT)),
        "status": "STAGED",
        "policy": {
            "authoritative_geometry_preferred": True,
            "no_boundary_invention": True,
            "representative_geometry_requires_explicit_decision": True,
        },
        "count": len(geometry_rows),
        "countsByPriority": dict(sorted(by_priority.items())),
        "countsByRegion": dict(sorted(by_region.items())),
        "countsByType": dict(sorted(by_type.items())),
        "queue": geometry_rows,
    }

    place_rows = []
    place_class_counts = Counter()
    place_region_counts = Counter()

    for row in excluded:
        cls = row.get("auditClass")
        place_class_counts[cls] += 1
        place_region_counts[row.get("region")] += 1

        if cls == "LIKELY_NAMED_PLACE":
            action = "PLACE_SOURCE_MATCH"
        elif cls == "COMPOUND_OR_MULTI_PLACE":
            action = "SPLIT_OR_CHOOSE_PRIMARY_PLACE"
        elif cls == "ADMIN_OR_WIDER_AREA":
            action = "ADMIN_GEOGRAPHY_REVIEW"
        else:
            action = "MANUAL_REVIEW"

        place_rows.append({
            "candidateId": row.get("id"),
            "name": row.get("name"),
            "region": row.get("region"),
            "participantCount": len(row.get("participantIds", [])),
            "participantIds": row.get("participantIds", []),
            "participantNames": row.get("participantNames", []),
            "auditClass": cls,
            "recommendedAction": action,
            "resolutionStatus": "PENDING",
        })

    place_rows.sort(
        key=lambda r: (
            r["recommendedAction"],
            -r["participantCount"],
            r["region"],
            r["name"].casefold(),
        )
    )

    place_payload = {
        "schema": "EXG-LM-PLACE-RESOLUTION-QUEUE-001",
        "source": str(SRC.relative_to(ROOT)),
        "status": "STAGED",
        "policy": {
            "not_landscape_by_default": True,
            "source_geography_preserved": True,
            "no_forced_suburb_mapping": True,
        },
        "count": len(place_rows),
        "countsByAuditClass": dict(sorted(place_class_counts.items())),
        "countsByRegion": dict(sorted(place_region_counts.items())),
        "queue": place_rows,
    }

    OUTDIR.mkdir(parents=True, exist_ok=True)
    GEOM.write_text(json.dumps(geometry_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    PLACE.write_text(json.dumps(place_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("EX GAMES LIVING MAP — FIVE-REGION AREA GEOMETRY + PLACE RESOLUTION QUEUES")
    print("=" * 76)
    print(f"Landscape Areas queued for geometry: {len(geometry_rows)}")
    for p, c in sorted(by_priority.items()):
        print(f"  Priority {p}: {c}")
    print()
    print(f"Excluded place terms queued for resolution: {len(place_rows)}")
    for cls, c in sorted(place_class_counts.items()):
        print(f"  {cls:28} {c:4d}")
    print()
    print(f"Geometry queue: {GEOM.relative_to(ROOT)}")
    print(f"Place queue:    {PLACE.relative_to(ROOT)}")
    print("No source files were modified.")
    print("Nothing was copied to public/data or registered in the LM.")

if __name__ == "__main__":
    main()
