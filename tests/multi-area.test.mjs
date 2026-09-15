import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'

// Resolve the application's bundler-style TS imports without installing a test runner.
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
const { buildAreaIndex, areaFeatures } = await import('../src/area-model.ts')
const { buildParticipantRegistry } = await import('../src/participant-model.ts')
const { participantAreaMarkup, areaMarkup, installAreaLayers } = await import('../src/area-presentation.ts')
const fixture = JSON.parse(fs.readFileSync(new URL('./multi-area-fixture.json', import.meta.url)))
const { participants, dataset } = fixture
const index = buildAreaIndex(dataset, participants)

test('cases 1–4: zero, one, three Areas and two participants in one Area', () => {
  assert.deepEqual(index.areasForParticipant('A'), [])
  assert.equal(index.areasForParticipant('B').length, 1)
  assert.equal(index.areasForParticipant('C').length, 3)
  assert.deepEqual(index.participantIdsForArea('fixture-area-5'), ['D', 'E'])
  assert.equal(index.areasById.size, 6)
})
test('case 5: duplicate relationships are deduplicated with diagnostics', () => {
  const d = structuredClone(dataset)
  d.areas[5].participantIds.push('F')
  d.participantAreaLinks = structuredClone(Object.fromEntries(index.participantAreaLinks))
  d.participantAreaLinks.F.push('fixture-area-6')
  const result = buildAreaIndex(d, participants)
  assert.equal(result.areasForParticipant('F').length, 1)
  assert.equal(result.warnings.length, 2)
})
test('case 6: unknown IDs and conflicting reverse mirrors fail visibly', () => {
  assert.throws(() => buildAreaIndex({ ...dataset, participantAreaLinks: { G:['unknown'] } }, participants), /Unknown Area ID/)
  const d = structuredClone(dataset); d.areas[0].participantIds = ['unknown']
  assert.throws(() => buildAreaIndex(d, participants), /Unknown participant ID/)
  assert.throws(() => buildAreaIndex({ ...dataset, participantAreaLinks: { C:[] } }, participants), /Conflicting/)
})
test('duplicate Area identities and invalid geometry are rejected', () => {
  assert.throws(() => buildAreaIndex({ ...dataset, areas:[...dataset.areas, dataset.areas[0]] }, participants), /Duplicate Area ID/)
  for (const geometry of [
    { type:'Point', coordinates:[-36, 174] },
    { type:'Point', coordinates:[NaN, -36] },
    { type:'LineString', coordinates:[[174, -36]] },
    { type:'Polygon', coordinates:[[[174,-36],[175,-36],[175,-37],[174,-37]]] },
  ]) {
    const d = structuredClone(dataset); d.areas[0].geometry = geometry
    assert.throws(() => buildAreaIndex(d, participants), /Invalid geometry/)
  }
})
test('geometry stays Area-based, unresolved Areas create no fabricated feature', () => {
  const features = areaFeatures(index).features
  assert.equal(features.length, 5)
  assert.equal(new Set(features.map(f => f.id)).size, 5)
  assert.deepEqual(features.map(f => f.geometry), dataset.areas.filter(a => a.geometry).map(a => a.geometry))
  assert.deepEqual(new Set(features.map(f => f.geometry.type)), new Set(['Point','LineString','Polygon','MultiPolygon']))
  assert.equal(areaFeatures(index, 'Northland Region').features.length, 1)
})
test('canonical participant registry does not expand identity by locality or region', () => {
  const registry = buildParticipantRegistry([
    { region:'Auckland', participants:[{ ...participants[2], mapLocalities:['Riverhead','Manurewa','Manurewa'] }] },
    { region:'Northland Region', participants:[{ ...participants[2], localities:['Kerikeri'] }] },
  ])
  assert.equal(registry.participants.length, 1)
  assert.equal(registry.localityMemberships.get('C').length, 3)
  assert.throws(() => buildParticipantRegistry([
    { region:'Auckland', participants:[participants[0], { ...participants[0], name:'Different identity' }] },
  ]), /Conflicting participant identity/)
})
test('both panel directions handle zero/one/multiple and unresolved geometry', () => {
  const canonical = buildParticipantRegistry([{ region:'Auckland', participants }]).participants
  assert.match(participantAreaMarkup('A', index), /No Area relationships/)
  assert.equal((participantAreaMarkup('B', index).match(/class="participant-area"/g) ?? []).length, 1)
  assert.equal((participantAreaMarkup('C', index).match(/class="participant-area"/g) ?? []).length, 3)
  assert.equal((areaMarkup('fixture-area-5', index, canonical).match(/class="area-participant"/g) ?? []).length, 2)
  assert.match(areaMarkup('fixture-area-6', index, canonical), /no map position is invented/)
  const empty = buildAreaIndex({ ...dataset, areas:[{ ...dataset.areas[0], participantIds:[] }] }, canonical)
  assert.match(areaMarkup('fixture-area-1', empty, canonical), /No participants associated/)
})
test('MapLibre receives Area features and geometry-specific layers; selection uses Area ID', () => {
  const sources = [], layers = [], handlers = []
  let selected
  const map = {
    addSource: (...args) => sources.push(args), addLayer: layer => layers.push(layer),
    on: (...args) => handlers.push(args),
    queryRenderedFeatures: () => [{ properties:{ areaId:'fixture-area-5' } }],
  }
  installAreaLayers(map, index, id => { selected = id })
  assert.equal(sources[0][1].data.features.length, 5)
  assert.deepEqual(layers.map(l => l.type), ['fill','line','circle'])
  handlers.find(h => h[0] === 'click')[1]({ point:[0,0] })
  assert.equal(selected, 'fixture-area-5')
})

