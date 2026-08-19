#!/usr/bin/env python3
from __future__ import annotations

import json
import urllib.parse
import urllib.request

LAYER = (
    "https://services1.arcgis.com/3JjYDyG3oajxU6HO/arcgis/rest/services/"
    "DOC_Public_Conservation_Land/FeatureServer/0/query"
)

TERMS = [
    "Ōmahuta-Puketī",
    "Ōmahuta",
    "Omahuta",
    "Puketī",
    "Puketi",
    "Forest Conservation Park",
]

def query(term: str):
    sql = term.replace("'", "''")
    params = {
        "where": f"Name LIKE '%{sql}%'",
        "outFields": (
            "OBJECTID,NaPALIS_ID,Name,Type,Legislation,Section,"
            "Conservation_Unit_Number,Recorded_Area"
        ),
        "returnGeometry": "false",
        "f": "json",
    }
    url = LAYER + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Ex-Games-Living-Map/1.0 geography-probe"},
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.load(response)

print("DOC PUBLIC CONSERVATION LAND — PUKETĪ/ŌMAHUTA CURRENT-NAME PROBE")
print("=" * 78)

seen = set()
for term in TERMS:
    print(f"\nQUERY: {term!r}")
    try:
        data = query(term)
    except Exception as exc:
        print(f"  ERROR: {type(exc).__name__}: {exc}")
        continue

    features = data.get("features", [])
    print(f"  results: {len(features)}")
    for feature in features:
        p = feature.get("attributes") or feature.get("properties") or {}
        oid = p.get("OBJECTID")
        marker = oid if oid is not None else (
            p.get("Name"), p.get("Conservation_Unit_Number")
        )
        duplicate = marker in seen
        seen.add(marker)
        print(
            f"  {'(repeat) ' if duplicate else ''}"
            f"{p.get('Name')} | {p.get('Section')} | "
            f"{p.get('Recorded_Area')} ha | "
            f"unit={p.get('Conservation_Unit_Number')} | "
            f"OBJECTID={oid}"
        )

print("\nNo files modified.")
