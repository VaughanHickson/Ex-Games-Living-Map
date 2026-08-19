#!/usr/bin/env python3
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path

from shapely.geometry import shape, mapping
from shapely.ops import unary_union
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
OUTDIR = ROOT / "data" / "geography" / "staged"
OUT = OUTDIR / "northland-authoritative-areas-001.geojson"
MANIFEST = OUTDIR / "northland-authoritative-areas-001-manifest.json"

DOC_LAYER = (
    "https://services1.arcgis.com/3JjYDyG3oajxU6HO/arcgis/rest/services/"
    "DOC_Public_Conservation_Land/FeatureServer/0/query"
)

# DOC's official Puketi/Omahuta hunting page explicitly says the hunting complex
# encompasses these named legal conservation units.
PUKETI_OMAHUTA_COMPONENT_TERMS = [
    "Omahuta Forest",
    "Omahuta Forest Addition",
    "Omahuta Forest Addition No 1",
    "Omahuta Forest Scenic Reserve No 2",
    "Puketi Forest",
    "Puketi Scenic Reserve",
    "Puketi Forest Addition",
    "Puketi Forest Addition No 2",
    "Aratoro Conservation Area",
    "Ahutoatoa Conservation Area",
    "Manginangina Scenic Reserve",
]

def fetch_like(term: str) -> list[dict]:
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
        return json.load(response).get("features", [])

def exact_name_matches(term: str) -> list[dict]:
    target = term.casefold().strip()
    rows = fetch_like(term)
    return [
        f for f in rows
        if str((f.get("properties") or {}).get("Name", "")).casefold().strip() == target
    ]

def valid_polygon(feature: dict):
    geom = shape(feature["geometry"])
    if not geom.is_valid:
        geom = make_valid(geom)
    return geom

def feature_properties(feature: dict) -> dict:
    p = feature.get("properties") or {}
    return {
        "OBJECTID": p.get("OBJECTID"),
        "Name": p.get("Name"),
        "Type": p.get("Type"),
        "Section": p.get("Section"),
        "Conservation_Unit_Number": p.get("Conservation_Unit_Number"),
        "Recorded_Area": p.get("Recorded_Area"),
    }

def main():
    OUTDIR.mkdir(parents=True, exist_ok=True)
    output_features = []
    manifest = {
        "schema": "EXG-LM-NORTHLAND-AUTHORITATIVE-AREAS-001",
        "authority": "Department of Conservation Te Papa Atawhai",
        "sourceLayer": "DOC Public Conservation Land FeatureServer/0",
        "status": "STAGED",
        "policy": {
            "authoritative_geometry_only": True,
            "derived_geometry_only_from_doc_explicit_component_list": True,
            "no_boundary_invention": True,
            "nothing_registered_publicly": True,
        },
        "areas": [],
    }

    # 1. Takou River Scenic Reserve — exact source polygon.
    takou = exact_name_matches("Takou River Scenic Reserve")
    if len(takou) != 1:
        raise SystemExit(
            f"Takou River Scenic Reserve expected exactly 1 DOC match, found {len(takou)}"
        )

    tf = takou[0]
    output_features.append({
        "type": "Feature",
        "id": "area-northland-takou-bay-river-scenic-reserve",
        "properties": {
            "areaId": "area-northland-takou-bay-river-scenic-reserve",
            "name": "Takou River Scenic Reserve",
            "areaType": "RESERVE_SANCTUARY",
            "region": "Northland Region",
            "boundaryStatus": "AUTHORITATIVE",
            "geometryStatus": "ATTACHED",
            "authority": "Department of Conservation Te Papa Atawhai",
            "sourceName": (tf.get("properties") or {}).get("Name"),
            "sourceUnit": (tf.get("properties") or {}).get("Conservation_Unit_Number"),
        },
        "geometry": tf["geometry"],
    })
    manifest["areas"].append({
        "areaId": "area-northland-takou-bay-river-scenic-reserve",
        "decision": "ATTACHED_AUTHORITATIVE",
        "sourceFeatures": [feature_properties(tf)],
    })

    # 2. Puketī/Ōmahuta Forests — derive a single LM landscape geometry from the
    # DOC-published list of component conservation units.
    component_features = []
    component_report = []
    missing = []
    ambiguous = []

    for term in PUKETI_OMAHUTA_COMPONENT_TERMS:
        matches = exact_name_matches(term)
        component_report.append({
            "requestedName": term,
            "exactMatchCount": len(matches),
            "matches": [feature_properties(f) for f in matches],
        })
        if len(matches) == 1:
            component_features.append(matches[0])
        elif len(matches) == 0:
            missing.append(term)
        else:
            ambiguous.append(term)

    # Do not derive an incomplete forest boundary silently.
    if missing or ambiguous:
        manifest["areas"].append({
            "areaId": "area-northland-puketi-omahuta-forests",
            "decision": "PENDING_COMPONENT_RECONCILIATION",
            "missingNames": missing,
            "ambiguousNames": ambiguous,
            "componentReport": component_report,
        })
        print("Puketī/Ōmahuta Forests not built because component reconciliation is incomplete.")
        if missing:
            print("Missing exact DOC names:")
            for name in missing:
                print(f"  - {name}")
        if ambiguous:
            print("Ambiguous exact DOC names:")
            for name in ambiguous:
                print(f"  - {name}")
    else:
        geoms = [valid_polygon(f) for f in component_features]
        merged = unary_union(geoms)
        if not merged.is_valid:
            merged = make_valid(merged)

        output_features.append({
            "type": "Feature",
            "id": "area-northland-puketi-omahuta-forests",
            "properties": {
                "areaId": "area-northland-puketi-omahuta-forests",
                "name": "Puketī and Ōmahuta Forests",
                "areaType": "FOREST",
                "region": "Northland Region",
                "boundaryStatus": "DERIVED",
                "geometryStatus": "ATTACHED",
                "authority": "Department of Conservation Te Papa Atawhai",
                "derivation": "Union of DOC public conservation land units explicitly listed by DOC as comprising the Puketi/Omahuta Forest hunting complex.",
                "componentCount": len(component_features),
            },
            "geometry": mapping(merged),
        })
        manifest["areas"].append({
            "areaId": "area-northland-puketi-omahuta-forests",
            "decision": "ATTACHED_DERIVED",
            "componentCount": len(component_features),
            "componentReport": component_report,
        })

    collection = {
        "type": "FeatureCollection",
        "features": output_features,
    }
    OUT.write_text(json.dumps(collection, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print()
    print("EX GAMES LIVING MAP — NORTHLAND AUTHORITATIVE GEOMETRY 001")
    print("=" * 78)
    print(f"GeoJSON features staged: {len(output_features)}")
    for f in output_features:
        p = f["properties"]
        print(f"  {p['name']} | {p['boundaryStatus']} | {p['geometryStatus']}")
    print()
    print(f"GeoJSON:  {OUT.relative_to(ROOT)}")
    print(f"Manifest: {MANIFEST.relative_to(ROOT)}")
    print("Nothing was copied to public/data or registered in the LM.")

if __name__ == "__main__":
    main()
