import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && context.parentURL) {
    const base = new URL(specifier, context.parentURL)
    for (const suffix of ['.ts', '/index.ts']) {
      const url = new URL(base.href + suffix)
      if (fs.existsSync(fileURLToPath(url))) return next(url.href, context)
    }
  }
  return next(specifier, context)
} })

const actualFetch = globalThis.fetch
const manifest = JSON.parse(fs.readFileSync('public/data/participant-regional-datasets.json', 'utf8'))
const existing = manifest.datasets.flatMap(d => JSON.parse(fs.readFileSync('public' + d.path, 'utf8')).participants)
const localityFeatures = JSON.parse(fs.readFileSync('public/data/nz-suburbs-localities.geojson', 'utf8')).features

globalThis.fetch = async path => new Response(JSON.stringify(JSON.parse(fs.readFileSync('public' + path, 'utf8'))), { status: 200 })

const runtime = await import('../src/potentialParticipants.ts')
const {
  advanceDiscoveryHeartbeat,
  buildDiscoverySignals,
  createDiscoveryHeartbeatState,
  DISCOVERY_DESKTOP_TARGET_CONCURRENCY,
  DISCOVERY_MOBILE_TARGET_CONCURRENCY,
  DISCOVERY_PULSE_PERIOD_MS,
  DISCOVERY_ROTATION_INTERVAL_MS,
  DISCOVERY_SLOT_FADE_DURATION_MS,
  DISCOVERY_TARGET_CONCURRENCY,
  getDiscoveryIsland,
  getDiscoverySignalCount,
  installArrivalDiscoveryLayer,
  prefersReducedMotion,
  selectStableDiscoverySignals,
} = await import('../src/discoveryPrototype.ts')

globalThis.fetch = actualFetch

const baseRecords = buildDiscoverySignals(runtime.locatedParticipants, runtime.areaIndex, localityFeatures)

const sameParticipantTwice = [
  runtime.locatedParticipants[0],
  runtime.locatedParticipants[0],
]

const unlocatedNational = {
  id: 'exg-test-national-extra',
  name: 'Test National Extra',
  status: 'located',
  region: undefined,
}

const nationalOnly = [
  ...runtime.locatedParticipants.filter((participant) => participant.region === 'New Zealand'),
  unlocatedNational,
]

const reducedMotionMatch = () => {
  const media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
  if (!media) return false
  return media.matches
}

const makeRecords = () => [
  ...Array.from({ length: 12 }, (_, index) => ({
    id: `participant:Northland-${index}`,
    kind: 'participant',
    name: `Northland ${index}`,
    region: 'Northland Region',
    lng: 173 + (index % 4) * 0.2,
    lat: -35.2 - index * 0.1,
  })),
  ...['Auckland', 'Wellington Region', 'Canterbury Region', 'Otago Region', 'Southland Region'].flatMap((region, regionIndex) =>
    Array.from({ length: region === 'Southland Region' ? 1 : 3 }, (_, index) => ({
      id: `participant:${regionIndex}-${index}`,
      kind: 'participant',
      name: `${region} ${index}`,
      region,
      lng: 168 + regionIndex * 1.1 + index * 0.1,
      lat: -35.7 - regionIndex * 2.1 - index * 0.12,
    })),
  ),
]

test('national rotation keeps five desktop discoveries and replaces one slot every three seconds', () => {
  assert.equal(DISCOVERY_ROTATION_INTERVAL_MS, 3000)
  assert.equal(DISCOVERY_PULSE_PERIOD_MS, 4200)
  assert.equal(DISCOVERY_TARGET_CONCURRENCY, 5)
  assert.equal(DISCOVERY_DESKTOP_TARGET_CONCURRENCY, 5)
  assert.equal(DISCOVERY_MOBILE_TARGET_CONCURRENCY, 3)
  assert.equal(getDiscoverySignalCount(1440), 5)
  assert.equal(getDiscoverySignalCount(500), 3)

  const records = makeRecords()
  let state = createDiscoveryHeartbeatState(records)
  assert.equal(state.activeSignals.length, 5)

  const beforeIds = state.activeSignals.map((signal) => signal.record.id)
  state = advanceDiscoveryHeartbeat(records, state)
  assert.equal(state.activeSignals.length, 5)
  assert.equal(state.activeSignals.filter((signal) => !beforeIds.includes(signal.record.id)).length, 1)
})

