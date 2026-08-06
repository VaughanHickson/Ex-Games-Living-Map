const aucklandExtent = '174.25,-37.35,175.55,-35.85'

const queryParameters = new URLSearchParams({
  where:
  "type IN ('Suburb','Locality')",
  geometry: aucklandExtent,
  geometryType: 'esriGeometryEnvelope',
  inSR: '4326',
  spatialRel: 'esriSpatialRelIntersects',
  outFields: 'id,name,major_name,territorial_authority',
  returnGeometry: 'true',
  outSR: '4326',
  f: 'geojson',
})

export const aucklandLocalitiesUrl =
  'https://services.arcgis.com/xdsHIIxuCWByZiCB/ArcGIS/rest/services/' +
  'LINZ_NZ_Suburbs_and_Localities/FeatureServer/0/query?' +
  queryParameters.toString()
