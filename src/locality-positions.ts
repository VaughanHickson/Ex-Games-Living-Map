import type { LocalityDisplayFeature } from './discoveryPrototype'

export const normaliseRegion = (value: string) => value.replace(/ Region$/, '').normalize('NFC')
export const sameRegion = (left: string, right: string) => normaliseRegion(left) === normaliseRegion(right)
const normaliseLocality = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
export const localityKey = (region: string, name: string) => `${normaliseRegion(region)}:${normaliseLocality(name)}`
type Bounds = [number, number, number, number]
const midpoint = ([west, south, east, north]: Bounds): [number, number] => [(west + east) / 2, (south + north) / 2]

/** Representative browsing positions, never a participant's address or work site. */
export function buildLocalityPositions(localities: readonly LocalityDisplayFeature[]) {
  const exact = new Map<string, [number, number]>()
  const majorPlaces = new Map<string, Bounds>()
  for (const feature of localities) {
    const { name, major_name: major, region } = feature.properties ?? {}
    if (!name || !region) continue
    const rings = feature.geometry.type === 'Polygon' ? feature.geometry.coordinates : feature.geometry.coordinates.flat()
    const points = rings.flat().filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))
    if (!points.length) continue
    const bounds: Bounds = [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))]
    exact.set(localityKey(region, name), midpoint(bounds))
    if (major) {
      const key = localityKey(region, major), previous = majorPlaces.get(key)
      majorPlaces.set(key, previous ? [Math.min(previous[0], bounds[0]), Math.min(previous[1], bounds[1]), Math.max(previous[2], bounds[2]), Math.max(previous[3], bounds[3])] : bounds)
    }
  }
  // A city-level record can use the combined extent of its named suburbs.
  // Exact localities retain their established positions and take precedence.
  for (const [key, bounds] of majorPlaces) if (!exact.has(key)) exact.set(key, midpoint(bounds))
  return exact
}
