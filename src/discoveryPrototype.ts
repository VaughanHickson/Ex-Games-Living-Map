import type { Map as MapLibreMap } from 'maplibre-gl'
import type { AreaIndex } from './area-model'
import type { LocatedParticipant } from './participant-model'
import { exGamesPalette } from './brand'

export type DiscoveryRecord = {
  id: string
  kind: 'participant' | 'area'
  name: string
  region: string
  lng: number
  lat: number
}

export type ActiveDiscoverySignal = {
  record: DiscoveryRecord
}

type SlotFade = {
  signalId: string
  phase: 'out' | 'in'
  startedAt: number
}

export type DiscoveryHeartbeatState = {
  activeSignals: ActiveDiscoverySignal[]
  regionCursors: Record<string, number>
  regionLastSelected: Record<string, number>
  lastRecordIds: Record<string, string | undefined>
  replacementIndex: number
  targetCount: number
}

export const DISCOVERY_ROTATION_INTERVAL_MS = 3000
export const DISCOVERY_PULSE_PERIOD_MS = 4200
export const DISCOVERY_SLOT_FADE_DURATION_MS = 1000
export const DISCOVERY_TARGET_CONCURRENCY = 5
export const DISCOVERY_DESKTOP_TARGET_CONCURRENCY = DISCOVERY_TARGET_CONCURRENCY
export const DISCOVERY_MOBILE_TARGET_CONCURRENCY = 3

type LocalityPolygonGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }

export type LocalityDisplayFeature = {
  properties?: { id?: number | string; name?: string; major_name?: string; region?: string }
  geometry: LocalityPolygonGeometry
}

export const getDiscoverySignalCount = (viewportWidth: number): number => (
  viewportWidth < 768 ? DISCOVERY_MOBILE_TARGET_CONCURRENCY : DISCOVERY_DESKTOP_TARGET_CONCURRENCY
)

export const NZ_ARRIVAL_BOUNDS = [
  [166, -47.8],
  [179.5, -34.2],
] as const

export const NZ_ARRIVAL_CENTER = [174.0, -41.3] as const

export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const normaliseRegion = (region: string): string => {
  const aliases: Record<string, string> = {
    'Auckland Region': 'Auckland',
    Northland: 'Northland Region',
    Waikato: 'Waikato Region',
    'Bay of Plenty': 'Bay of Plenty Region',
    Gisborne: 'Gisborne Region',
    Taranaki: 'Taranaki Region',
    Wellington: 'Wellington Region',
    Tasman: 'Tasman Region',
    Nelson: 'Nelson Region',
    Marlborough: 'Marlborough Region',
    'West Coast': 'West Coast Region',
    Canterbury: 'Canterbury Region',
    Otago: 'Otago Region',
    Southland: 'Southland Region',
  }
  return aliases[region] ?? region
}

const northIslandRegions = new Set([
  'Northland Region', 'Auckland', 'Waikato Region', 'Bay of Plenty Region',
  'Gisborne Region', "Hawke's Bay Region", 'Taranaki Region',
  'Manawatū-Whanganui Region', 'Wellington Region',
])
const southIslandRegions = new Set([
  'Tasman Region', 'Nelson Region', 'Marlborough Region', 'West Coast Region',
  'Canterbury Region', 'Otago Region', 'Southland Region',
])

export const getDiscoveryIsland = (region: string): 'north' | 'south' | undefined => {
  const normalized = normaliseRegion(region)
  if (northIslandRegions.has(normalized)) return 'north'
  if (southIslandRegions.has(normalized)) return 'south'
  return undefined
}

const hashString = (value: string): number => {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0)
}

const explicitlyMarineParticipant = (participant: LocatedParticipant): boolean => (
  /\bmarine\b|\bocean\b|\boffshore\b|\bestuary\b|\breef\b/i.test(`${participant.name} ${participant.type}`)
)

const explicitlyMarineArea = (area: { name: string; areaType: string }): boolean => (
  /\bmarine\b|\bocean\b|\boffshore\b|\bestuary\b|\breef\b/i.test(`${area.name} ${area.areaType}`)
)

