import type { Map as MapLibreMap } from 'maplibre-gl'
import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson'
import { applyNationalArrivalBounds } from './discoveryPrototype'

export type RegionBounds = [[number, number], [number, number]]

/** Derive camera extents from the existing canonical region geometry. */
export function buildRegionBounds(data: FeatureCollection<Polygon | MultiPolygon>) {
  const regions = new Map<string, RegionBounds>()
  for (const feature of data.features) {
    const name = feature.properties?.REGC2025_V1_00_NAME
    if (typeof name !== 'string') continue
    const polygons = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates] : feature.geometry.coordinates
    const bounds: RegionBounds = regions.get(name) ?? [[Infinity, Infinity], [-Infinity, -Infinity]]
    for (const polygon of polygons) for (const ring of polygon) for (const [lng, lat] of ring) {
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue
      bounds[0][0] = Math.min(bounds[0][0], lng)
      bounds[0][1] = Math.min(bounds[0][1], lat)
      bounds[1][0] = Math.max(bounds[1][0], lng)
      bounds[1][1] = Math.max(bounds[1][1], lat)
    }
    if (bounds.flat().every(Number.isFinite)) regions.set(name, bounds)
  }
  return regions
}

export function fitSelectedRegion(map: MapLibreMap, region: string, regions: ReadonlyMap<string, RegionBounds>) {
  if (!region) {
    applyNationalArrivalBounds(map)
    return
  }
  const bounds = regions.get(region)
  if (!bounds) return
  const mobile = map.getContainer().clientWidth < 640
  map.fitBounds(bounds, {
    padding: mobile
      ? { top: 120, right: 28, bottom: 36, left: 28 }
      : { top: 96, right: 60, bottom: 48, left: 60 },
    bearing: 0,
    pitch: 0,
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700,
  })
}
