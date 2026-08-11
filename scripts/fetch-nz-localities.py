import json, urllib.parse, urllib.request
base="https://services.arcgis.com/xdsHIIxuCWByZiCB/ArcGIS/rest/services/LINZ_NZ_Suburbs_and_Localities/FeatureServer/0/query"
features=[]
for offset in range(0,20000,2000):
    q={"where":"type IN ('Suburb','Locality')","outFields":"id,name,major_name,territorial_authority","returnGeometry":"true","outSR":"4326","f":"geojson","resultOffset":str(offset),"resultRecordCount":"2000","maxAllowableOffset":"0.0001","geometryPrecision":"5"}
    url=base+"?"+urllib.parse.urlencode(q)
    with urllib.request.urlopen(url) as r:
        page=json.load(r)
    batch=page.get("features",[])
    features.extend(batch)
    print(offset, len(batch), "total", len(features))
    if len(batch)<2000: break
out={"type":"FeatureCollection","features":features}
open("public/data/nz-suburbs-localities.geojson","w").write(json.dumps(out))