test('selection avoids duplicate records and limits simultaneous regional concentration', () => {
  const records = makeRecords()
  let state = createDiscoveryHeartbeatState(records)
  for (let rotation = 0; rotation < 36; rotation += 1) {
    const ids = state.activeSignals.map((signal) => signal.record.id)
    const regions = state.activeSignals.map((signal) => signal.record.region)
    assert.equal(new Set(ids).size, ids.length)
    assert.equal(new Set(regions).size, regions.length)
    state = advanceDiscoveryHeartbeat(records, state)
  }
})

test('least-recently-seen populated regions are preferred before regions repeat', () => {
  const records = makeRecords()
  let state = createDiscoveryHeartbeatState(records)
  const seenRegions = new Set(state.activeSignals.map((signal) => signal.record.region))

  for (let rotation = 0; rotation < 8; rotation += 1) {
    const beforeRegions = state.activeSignals.map((signal) => signal.record.region)
    state = advanceDiscoveryHeartbeat(records, state)
    for (const signal of state.activeSignals) seenRegions.add(signal.record.region)
    const changed = state.activeSignals.find((signal, index) => signal.record.region !== beforeRegions[index])
    if (changed) assert.ok(changed.record.region)
  }
  assert.ok(seenRegions.has('Southland Region'))
  assert.ok(seenRegions.has('Otago Region'))
  assert.ok(seenRegions.size >= 5)
})

test('southern low-density regions receive exposure despite a much larger northern pool', () => {
  const records = makeRecords()
  let state = createDiscoveryHeartbeatState(records)
  const seen = new Set(state.activeSignals.map((signal) => signal.record.region))
  for (let rotation = 0; rotation < 18 && !(seen.has('Southland Region') && seen.has('Otago Region')); rotation += 1) {
    state = advanceDiscoveryHeartbeat(records, state)
    for (const signal of state.activeSignals) seen.add(signal.record.region)
  }
  assert.ok(seen.has('Southland Region'))
  assert.ok(seen.has('Otago Region'))
})

test('records rotate within regions and selection is reproducible for the same candidate set', () => {
  const records = makeRecords()
  const run = () => {
    let state = createDiscoveryHeartbeatState(records)
    const sequence = []
    for (let rotation = 0; rotation < 24; rotation += 1) {
      state = advanceDiscoveryHeartbeat(records, state)
      sequence.push(state.activeSignals.map((signal) => signal.record.id))
    }
    return sequence
  }
  assert.deepEqual(run(), run())

  const oneRegionRecords = records.filter((record) => record.region === 'Northland Region')
  let state = createDiscoveryHeartbeatState(oneRegionRecords)
  const seen = new Set(state.activeSignals.map((signal) => signal.record.id))
  for (let rotation = 0; rotation < 6; rotation += 1) {
    state = advanceDiscoveryHeartbeat(oneRegionRecords, state)
    for (const signal of state.activeSignals) seen.add(signal.record.id)
  }
  assert.ok(seen.size > DISCOVERY_TARGET_CONCURRENCY)
})

test('discovery signals exclude national-only placeholder participants without region assignment', () => {
  const records = buildDiscoverySignals(nationalOnly, runtime.areaIndex, localityFeatures)
  const participantIds = records.filter((record) => record.kind === 'participant').map((record) => record.id)
  assert.ok(!participantIds.includes('participant:exg-test-national-extra'))
})