export const applyNationalArrivalBounds = (map: MapLibreMap) => {
  const bounds: [[number, number], [number, number]] = [[166, -47.8], [179.5, -34.2]]
  map.fitBounds(bounds, {
    padding: 24,
    maxZoom: 5.5,
    duration: 0,
  })
}

const pointInRing = (point: [number, number], ring: number[][]): boolean => {
  let inside = false
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
    const [x, y] = ring[current]
    const [previousX, previousY] = ring[previous]
    const crosses = (y > point[1]) !== (previousY > point[1])
      && point[0] < ((previousX - x) * (point[1] - y)) / (previousY - y) + x
    if (crosses) inside = !inside
  }
  return inside
}

const pointInPolygon = (point: [number, number], polygon: number[][][]): boolean => (
  !!polygon.length
  && pointInRing(point, polygon[0])
  && !polygon.slice(1).some((hole) => pointInRing(point, hole))
)

const polygonsForLocality = (feature: LocalityDisplayFeature): number[][][][] => {
  const polygons = feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates
  return polygons
}

const isWithinLocality = (point: [number, number], feature: LocalityDisplayFeature): boolean => (
  polygonsForLocality(feature).some((polygon) => pointInPolygon(point, polygon))
)

const indexLocalitiesByRegion = (localities: readonly LocalityDisplayFeature[]): Map<string, LocalityDisplayFeature[]> => {
  const byRegion = new Map<string, LocalityDisplayFeature[]>()
  const marineLocalityName = /\b(bay|harbour|harbor|inlet|sound|cove|estuary|beach|offshore|island|islet|coast)\b/i
  for (const locality of localities) {
    const region = locality.properties?.region
    if (!region) continue
    if (marineLocalityName.test(locality.properties?.name ?? '')
      || marineLocalityName.test(locality.properties?.major_name ?? '')) continue
    const normalized = normaliseRegion(region)
    const group = byRegion.get(normalized) ?? []
    group.push(locality)
    byRegion.set(normalized, group)
  }
  for (const group of byRegion.values()) {
    group.sort((a, b) => String(a.properties?.id ?? a.properties?.name)
      .localeCompare(String(b.properties?.id ?? b.properties?.name)))
  }
  return byRegion
}

const makeIllustrativeDisplayPosition = (
  region: string,
  seed: string,
  localitiesByRegion: ReadonlyMap<string, LocalityDisplayFeature[]>,
): [number, number] => {
  const resolved = normaliseRegion(region)
  const eligibleLocalities = localitiesByRegion.get(resolved) ?? []
  if (!eligibleLocalities.length) return [Number.NaN, Number.NaN]

  const feature = eligibleLocalities[hashString(seed) % eligibleLocalities.length]
  const polygons = polygonsForLocality(feature)
  const rings = polygons.flat()
  const outerPoints = polygons.flatMap((polygon) => polygon[0])
  const bounds = outerPoints.reduce((extent, [lng, lat]) => ({
    west: Math.min(extent.west, lng),
    east: Math.max(extent.east, lng),
    south: Math.min(extent.south, lat),
    north: Math.max(extent.north, lat),
  }), { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity })
  const average: [number, number] = outerPoints.reduce((sum, [lng, lat]) => [sum[0] + lng, sum[1] + lat], [0, 0])
    .map((value) => value / Math.max(outerPoints.length, 1)) as [number, number]
  if (isWithinLocality(average, feature)) return average

  for (let attempt = 0; attempt < 512; attempt += 1) {
    const hash = hashString(`${seed}:${attempt}`)
    const point: [number, number] = [
      bounds.west + ((hash % 100000) / 100000) * (bounds.east - bounds.west),
      bounds.south + ((hashString(`${seed}:${attempt}:lat`) % 100000) / 100000) * (bounds.north - bounds.south),
    ]
    if (isWithinLocality(point, feature)) return point
  }

  for (const ring of rings) {
    const candidate = ring.reduce((sum, [lng, lat]) => [sum[0] + lng, sum[1] + lat], [0, 0])
      .map((value) => value / Math.max(ring.length, 1)) as [number, number]
    if (isWithinLocality(candidate, feature)) return candidate
  }
  return [Number.NaN, Number.NaN]
}

