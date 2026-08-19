#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "geography" / "staged" / "four-region-area-geometry-queue-001.json"
OUT = ROOT / "data" / "geography" / "staged" / "northland-priority-a-geometry-acquisition-001.json"

# Semantic corrections discovered when the Northland Priority A queue was inspected.
# These corrections affect the acquisition queue only; source Area files are not modified.
CORRECTIONS = {
    "area-northland-bay-of-islands": {
        "correctedAreaType": "HARBOUR_BAY",
        "action": "ACQUIRE",
        "canonicalTarget": "Bay of Islands",
        "notes": "Bay/harbour geography; not an island."
    },
    "area-northland-eastern-bay-of-islands": {
        "correctedAreaType": "WIDER_ECOLOGICAL_AREA",
        "action": "REVIEW_BEFORE_GEOMETRY",
        "canonicalTarget": "Eastern Bay of Islands",
        "notes": "Directional/wider area rather than a discrete island."
    },
    "area-northland-eastern-whangarei-parua-bay-ngunguru": {
        "correctedAreaType": "COASTAL_AREA",
        "action": "REVIEW_BEFORE_GEOMETRY",
        "canonicalTarget": "Eastern Whangārei, Parua Bay–Ngunguru",
        "notes": "Multi-place coastal extent; not one bay polygon."
    },
    "area-northland-mahinepua-and-tauranga-bay": {
        "correctedAreaType": "COMPOUND_AREA",
        "action": "SPLIT_REQUIRED",
        "canonicalTarget": None,
        "notes": "Compound source geography should not become one invented boundary."
    },
    "area-northland-whale-bay-matapouri": {
        "correctedAreaType": "COMPOUND_AREA",
        "action": "SPLIT_OR_PRIMARY_PLACE_REVIEW",
        "canonicalTarget": None,
        "notes": "Two named coastal places; resolve source intent before geometry."
    },
    "area-northland-motutangi": {
        "correctedAreaType": "PLACE_REVIEW",
        "action": "PLACE_SOURCE_MATCH",
        "canonicalTarget": "Motutangi",
        "notes": "Name alone does not establish an island."
    },
    "area-northland-pewhairangi-bay-of-islands": {
        "correctedAreaType": "HARBOUR_BAY",
        "action": "ALIAS_DEDUPE",
        "canonicalTarget": "Bay of Islands",
        "notes": "Treat as Bay of Islands alias/context candidate, not a separate island."
    },
    "area-northland-purerua-peninsula-bay-of-islands": {
        "correctedAreaType": "PENINSULA",
        "action": "ACQUIRE",
        "canonicalTarget": "Purerua Peninsula",
        "notes": "Explicit peninsula."
    },
    "area-northland-russell-bay-of-islands": {
        "correctedAreaType": "NAMED_PLACE",
        "action": "MOVE_TO_PLACE_QUEUE",
        "canonicalTarget": "Russell",
        "notes": "Named settlement/place context, not an island Area."
    },
    "area-northland-tangatapu-catchment-bay-of-islands": {
        "correctedAreaType": "CATCHMENT",
        "action": "ACQUIRE_OR_DERIVE",
        "canonicalTarget": "Tangatapu Catchment",
        "notes": "Explicit catchment."
    },
    "area-northland-lake-omapere": {
        "correctedAreaType": "WETLAND_LAKE",
        "action": "ALIAS_DEDUPE",
        "canonicalTarget": "Lake Ōmāpere",
        "notes": "Duplicate spelling; canonical target is Lake Ōmāpere."
    },
}

