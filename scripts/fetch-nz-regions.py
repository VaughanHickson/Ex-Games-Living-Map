import json, urllib.parse, urllib.request
base="https://services2.arcgis.com/vKb0s8tBIA3bdocZ/arcgis/rest/services/Regional_Council_2025/FeatureServer/0/query"
q={
 "where":"REGC2025_V1_00 <> '99'",
 "outFields":"REGC2025_V1_00,REGC2025_V1_00_NAME",
 "returnGeometry":"true","outSR":"4326","f":"geojson",
 "maxAllowableOffset":"0.001","geometryPrecision":"4"
}
url=base+"?"+urllib.parse.urlencode(q)
with urllib.request.urlopen(url) as r:
    data=json.load(r)
open("public/data/nz-regions.geojson","w").write(json.dumps(data))
print("regions:",len(data["features"]))
for f in data["features"]:
    print(f["properties"]["REGC2025_V1_00_NAME"])