export const buildDiscoverySignals = (
  participants: readonly LocatedParticipant[],
  areaIndex: AreaIndex,
  localities: readonly LocalityDisplayFeature[] = [],
): DiscoveryRecord[] => {
  const localitiesByRegion = indexLocalitiesByRegion(localities)
  const participantSignals = participants
    .filter((participant) => participant.status === 'located' && !!participant.region
      && normaliseRegion(participant.region) !== 'New Zealand'
      && !explicitlyMarineParticipant(participant))
    .map((participant) => {
      const region = normaliseRegion(participant.region)
      const [lng, lat] = makeIllustrativeDisplayPosition(region, participant.id, localitiesByRegion)
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
      return {
        id: `participant:${participant.id}`,
        kind: 'participant' as const,
        name: participant.name,
        region,
        lng,
        lat,
      }
    })
    .filter((record) => record !== null) as DiscoveryRecord[]

  const areaSignals = [...areaIndex.areasById.values()]
    .filter((area) => !!area.region && !explicitlyMarineArea(area))
    .map((area) => {
      const region = normaliseRegion(area.region)
      const [lng, lat] = makeIllustrativeDisplayPosition(region, area.id, localitiesByRegion)
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
      return {
        id: `area:${area.id}`,
        kind: 'area' as const,
        name: area.name,
        region,
        lng,
        lat,
      } satisfies DiscoveryRecord
    })
    .filter((record) => record !== null) as DiscoveryRecord[]

  const uniq = new globalThis.Map<string, DiscoveryRecord>()
  for (const record of [...participantSignals, ...areaSignals]) {
    if (record && !uniq.has(record.id)) uniq.set(record.id, record)
  }

  return [...uniq.values()].sort((a, b) => b.lat - a.lat || a.lng - b.lng || a.name.localeCompare(b.name))
}

export const sortDiscoverySignalsNorthToSouth = (records: DiscoveryRecord[]): DiscoveryRecord[] => (
  [...records].sort((a, b) => b.lat - a.lat || a.lng - b.lng || a.name.localeCompare(b.name))
)

const deterministicOrder = <T extends { id: string }>(items: T[], seed: string): T[] => (
  [...items].sort((a, b) => hashString(`${seed}:${a.id}`) - hashString(`${seed}:${b.id}`) || a.id.localeCompare(b.id))
)

const recordsByRegion = (records: DiscoveryRecord[]): Record<string, DiscoveryRecord[]> => {
  const groups: Record<string, DiscoveryRecord[]> = {}
  for (const record of records) (groups[record.region] ??= []).push(record)
  for (const region of Object.keys(groups)) groups[region] = deterministicOrder(groups[region], region)
  return groups
}

const chooseRegion = (
  groups: Record<string, DiscoveryRecord[]>,
  state: DiscoveryHeartbeatState,
  excludedRecordIds: Set<string>,
  excludedRegions: Set<string>,
  requiredIsland?: 'north' | 'south',
): string | undefined => {
  const eligibleRegions = Object.keys(groups).filter((region) => (
    (!requiredIsland || getDiscoveryIsland(region) === requiredIsland)
    && groups[region].some((record) => !excludedRecordIds.has(record.id))
  ))
  if (!eligibleRegions.length) return undefined

  const unrepresented = eligibleRegions.filter((region) => !excludedRegions.has(region))
  const candidates = unrepresented.length ? unrepresented : eligibleRegions
  return candidates.sort((a, b) => (
    (state.regionLastSelected[a] ?? -1) - (state.regionLastSelected[b] ?? -1)
    || hashString(`region:${a}`) - hashString(`region:${b}`)
    || a.localeCompare(b)
  ))[0]
}

