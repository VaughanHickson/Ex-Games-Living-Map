import { nzRegions } from './regions.ts'
import type { FeatureCollection, Point, LineString, Polygon, MultiPolygon, Position } from 'geojson'

/** Existing Area Model 002 fields; participantIds is the authoritative relationship. */
export interface Area {
  id: string
  name: string
  areaType: string
  region: string
  boundaryStatus: 'AUTHORITATIVE' | 'DERIVED' | 'REPRESENTATIVE' | 'UNRESOLVED'
  geometryStatus: 'ATTACHED' | 'NOT_ATTACHED'
  sourceTerms: string[]
  participantIds: string[]
  geometry?: Point | LineString | Polygon | MultiPolygon
  sources?: string[]
  description?: string
  [key: string]: unknown
}

export interface AreaDataset {
  areaModel: 'EXG-LM-AREA-MODEL-002'
  areas: Area[]
  /** Existing staging export only: validated as a derived mirror, never authoritative. */
  participantAreaLinks?: Record<string, string[]>
}

function validPosition(p: Position) {
  return Array.isArray(p) && p.length >= 2 && p.every(Number.isFinite)
    && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90
}
function validLine(line: Position[]) {
  return Array.isArray(line) && line.length >= 2 && line.every(validPosition)
}
function validPolygon(rings: Position[][]) {
  return Array.isArray(rings) && rings.length > 0 && rings.every(ring =>
    validLine(ring) && ring.length >= 4 && JSON.stringify(ring[0]) === JSON.stringify(ring.at(-1)))
}
export function validAreaGeometry(g: Area['geometry']) {
  if (!g) return false
  switch (g.type) {
    case 'Point': return validPosition(g.coordinates)
    case 'LineString': return validLine(g.coordinates)
    case 'Polygon': return validPolygon(g.coordinates)
    case 'MultiPolygon': return Array.isArray(g.coordinates) && g.coordinates.length > 0 && g.coordinates.every(validPolygon)
    default: return false
  }
}

export function buildAreaIndex(dataset: AreaDataset, participants: readonly { id: string }[]) {
  if (dataset.areaModel !== 'EXG-LM-AREA-MODEL-002' || !Array.isArray(dataset.areas)) {
    throw new Error('Invalid Area Model 002 dataset')
  }
  const participantIds = new Set(participants.map(p => p.id))
  const areasById = new Map<string, Area>()
  const participantAreaLinks = new Map<string, string[]>()
  const warnings: string[] = []
  for (const input of dataset.areas) {
    if (!input || !['id','name','areaType','region'].every(key => typeof input[key] === 'string' && (input[key] as string).trim())
      || !Array.isArray(input.sourceTerms) || !input.sourceTerms.every(x => typeof x === 'string')
      || !Array.isArray(input.participantIds) || !input.participantIds.every(id => typeof id === 'string' && id.length > 0)
      || (input.sources !== undefined && (!Array.isArray(input.sources) || !input.sources.every(s => typeof s === 'string')))
      || (input.description !== undefined && typeof input.description !== 'string')) throw new Error('Invalid Area record')
    if (!nzRegions.some(([, region]) => region === input.region)) throw new Error(`Unknown Area region: ${input.id}`)
    if (areasById.has(input.id)) throw new Error(`Duplicate Area ID: ${input.id}`)
    if (!['AUTHORITATIVE','DERIVED','REPRESENTATIVE','UNRESOLVED'].includes(input.boundaryStatus)
      || !['ATTACHED','NOT_ATTACHED'].includes(input.geometryStatus)) throw new Error(`Invalid geography status: ${input.id}`)
    if (input.geometry ? (!validAreaGeometry(input.geometry) || input.geometryStatus !== 'ATTACHED' || input.boundaryStatus === 'UNRESOLVED')
      : input.geometryStatus !== 'NOT_ATTACHED') throw new Error(`Invalid geometry/status: ${input.id}`)
    const ids = [...new Set(input.participantIds)]
    if (ids.length !== input.participantIds.length) warnings.push(`Duplicate participant relationship deduplicated: ${input.id}`)
    for (const pid of ids) {
      if (!participantIds.has(pid)) throw new Error(`Unknown participant ID ${pid} in Area ${input.id}`)
      participantAreaLinks.set(pid, [...(participantAreaLinks.get(pid) ?? []), input.id])
    }
    areasById.set(input.id, { ...input, participantIds: ids })
  }
  if (dataset.participantAreaLinks) {
    for (const [pid, ids] of Object.entries(dataset.participantAreaLinks)) {
      if (!participantIds.has(pid) || !Array.isArray(ids)) throw new Error(`Invalid participantAreaLinks: ${pid}`)
      if (new Set(ids).size !== ids.length) warnings.push(`Duplicate Area relationship deduplicated: ${pid}`)
      for (const id of ids) if (!areasById.has(id)) throw new Error(`Unknown Area ID ${id} for ${pid}`)
      const expected = [...(participantAreaLinks.get(pid) ?? [])].sort()
      if (JSON.stringify([...new Set(ids)].sort()) !== JSON.stringify(expected)) throw new Error(`Conflicting participantAreaLinks: ${pid}`)
    }
    for (const pid of participantAreaLinks.keys()) if (!Object.hasOwn(dataset.participantAreaLinks, pid)) {
      throw new Error(`Missing derived participantAreaLinks: ${pid}`)
    }
  }
  return {
    areasById: areasById as ReadonlyMap<string, Area>,
    participantAreaLinks: participantAreaLinks as ReadonlyMap<string, readonly string[]>, warnings,
    areasForParticipant: (id: string) => (participantAreaLinks.get(id) ?? []).map(aid => areasById.get(aid)!),
    participantIdsForArea: (id: string) => areasById.get(id)?.participantIds ?? [],
  }
}
export type AreaIndex = ReturnType<typeof buildAreaIndex>

/** Feature identity belongs to the Area; no centroids or participant copies. */
export function areaFeatures(index: AreaIndex, region?: string): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [...index.areasById.values()].filter(a => a.geometry && (!region || a.region === region)).map(a => ({
      type: 'Feature', id: a.id, geometry: a.geometry!,
      properties: { areaId: a.id, name: a.name, region: a.region, areaType: a.areaType,
        boundaryStatus: a.boundaryStatus, geometryStatus: a.geometryStatus },
    })),
  }
}