test('Area discovery pulses use illustrative regional placement, not canonical geometry', () => {
  const areaIndex = {
    areasById: new Map([
      ['area-point', {
        id: 'area-point',
        name: 'Point Area',
        region: 'Canterbury Region',
        geometry: { type: 'Point', coordinates: [170, -43] },
      }],
      ['area-unresolved', {
        id: 'area-unresolved',
        name: 'Unresolved Area',
        region: 'Otago Region',
        geometry: null,
      }],
    ]),
  }
  const locality = (region, west, south, east, north) => ({
    properties: { id: `${region}-locality`, name: `${region} locality`, region },
    geometry: { type: 'Polygon', coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] },
  })
  const localities = [
    locality('Canterbury Region', 170, -44, 171, -43),
    locality('Otago Region', 169, -46, 170, -45),
  ]
  const records = buildDiscoverySignals([], areaIndex, localities)
  const point = records.find((record) => record.id === 'area:area-point')
  const unresolved = records.find((record) => record.id === 'area:area-unresolved')

  assert.ok(point)
  assert.ok(unresolved)
  assert.notDeepEqual([point.lng, point.lat], [170, -43])
  assert.ok(point.lng >= 170 && point.lng <= 171)
  assert.ok(point.lat >= -44 && point.lat <= -43)
})

test('real participant and Area display positions lie inside locality land polygons', () => {
  const records = buildDiscoverySignals(runtime.locatedParticipants, runtime.areaIndex, localityFeatures)
  const pointInRing = ([x, y], ring) => {
    let inside = false
    for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
      const [currentX, currentY] = ring[current]
      const [previousX, previousY] = ring[previous]
      if ((currentY > y) !== (previousY > y)
        && x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX) inside = !inside
    }
    return inside
  }
  const isInsidePolygon = ([lng, lat], polygon) => pointInRing([lng, lat], polygon[0])
    && !polygon.slice(1).some((ring) => pointInRing([lng, lat], ring))
  const isInsideFeature = (point, feature) => (feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates).some((polygon) => isInsidePolygon(point, polygon))

  assert.ok(records.length > 0)
  const marineLocalityName = /\b(bay|harbour|harbor|inlet|sound|cove|estuary|beach|offshore|island|islet|coast)\b/i
  const landLocalities = localityFeatures.filter((feature) => (
    !marineLocalityName.test(feature.properties.name ?? '')
    && !marineLocalityName.test(feature.properties.major_name ?? '')
  ))
  for (const record of records) {
    const point = [record.lng, record.lat]
    const features = landLocalities.filter((item) => item.properties.region === record.region)
    assert.ok(features.length, `missing locality for ${record.region}`)
    assert.ok(features.some((feature) => isInsideFeature(point, feature)), record.id)
  }
})

test('national-only participants without regional geography are excluded from discovery signals', () => {
  const records = buildDiscoverySignals(runtime.locatedParticipants, runtime.areaIndex, localityFeatures)
  const participantIds = new Set(records.filter((record) => record.kind === 'participant').map((record) => record.id))
  assert.ok(!participantIds.has('participant:exg-backcountry-trust'))
  assert.ok(!participantIds.has('participant:exg-nz-lizard-identification-expert-id'))
  assert.ok(!records.some((record) => record.region === 'New Zealand'))
})

test('explicitly marine participants are not assigned fabricated land anchors', () => {
  const marineParticipant = {
    id: 'test-marine-identity',
    name: 'Test Marine Guardians',
    type: 'Marine Conservation Group',
    region: 'Northland Region',
    status: 'located',
  }
  const records = buildDiscoverySignals([marineParticipant], runtime.areaIndex, localityFeatures)
  assert.ok(!records.some((record) => record.id === 'participant:test-marine-identity'))
})

test('explicitly marine locality polygons are not used as land display anchors', () => {
  const nydiaBay = localityFeatures.find((feature) => feature.properties.name === 'Nydia Bay')
  const participant = {
    id: 'test-marlborough-land-identity',
    name: 'Test Marlborough Identity',
    type: 'Community Group',
    region: 'Marlborough Region',
    status: 'located',
  }
  assert.ok(nydiaBay)
  const records = buildDiscoverySignals([participant], runtime.areaIndex, [nydiaBay])
  assert.equal(records.length, 0)
})