// Exercise the real async loader and search module using local fixture responses only.
const actualFetch = globalThis.fetch
const manifest = JSON.parse(fs.readFileSync('public/data/participant-regional-datasets.json'))
const realRows = manifest.datasets.flatMap(d => JSON.parse(fs.readFileSync('public'+d.path)).participants.map(p => ({ region:d.region, participant:p })))
globalThis.fetch = async path => {
  let payload
  if (path === '/data/participant-regional-datasets.json') payload = { datasets:[...manifest.datasets, { region:'Auckland', path:'/fixture-participants' }] }
  else if (path === '/fixture-participants') payload = { participants }
  else if (path === '/data/areas.json') payload = dataset
  else payload = JSON.parse(fs.readFileSync('public'+path))
  return new Response(JSON.stringify(payload), { status:200 })
}
const runtime = await import('../src/potentialParticipants.ts')
const { searchParticipants, buildParticipantSearchIndex } = await import('../src/search/index.ts')
globalThis.fetch = actualFetch

test('case 7: search/counts are singular globally and across associated regions', () => {
  for (const region of [undefined, 'Auckland', 'Northland Region']) {
    const result = searchParticipants({ name:'Fixture Participant C', region })
    assert.equal(result.outcome, 'EXISTING_MATCH')
    assert.equal(result.candidates.length, 1)
    assert.equal(result.candidates[0].participant.id, 'C')
  }
  assert.equal(searchParticipants({ name:'Fixture Participant C', region:'Otago Region' }).candidates.length, 0)
  assert.equal(runtime.locatedParticipants.filter(p => p.id === 'C').length, 1)
  assert.equal(runtime.locatedParticipants.filter(p => p.id === 'C' && runtime.participantInRegion(p.id, 'Northland Region')).length, 1)
  const c = runtime.locatedParticipants.find(p => p.id === 'C')
  assert.equal(buildParticipantSearchIndex([c,c,c]).length, 1)
})
test('all existing identities and every legacy locality membership survive loading', async () => {
  assert.equal(runtime.locatedParticipants.length, new Set(realRows.map(r => r.participant.id)).size + participants.length)
  for (const { region, participant:p } of realRows) {
    const row = runtime.locatedParticipants.find(r => r.id === p.id)
    assert.ok(row, p.id)
    assert.equal(row.name, p.name)
    assert.ok(runtime.participantInRegion(p.id, region))
    const expected = p.mapLocalities?.length ? p.mapLocalities : p.localities ?? (p.locality ? [p.locality] : [])
    // Aliases are the same compatibility aliases used before this increment.
    assert.equal(runtime.participantLocalities(p.id).length, Math.max(1, new Set(expected).size), p.id)
  }
  const riverhead = await runtime.loadLocatedParticipants('Riverhead', 'Auckland')
  assert.equal(riverhead.length, new Set(riverhead.map(p => p.id)).size)
  assert.ok(riverhead.length > 0)
})