const missingIsland = (signals: ActiveDiscoverySignal[], eligibleRecords: DiscoveryRecord[]): 'north' | 'south' | undefined => {
  const availableIslands = new Set(eligibleRecords.map((record) => getDiscoveryIsland(record.region)).filter(Boolean))
  const selectedIslands = new Set(signals.map((signal) => getDiscoveryIsland(signal.record.region)).filter(Boolean))
  if (availableIslands.has('north') && availableIslands.has('south')) {
    if (!selectedIslands.has('north')) return 'north'
    if (!selectedIslands.has('south')) return 'south'
  }
  return undefined
}

const chooseRecordInRegion = (
  region: string,
  groups: Record<string, DiscoveryRecord[]>,
  state: DiscoveryHeartbeatState,
  excludedRecordIds: Set<string>,
): DiscoveryRecord | undefined => {
  const candidates = groups[region] ?? []
  if (!candidates.length) return undefined
  const cursor = (state.regionCursors[region] ?? 0) % candidates.length
  const ordered = candidates.map((_, offset) => candidates[(cursor + offset) % candidates.length])
  return ordered.find((record) => (
    !excludedRecordIds.has(record.id) && record.id !== state.lastRecordIds[region]
  )) ?? ordered.find((record) => !excludedRecordIds.has(record.id))
}

export const selectStableDiscoverySignals = (
  records: DiscoveryRecord[],
  count = DISCOVERY_DESKTOP_TARGET_CONCURRENCY,
): DiscoveryRecord[] => {
  const groups = recordsByRegion(records)
  const selected: DiscoveryRecord[] = []
  const emptyState: DiscoveryHeartbeatState = {
    activeSignals: [], regionCursors: {}, regionLastSelected: {}, lastRecordIds: {}, replacementIndex: 0,
    targetCount: count,
  }
  const usedRegions = new Set<string>()
  for (let slot = 0; slot < count && selected.length < records.length; slot += 1) {
    const current = selected.map((record) => ({ record }))
    const requiredIsland = missingIsland(current, records)
    const region = chooseRegion(groups, emptyState, new Set(selected.map((record) => record.id)), usedRegions, requiredIsland)
    if (!region) break
    const candidate = chooseRecordInRegion(region, groups, emptyState, new Set(selected.map((record) => record.id)))
    if (candidate) {
      selected.push(candidate)
      usedRegions.add(region)
    }
  }
  return selected
}

export const createDiscoveryHeartbeatState = (
  records: DiscoveryRecord[],
  reducedMotion = false,
  targetCount = DISCOVERY_DESKTOP_TARGET_CONCURRENCY,
): DiscoveryHeartbeatState => {
  const groups = recordsByRegion(records)
  if (reducedMotion) {
    return {
      activeSignals: selectStableDiscoverySignals(records, targetCount).map((record) => ({ record })),
      regionCursors: {},
      regionLastSelected: {},
      lastRecordIds: {},
      replacementIndex: 0,
      targetCount,
    }
  }
  const state: DiscoveryHeartbeatState = {
    activeSignals: [], regionCursors: {}, regionLastSelected: {}, lastRecordIds: {}, replacementIndex: 0, targetCount,
  }
  const usedRegions = new Set<string>()
  for (let slot = 0; slot < targetCount && slot < records.length; slot += 1) {
    const requiredIsland = missingIsland(state.activeSignals, records)
    const region = chooseRegion(groups, state, new Set(state.activeSignals.map((signal) => signal.record.id)), usedRegions, requiredIsland)
    if (!region) break
    const record = chooseRecordInRegion(region, groups, state, new Set(state.activeSignals.map((signal) => signal.record.id)))
    if (!record) break
    state.activeSignals.push({ record })
    state.regionLastSelected[region] = 0
    state.regionCursors[region] = ((groups[region].indexOf(record) + 1) % groups[region].length)
    state.lastRecordIds[region] = record.id
    usedRegions.add(region)
  }
  return state
}