test('desktop and mobile selections retain both islands through repeated regional rotations', () => {
  for (const targetCount of [DISCOVERY_DESKTOP_TARGET_CONCURRENCY, DISCOVERY_MOBILE_TARGET_CONCURRENCY]) {
    let state = createDiscoveryHeartbeatState(baseRecords, false, targetCount)
    for (let rotation = 0; rotation < 48; rotation += 1) {
      const islands = new Set(state.activeSignals.map((signal) => (
        getDiscoveryIsland(signal.record.region)
      )))
      assert.ok(islands.has('north'), `north island missing at count ${targetCount}, rotation ${rotation}`)
      assert.ok(islands.has('south'), `south island missing at count ${targetCount}, rotation ${rotation}`)
      state = advanceDiscoveryHeartbeat(baseRecords, state)
    }
  }
})

test('reduced-motion disables rotation and keeps a stable set', () => {
  const stable = selectStableDiscoverySignals(baseRecords)
  assert.equal(stable.length, DISCOVERY_DESKTOP_TARGET_CONCURRENCY)
  assert.deepEqual(selectStableDiscoverySignals(baseRecords), stable)
  assert.equal(new Set(stable.map((record) => record.region)).size, stable.length)
  assert.equal(prefersReducedMotion(), reducedMotionMatch())
})

test('reduced-motion desktop and mobile sets keep the minimum island representation', () => {
  for (const count of [DISCOVERY_DESKTOP_TARGET_CONCURRENCY, DISCOVERY_MOBILE_TARGET_CONCURRENCY]) {
    const stable = selectStableDiscoverySignals(baseRecords, count)
    const islands = new Set(stable.map((record) => getDiscoveryIsland(record.region)))
    assert.equal(stable.length, count)
    assert.ok(islands.has('north'))
    assert.ok(islands.has('south'))
  }
})

test('reduced-motion installation keeps a stable nationwide set without scheduling beats', () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  let intervalCount = 0
  let animationCount = 0
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      innerWidth: 1440,
      matchMedia: () => ({ matches: true }),
      setInterval: (_callback, interval) => { intervalCount += interval; return 1 },
      clearInterval: () => {},
      requestAnimationFrame: () => { animationCount += 1; return 1 },
      cancelAnimationFrame: () => {},
    },
  })

  const sources = new Map()
  const layers = new Map()
  const map = {
    addSource: (id, source) => sources.set(id, { ...source, setData(data) { this.data = data } }),
    getSource: (id) => sources.get(id),
    addLayer: (layer) => layers.set(layer.id, layer),
    getLayer: (id) => layers.get(id),
    isStyleLoaded: () => true,
    setLayoutProperty: () => {},
    on: () => {},
    getCanvas: () => ({ style: {} }),
    removeLayer: (id) => layers.delete(id),
    removeSource: (id) => sources.delete(id),
  }

  try {
    const discovery = installArrivalDiscoveryLayer(map, runtime.locatedParticipants, runtime.areaIndex, () => {}, localityFeatures)
    const features = sources.get('lm-arrival-discovery').data.features
    assert.equal(features.length, DISCOVERY_DESKTOP_TARGET_CONCURRENCY)
    assert.equal(intervalCount, 0)
    assert.equal(animationCount, 0)
    discovery.destroy()
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else delete globalThis.window
  }
})

