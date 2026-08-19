#!/usr/bin/env python3
from __future__ import annotations
import json, urllib.parse, urllib.request
from pathlib import Path
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
from shapely.validation import make_valid

ROOT=Path(__file__).resolve().parents[1]
OUTDIR=ROOT/"data"/"geography"/"staged"
OUT=OUTDIR/"northland-puketi-omahuta-authoritative-002.geojson"
MANIFEST=OUTDIR/"northland-puketi-omahuta-authoritative-002-manifest.json"
LAYER="https://services1.arcgis.com/3JjYDyG3oajxU6HO/arcgis/rest/services/DOC_Public_Conservation_Land/FeatureServer/0/query"

# Exact current DOC conservation-unit IDs established by the macron-aware probe.
# These four polygons are the two principal Northland Conservation Park forest
# blocks plus their large named additions. Smaller legacy units are deliberately
# not silently included.
UNITS={
 "O05004":"Ōmahuta Forest (Pt Northland Conservation Park)",
 "P05069":"Ōmahuta Forest (Addition) Conservation Area",
 "P05001":"Puketī Forest (Pt Northland Conservation Park)",
 "P05070":"Puketī Forest (Addition No 2) Conservation Area",
}

def fetch_unit(unit):
    params={
      "where":f"Conservation_Unit_Number='{unit}'",
      "outFields":"OBJECTID,NaPALIS_ID,Name,Type,Legislation,Section,Conservation_Unit_Number,Recorded_Area",
      "returnGeometry":"true","outSR":"4326","f":"geojson"
    }
    req=urllib.request.Request(LAYER+"?"+urllib.parse.urlencode(params),
      headers={"User-Agent":"Ex-Games-Living-Map/1.0 geography-acquisition"})
    with urllib.request.urlopen(req,timeout=60) as r:
        return json.load(r).get("features",[])

def main():
    feats=[]; report=[]; failed=[]
    for unit, expected in UNITS.items():
        rows=fetch_unit(unit)
        if len(rows)!=1:
            failed.append(f"{unit}: expected 1 feature, got {len(rows)}")
            continue
        f=rows[0]; props=f.get("properties",{})
        if props.get("Name") != expected:
            failed.append(f"{unit}: name mismatch {props.get('Name')!r} != {expected!r}")
            continue
        feats.append(f)
        report.append({k:props.get(k) for k in
          ["OBJECTID","Name","Section","Conservation_Unit_Number","Recorded_Area"]})

    if failed:
        raise SystemExit("Source verification failed:\n  "+"\n  ".join(failed))

    geoms=[]
    for f in feats:
        g=shape(f["geometry"])
        if not g.is_valid: g=make_valid(g)
        geoms.append(g)
    merged=unary_union(geoms)
    if not merged.is_valid: merged=make_valid(merged)

    recorded=sum(float((f.get("properties") or {}).get("Recorded_Area") or 0) for f in feats)

    feature={
      "type":"Feature",
      "id":"area-northland-puketi-omahuta-core",
      "properties":{
        "areaId":"area-northland-puketi-omahuta-core",
        "name":"Puketī–Ōmahuta Forest core conservation land",
        "areaType":"FOREST",
        "region":"Northland Region",
        "boundaryStatus":"DERIVED_AUTHORITATIVE_COMPONENTS",
        "geometryStatus":"STAGED",
        "authority":"Department of Conservation Te Papa Atawhai",
        "componentCount":len(feats),
        "recordedComponentAreaHa":round(recorded,1),
        "scopeNote":"Union of four verified current DOC units only; not asserted to equal the full historic Puketī/Ōmahuta hunting complex."
      },
      "geometry":mapping(merged)
    }
    OUT.write_text(json.dumps({"type":"FeatureCollection","features":[feature]},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    MANIFEST.write_text(json.dumps({
      "schema":"EXG-LM-NORTHLAND-PUKETI-OMAHUTA-002",
      "status":"STAGED_VERIFIED_COMPONENT_UNION",
      "sourceLayer":"DOC Public Conservation Land FeatureServer/0",
      "components":report,
      "recordedComponentAreaHa":round(recorded,1),
      "policy":{"no_boundary_invention":True,"legacy_unresolved_units_excluded":True},
      "output":str(OUT.relative_to(ROOT))
    },ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

    print("EX GAMES LIVING MAP — PUKETĪ/ŌMAHUTA VERIFIED CORE 002")
    print("="*76)
    for r in report:
        print(f"{r['Conservation_Unit_Number']} | {r['Name']} | {r['Recorded_Area']} ha")
    print(f"\nVerified component total: {recorded:.1f} ha")
    print(f"GeoJSON:  {OUT.relative_to(ROOT)}")
    print(f"Manifest: {MANIFEST.relative_to(ROOT)}")
    print("Legacy unresolved units were not included.")
    print("Nothing was copied to public/data or registered in the LM.")

if __name__=="__main__":
    main()