export const advanceDiscoveryHeartbeat = (
  records: DiscoveryRecord[],
  state: DiscoveryHeartbeatState,
): DiscoveryHeartbeatState => {
  const groups = recordsByRegion(records)
  if (!records.length) return createDiscoveryHeartbeatState([], false, state.targetCount)

  const next: DiscoveryHeartbeatState = {
    activeSignals: [...state.activeSignals],
    regionCursors: { ...state.regionCursors },
    regionLastSelected: { ...state.regionLastSelected },
    lastRecordIds: { ...state.lastRecordIds },
    replacementIndex: state.replacementIndex + 1,
    targetCount: state.targetCount,
  }
  if (next.activeSignals.length < Math.min(next.targetCount, records.length)) {
    const region = chooseRegion(groups, next, new Set(next.activeSignals.map((signal) => signal.record.id)), new Set(next.activeSignals.map((signal) => signal.record.region)))
    if (region) {
      const record = chooseRecordInRegion(region, groups, next, new Set(next.activeSignals.map((signal) => signal.record.id)))
      if (record) next.activeSignals.push({ record })
    }
  } else {
    const slot = next.replacementIndex % next.activeSignals.length
    const excludedSignals = next.activeSignals.filter((_, index) => index !== slot)
    const excludedIds = new Set(excludedSignals.map((signal) => signal.record.id))
    const excludedRegions = new Set(excludedSignals.map((signal) => signal.record.region))
    const requiredIsland = missingIsland(excludedSignals, records)
    const region = chooseRegion(groups, next, excludedIds, excludedRegions, requiredIsland)
    if (region) {
      const record = chooseRecordInRegion(region, groups, next, excludedIds)
      if (record) {
        next.activeSignals[slot] = { record }
        next.regionLastSelected[region] = next.replacementIndex
        next.regionCursors[region] = (groups[region].indexOf(record) + 1) % groups[region].length
        next.lastRecordIds[region] = record.id
      }
    }
  }
  return next
}

export const discoveryFeatureCollection = (signals: DiscoveryRecord[]) => ({
  type: 'FeatureCollection' as const,
  features: signals.map((signal, index) => ({
    type: 'Feature' as const,
    id: `${signal.kind}:${signal.id}`,
    geometry: {
      type: 'Point' as const,
      coordinates: [signal.lng, signal.lat],
    },
    properties: {
      label: signal.name,
      region: signal.region,
      kind: signal.kind,
      signalId: signal.id,
      index,
    },
  })),
})

