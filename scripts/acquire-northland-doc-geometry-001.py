#!/usr/bin/env python3
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTDIR = ROOT / "data" / "geography" / "staged" / "northland-doc-geometry-001"
MANIFEST = OUTDIR / "manifest.json"

DOC_LAYER = (
    "https://services1.arcgis.com/3JjYDyG3oajxU6HO/arcgis/rest/services/"
    "DOC_Public_Conservation_Land/FeatureServer/0/query"
)

# Deliberately broad source-name searches. The script stages candidates only.
TARGETS = [
    {
        "areaId": "area-northland-paihia-opua-forest",
        "sourceName": "Paihia / Ōpua Forest",
        "queries": ["Opua", "Paihia"],
    },
    {
        "areaId": "area-northland-houto-forests",
        "sourceName": "Houto forests",
        "queries": ["Houto"],
    },
    {
        "areaId": "area-northland-kerikeri-puketi-forest",
        "sourceName": "Kerikeri / Puketi Forest",
        "queries": ["Puketi", "Kerikeri"],
    },
    {
        "areaId": "area-northland-puketi-forest",
        "sourceName": "Puketi Forest",
        "queries": ["Puketi"],
    },
    {
        "areaId": "area-northland-opua-forest-bay-of-islands",
        "sourceName": "Ōpua Forest, Bay of Islands",
        "queries": ["Opua"],
    },
    {
        "areaId": "area-northland-takou-bay-river-scenic-reserve",
        "sourceName": "Takou Bay River Scenic Reserve",
        "queries": ["Takou"],
    },
]

def fetch_geojson(term: str) -> dict:
    # Escape apostrophes for SQL-style ArcGIS where clause.
    sql_term = term.replace("'", "''")
    params = {
        "where": f"Name LIKE '%{sql_term}%'",
        "outFields": (
            "OBJECTID,NaPALIS_ID,Name,Type,Legislation,Section,"
            "Conservation_Unit_Number,Recorded_Area"
        ),
        "returnGeometry": "true",
        "outSR": "4326",
        "f": "geojson",
    }
    url = DOC_LAYER + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Ex-Games-Living-Map/1.0 geography-acquisition"},
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.load(response)

def dedupe_features(features: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for feature in features:
        props = feature.get("properties") or {}
        oid = props.get("OBJECTID")
        key = ("OBJECTID", oid) if oid is not None else (
            props.get("Name"),
            props.get("Conservation_Unit_Number"),
            props.get("Recorded_Area"),
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(feature)
    return out

def safe_name(value: str) -> str:
    return "".join(c.lower() if c.isalnum() else "-" for c in value).strip("-")

def main():
    OUTDIR.mkdir(parents=True, exist_ok=True)

    manifest = {
        "schema": "EXG-LM-NORTHLAND-DOC-GEOMETRY-ACQUISITION-001",
        "authority": "Department of Conservation Te Papa Atawhai",
        "sourceLayer": (
            "DOC Public Conservation Land FeatureServer/0"
        ),
        "sourceUrl": (
            "https://services1.arcgis.com/3JjYDyG3oajxU6HO/arcgis/rest/services/"
            "DOC_Public_Conservation_Land/FeatureServer/0"
        ),
        "status": "CANDIDATE_GEOMETRY_ONLY",
        "policy": {
            "authoritative_source": True,
            "automatic_attachment": False,
            "ambiguous_matches_require_review": True,
            "source_geometry_unmodified": True,
        },
        "targets": [],
    }

    print("EX GAMES LIVING MAP — NORTHLAND DOC GEOMETRY ACQUISITION 001")
    print("=" * 78)

    for target in TARGETS:
        all_features = []
        query_results = []

        for term in target["queries"]:
            try:
                data = fetch_geojson(term)
                features = data.get("features", [])
                all_features.extend(features)
                query_results.append({
                    "term": term,
                    "featureCount": len(features),
                    "error": None,
                })
            except Exception as exc:
                query_results.append({
                    "term": term,
                    "featureCount": 0,
                    "error": f"{type(exc).__name__}: {exc}",
                })

        features = dedupe_features(all_features)

        collection = {
            "type": "FeatureCollection",
            "features": features,
        }
        filename = safe_name(target["areaId"]) + "-candidates.geojson"
        path = OUTDIR / filename
        path.write_text(
            json.dumps(collection, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

        matches = []
        for feature in features:
            p = feature.get("properties") or {}
            matches.append({
                "OBJECTID": p.get("OBJECTID"),
                "Name": p.get("Name"),
                "Type": p.get("Type"),
                "Section": p.get("Section"),
                "Conservation_Unit_Number": p.get("Conservation_Unit_Number"),
                "Recorded_Area": p.get("Recorded_Area"),
            })

        manifest["targets"].append({
            "areaId": target["areaId"],
            "sourceName": target["sourceName"],
            "queries": query_results,
            "candidateFeatureCount": len(features),
            "candidateFile": str(path.relative_to(ROOT)),
            "matches": matches,
            "attachmentDecision": "PENDING_REVIEW",
        })

        print()
        print(f"{target['sourceName']}")
        print(f"  candidate features: {len(features)}")
        for q in query_results:
            if q["error"]:
                print(f"  query {q['term']!r}: ERROR {q['error']}")
            else:
                print(f"  query {q['term']!r}: {q['featureCount']} feature(s)")
        for m in matches[:20]:
            print(
                f"    - {m['Name']} | {m['Section']} | "
                f"{m['Recorded_Area']} ha | unit={m['Conservation_Unit_Number']}"
            )
        if len(matches) > 20:
            print(f"    ... +{len(matches)-20} more")

    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print()
    print("=" * 78)
    print(f"Manifest: {MANIFEST.relative_to(ROOT)}")
    print(f"Candidate GeoJSON directory: {OUTDIR.relative_to(ROOT)}")
    print("No candidate geometry was attached to an Ex Games Area.")
    print("Nothing was copied to public/data or registered in the LM.")

if __name__ == "__main__":
    main()