SOURCE_TIERS = {
    "DOC_PCL": {
        "authority": "Department of Conservation",
        "useFor": ["FOREST", "RESERVE_SANCTUARY"],
        "data": "DOC Open Spatial Data Portal — public conservation areas; GeoJSON/ESRI REST available.",
        "tier": 1,
    },
    "LINZ_NZGB": {
        "authority": "Toitū Te Whenua LINZ / NZ Geographic Board",
        "useFor": ["NAMED_PLACE", "PENINSULA", "HARBOUR_BAY", "WETLAND_LAKE", "PLACE_REVIEW"],
        "data": "NZ Place Names Gazetteer point/line/polygon datasets.",
        "tier": 1,
    },
    "LINZ_COAST": {
        "authority": "Toitū Te Whenua LINZ",
        "useFor": ["ISLAND", "HARBOUR_BAY", "COASTAL_AREA", "PENINSULA"],
        "data": "NZ Coastlines and Islands polygons / hydrographic datasets.",
        "tier": 1,
    },
    "NRC_GIS": {
        "authority": "Northland Regional Council",
        "useFor": ["CATCHMENT", "HARBOUR_BAY", "WETLAND_LAKE", "COASTAL_AREA"],
        "data": "NRC LocalMaps/OpenData/download services.",
        "tier": 1,
    },
}

def source_plan(area_type: str):
    plan = []
    if area_type in {"FOREST", "RESERVE_SANCTUARY"}:
        plan.append("DOC_PCL")
    if area_type in {"ISLAND", "HARBOUR_BAY", "COASTAL_AREA", "PENINSULA"}:
        plan.extend(["LINZ_NZGB", "LINZ_COAST"])
    if area_type in {"WETLAND_LAKE"}:
        plan.extend(["LINZ_NZGB", "NRC_GIS"])
    if area_type in {"CATCHMENT"}:
        plan.append("NRC_GIS")
    if area_type in {"PLACE_REVIEW", "NAMED_PLACE"}:
        plan.append("LINZ_NZGB")
    if not plan:
        plan.extend(["LINZ_NZGB", "NRC_GIS"])
    # stable dedupe
    return list(dict.fromkeys(plan))

def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))
    rows = [
        r for r in data.get("queue", [])
        if r.get("region") == "Northland Region" and r.get("priority") == "A"
    ]

    out_rows = []
    for r in rows:
        corr = CORRECTIONS.get(r["areaId"], {})
        area_type = corr.get("correctedAreaType", r["areaType"])
        action = corr.get("action", "ACQUIRE")
        canonical = corr.get("canonicalTarget", r["name"])
        out_rows.append({
            "areaId": r["areaId"],
            "sourceName": r["name"],
            "participantCount": r.get("participantCount", 0),
            "originalAreaType": r["areaType"],
            "correctedAreaType": area_type,
            "action": action,
            "canonicalTarget": canonical,
            "sourcePlan": source_plan(area_type),
            "geometryStatus": "PENDING",
            "notes": corr.get("notes"),
        })

    out_rows.sort(key=lambda x: (
        0 if x["action"] in {"ACQUIRE", "ACQUIRE_OR_DERIVE"} else 1,
        -x["participantCount"],
        x["sourceName"].casefold(),
    ))

    payload = {
        "schema": "EXG-LM-NORTHLAND-PRIORITY-A-GEOMETRY-ACQUISITION-001",
        "source": str(SRC.relative_to(ROOT)),
        "status": "STAGED",
        "policy": {
            "semantic_type_checked_before_geometry": True,
            "authoritative_sources_only_for_boundary_attachment": True,
            "no_boundary_invention": True,
            "aliases_deduped_before_geometry": True,
            "compound_areas_not_given_single_boundary_without_review": True,
        },
        "sourceTiers": SOURCE_TIERS,
        "count": len(out_rows),
        "queue": out_rows,
    }

    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("EX GAMES LIVING MAP — NORTHLAND PRIORITY A ACQUISITION QUEUE")
    print("=" * 76)
    print(f"Input records: {len(rows)}")
    print()
    for row in out_rows:
        print(
            f"{row['sourceName'][:38]:38} | "
            f"{row['correctedAreaType'][:22]:22} | "
            f"{row['action']}"
        )
    print()
    print(f"Output: {OUT.relative_to(ROOT)}")
    print("No Area source files were modified.")
    print("No geometry was invented or attached.")
    print("Nothing was copied to public/data or registered in the LM.")

if __name__ == "__main__":
    main()