export const installArrivalDiscoveryLayer = (
  map: MapLibreMap,
  participants: readonly LocatedParticipant[],
  areaIndex: AreaIndex,
  onOpen: (kind: 'participant' | 'area', id: string) => void,
  localities: readonly LocalityDisplayFeature[] = [],
) => {
  const sourceId = 'lm-arrival-discovery'
  const ringLayerId = 'lm-arrival-discovery-ring'
  const coreLayerId = 'lm-arrival-discovery-core'
  const labelLayerId = 'lm-arrival-discovery-label'

  const baseSignals = buildDiscoverySignals(participants, areaIndex, localities)
  const reducedMotion = prefersReducedMotion()
  const targetCount = getDiscoverySignalCount(window.innerWidth)
  let heartbeat = createDiscoveryHeartbeatState(baseSignals, reducedMotion, targetCount)
  let activeSignals = heartbeat.activeSignals
  let active = true
  let rotationTimer: number | undefined
  let pulseFrame: number | undefined
  let animationTime = 0
  const slotFades = new Map<number, SlotFade>()

  const ensureLayers = () => {
    if (!map.isStyleLoaded()) return false

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: discoveryFeatureCollection(activeSignals.map((signal) => signal.record)),
      })
    }

    if (!map.getLayer(ringLayerId)) {
      map.addLayer({
        id: ringLayerId,
        type: 'circle',
        source: sourceId,
        layout: { visibility: active ? 'visible' : 'none' },
        paint: {
          'circle-radius': [
            '*',
            ['interpolate', ['linear'], ['zoom'], 3, 15, 7, 22],
            1,
          ],
          'circle-color': exGamesPalette.warmGold,
          'circle-opacity': ['*', 0.2, ['coalesce', ['feature-state', 'fadeOpacity'], 1]],
          'circle-stroke-width': 2,
          'circle-stroke-color': exGamesPalette.mist,
        },
      })
    }

    if (!map.getLayer(coreLayerId)) {
      map.addLayer({
        id: coreLayerId,
        type: 'circle',
        source: sourceId,
        layout: { visibility: active ? 'visible' : 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 5, 7, 10],
          'circle-color': exGamesPalette.warmGold,
          'circle-opacity': ['coalesce', ['feature-state', 'fadeOpacity'], 1],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': exGamesPalette.kauriDark,
        },
      })
    }

    if (!map.getLayer(labelLayerId)) {
      map.addLayer({
        id: labelLayerId,
        type: 'symbol',
        source: sourceId,
        layout: {
          visibility: active ? 'visible' : 'none',
          'text-field': ['get', 'label'],
          'text-font': ['Noto Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 12, 7, 15],
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-anchor': 'top',
          'text-offset': [0, -1.1],
        },
        paint: {
          'text-color': exGamesPalette.kauriDark,
          'text-halo-color': exGamesPalette.mist,
          'text-halo-width': 2.6,
          'text-opacity': ['coalesce', ['feature-state', 'fadeOpacity'], 1],
        },
      })
    }

    return true
  }

  const updateSource = (nextData: ReturnType<typeof discoveryFeatureCollection>) => {
    if (!ensureLayers()) return false
    const source = map.getSource(sourceId) as { setData?: (data: unknown) => void } | undefined
    if (!source?.setData) return false
    source.setData(nextData)
    return true
  }

  const setSignalOpacity = (record: DiscoveryRecord, opacity: number) => {
    if (!ensureLayers()) return
    map.setFeatureState({ source: sourceId, id: `${record.kind}:${record.id}` }, { fadeOpacity: opacity })
  }

  ensureLayers()

  const refresh = () => {
    const featureData = discoveryFeatureCollection(activeSignals.map((signal) => signal.record))
    updateSource(featureData)
  }

  map.on('style.load', () => {
    if (!ensureLayers()) return
    refresh()
    for (const id of [ringLayerId, coreLayerId, labelLayerId]) {
      map.setLayoutProperty(id, 'visibility', active ? 'visible' : 'none')
    }
  })

  const startPulse = () => {
    if (reducedMotion || typeof window.requestAnimationFrame !== 'function') return
    if (pulseFrame !== undefined) window.cancelAnimationFrame(pulseFrame)
    const animate = (timestamp: number) => {
      if (!active) return
      if (!ensureLayers()) {
        pulseFrame = window.requestAnimationFrame(animate)
        return
      }
      animationTime = timestamp
      for (const [slotIndex, fade] of slotFades) {
        const progress = Math.max(0, Math.min(1, (timestamp - fade.startedAt) / DISCOVERY_SLOT_FADE_DURATION_MS))
        const opacity = fade.phase === 'out' ? 1 - progress : progress
        const currentRecord = activeSignals[slotIndex]?.record
        if (currentRecord?.id === fade.signalId) setSignalOpacity(currentRecord, opacity)
        if (progress < 1) continue

        if (fade.phase === 'out') {
          heartbeat = advanceDiscoveryHeartbeat(baseSignals, heartbeat)
          activeSignals = heartbeat.activeSignals
          refresh()
          const replacement = activeSignals[slotIndex]?.record
          if (replacement) {
            setSignalOpacity(replacement, 0)
            slotFades.set(slotIndex, {
              signalId: replacement.id,
              phase: 'in',
              startedAt: timestamp,
            })
          } else {
            slotFades.delete(slotIndex)
          }
        } else {
          const finishedRecord = activeSignals[slotIndex]?.record
          if (finishedRecord) setSignalOpacity(finishedRecord, 1)
          slotFades.delete(slotIndex)
        }
      }

      const phase = (timestamp % DISCOVERY_PULSE_PERIOD_MS) / DISCOVERY_PULSE_PERIOD_MS * Math.PI * 2
      const breath = Math.sin(phase)
      const scale = 1 + (breath + 1) * 0.07
      const opacity = 0.16 + (breath + 1) * 0.04
      map.setPaintProperty(ringLayerId, 'circle-radius', [
        '*',
        ['interpolate', ['linear'], ['zoom'], 3, 15, 7, 22],
        scale,
      ])
      map.setPaintProperty(ringLayerId, 'circle-opacity', [
        '*',
        opacity,
        ['coalesce', ['feature-state', 'fadeOpacity'], 1],
      ])
      pulseFrame = window.requestAnimationFrame(animate)
    }
    pulseFrame = window.requestAnimationFrame(animate)
  }

  const startRotation = () => {
    if (reducedMotion) {
      if (rotationTimer) window.clearInterval(rotationTimer)
      return
    }
    if (rotationTimer) window.clearInterval(rotationTimer)
    rotationTimer = window.setInterval(() => {
      if (!active) return
      if (!activeSignals.length) return
      const slotIndex = (heartbeat.replacementIndex + 1) % activeSignals.length
      const currentRecord = activeSignals[slotIndex]?.record
      if (!currentRecord) return
      slotFades.set(slotIndex, {
        signalId: currentRecord.id,
        phase: 'out',
        startedAt: animationTime,
      })
    }, DISCOVERY_ROTATION_INTERVAL_MS)
  }

  const hide = () => {
    active = false
    if (rotationTimer) window.clearInterval(rotationTimer)
    if (pulseFrame !== undefined) window.cancelAnimationFrame(pulseFrame)
    pulseFrame = undefined
    slotFades.clear()
    if (!ensureLayers()) return
    map.setLayoutProperty(ringLayerId, 'visibility', 'none')
    map.setLayoutProperty(coreLayerId, 'visibility', 'none')
    map.setLayoutProperty(labelLayerId, 'visibility', 'none')
  }

  const show = () => {
    active = true
    heartbeat = createDiscoveryHeartbeatState(baseSignals, reducedMotion, targetCount)
    activeSignals = heartbeat.activeSignals
    refresh()
    if (ensureLayers()) {
      map.setLayoutProperty(ringLayerId, 'visibility', 'visible')
      map.setLayoutProperty(coreLayerId, 'visibility', 'visible')
      map.setLayoutProperty(labelLayerId, 'visibility', 'visible')
    }
    if (!reducedMotion) {
      startRotation()
      startPulse()
    }
  }

  const destroy = () => {
    if (rotationTimer) window.clearInterval(rotationTimer)
    if (pulseFrame !== undefined) window.cancelAnimationFrame(pulseFrame)
    slotFades.clear()
    if (map.getLayer(ringLayerId)) map.removeLayer(ringLayerId)
    if (map.getLayer(coreLayerId)) map.removeLayer(coreLayerId)
    if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId)
    if (map.getSource(sourceId)) map.removeSource(sourceId)
  }

  map.on('mouseenter', coreLayerId, () => {
    map.getCanvas().style.cursor = 'pointer'
  })

  map.on('mouseleave', coreLayerId, () => {
    map.getCanvas().style.cursor = ''
  })

  map.on('click', coreLayerId, (event) => {
    const feature = event.features?.[0]
    const signalId = feature?.properties?.signalId as string | undefined
    if (!signalId) return
    const record = activeSignals.find((item) => item.record.id === signalId)?.record
    if (!record) return
    hide()
    onOpen(record.kind, record.id.replace(`${record.kind}:`, ''))
  })

  map.on('mouseenter', labelLayerId, () => {
    map.getCanvas().style.cursor = 'pointer'
  })

  map.on('mouseleave', labelLayerId, () => {
    map.getCanvas().style.cursor = ''
  })

  show()

  return { destroy, hide, show }
}
