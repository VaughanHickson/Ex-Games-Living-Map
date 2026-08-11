import json
from shapely.geometry import shape

lp="public/data/nz-suburbs-localities.geojson"
rp="public/data/nz-regions.geojson"
localities=json.load(open(lp))
regions=json.load(open(rp))

rg=[(f["properties"]["REGC2025_V1_00_NAME"],shape(f["geometry"]))
    for f in regions["features"]]

unmatched=[]
for f in localities["features"]:
    geom=shape(f["geometry"])
    point=geom.representative_point()
    hits=[name for name,g in rg if g.covers(point)]
    if not hits:
        areas=[(geom.intersection(g).area,name) for name,g in rg]
        hits=[max(areas)[1]] if max(areas)[0] > 0 else []
    if hits: f["properties"]["region"]=hits[0]
    else: unmatched.append(f["properties"].get("name"))

open(lp,"w").write(json.dumps(localities))
print("assigned:",len(localities["features"])-len(unmatched))
print("unmatched:",len(unmatched),unmatched[:20])