test('normal installation schedules three-second rotation separately from the continuous pulse', () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const scheduled = []
  let animationCount = 0
  let pulseCallback
  let now = 0
  const featureStates = new Map()
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      innerWidth: 1440,
      matchMedia: () => ({ matches: false }),
      setInterval: (callback, interval) => { scheduled.push({ callback, interval }); return scheduled.length },
      clearInterval: () => {},
      requestAnimationFrame: (callback) => { pulseCallback = callback; animationCount += 1; return animationCount },
      cancelAnimationFrame: () => {},
    },
  })

  const sources = new Map()
  const layers = new Map()
  const paintUpdates = []
  const handlers = new Map()
  let styleLoaded = true
  const map = {
    addSource: (id, source) => sources.set(id, { ...source, setData(data) { this.data = data } }),
    getSource: (id) => sources.get(id),
    addLayer: (layer) => layers.set(layer.id, layer),
    getLayer: (id) => layers.get(id),
    isStyleLoaded: () => styleLoaded,
    setLayoutProperty: () => {},
    setPaintProperty: (id, ...args) => {
      if (!layers.has(id)) throw new Error(`Cannot style non-existing layer "${id}"`)
      paintUpdates.push([id, ...args])
    },
    setFeatureState: (target, state) => featureStates.set(target.id, { ...featureStates.get(target.id), ...state }),
    on: (event, callback) => handlers.set(event, callback),
    getCanvas: () => ({ style: {} }),
    removeLayer: (id) => layers.delete(id),
    removeSource: (id) => sources.delete(id),
  }

  try {
    const discovery = installArrivalDiscoveryLayer(map, runtime.locatedParticipants, runtime.areaIndex, () => {}, localityFeatures)
    assert.deepEqual(scheduled.map((item) => item.interval), [DISCOVERY_ROTATION_INTERVAL_MS])
    assert.equal(animationCount, 1)
    styleLoaded = false
    sources.clear()
    layers.clear()
    styleLoaded = true
    handlers.get('style.load')()
    assert.ok(sources.has('lm-arrival-discovery'))
    assert.ok(layers.has('lm-arrival-discovery-ring'))
    assert.ok(layers.has('lm-arrival-discovery-core'))
    assert.ok(layers.has('lm-arrival-discovery-label'))
    const before = sources.get('lm-arrival-discovery').data.features.map((feature) => feature.properties.signalId)
    scheduled[0].callback()
    assert.equal(DISCOVERY_SLOT_FADE_DURATION_MS, 1000)
    now += 500
    pulseCallback(now)
    const halfway = sources.get('lm-arrival-discovery').data.features.map((feature) => feature.properties.signalId)
    assert.deepEqual(halfway, before)
    const fadingSlot = [...featureStates.entries()].find(([, state]) => state.fadeOpacity === 0.5)?.[0]
    assert.ok(fadingSlot)
    assert.equal([...featureStates.values()].filter((state) => state.fadeOpacity !== undefined).length, 1)

    now += 500
    pulseCallback(now)
    const afterFadeOut = sources.get('lm-arrival-discovery').data.features.map((feature) => feature.properties.signalId)
    assert.equal(before.filter((id) => !afterFadeOut.includes(id)).length, 1)
    assert.equal(afterFadeOut.filter((id) => !before.includes(id)).length, 1)
    const replacement = afterFadeOut.find((id) => !before.includes(id))
    const replacementFeature = sources.get('lm-arrival-discovery').data.features
      .find((feature) => feature.properties.signalId === replacement)
    assert.equal(featureStates.get(replacementFeature.id).fadeOpacity, 0)

    now += 500
    pulseCallback(now)
    assert.equal(featureStates.get(replacementFeature.id).fadeOpacity, 0.5)
    now += 500
    pulseCallback(now)
    assert.equal(featureStates.get(replacementFeature.id).fadeOpacity, 1)
    assert.equal(typeof pulseCallback, 'function')
    assert.ok(paintUpdates.length >= 2)
    discovery.destroy()
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else delete globalThis.window
  }
})

test('duplicate participant identities are not duplicated in the discovery pool', () => {
  const records = buildDiscoverySignals(sameParticipantTwice, runtime.areaIndex, localityFeatures)
  const ids = records.filter((record) => record.kind === 'participant').map((record) => record.id)
  assert.equal(new Set(ids).size, ids.length)
})
