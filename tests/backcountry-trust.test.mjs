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
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'))
const manifest = read('public/data/participant-regional-datasets.json')
const national = read('public/data/participants-national-001.json')
const dataset = read('public/data/areas.json')
const evidence = read('data/backcountry-trust-phase2-evidence.json')
const pid = 'exg-backcountry-trust'
const brandoId = 'exg-nz-brando-yelavich'
const actualFetch = globalThis.fetch
// Exercise the actual loader against production JSON, without network access.
globalThis.fetch = async path => new Response(JSON.stringify(read('public'+path)), { status:200 })
const runtime = await import('../src/potentialParticipants.ts')
const { searchParticipants, buildParticipantSearchIndex } = await import('../src/search/index.ts')
globalThis.fetch = actualFetch
const { areaFeatures } = await import('../src/area-model.ts')
const { participantAreaMarkup, areaMarkup } = await import('../src/area-presentation.ts')
const index = runtime.areaIndex
const bct = runtime.locatedParticipants.find(p => p.id === pid)
const brando = runtime.locatedParticipants.find(p => p.id === brandoId)
const area = id => index.areasById.get('area-'+id)
const classes = id => area(id).activityEvidence.flatMap(e => e.classifications)

test('BCT loads once as a national identity without participant geography arrays', () => {
  assert.equal(runtime.areaLoadError, undefined)
  assert.ok(bct)
  assert.ok(brando)
  assert.equal(national.participants.length, 3)
  assert.equal(national.participants[0].shortName, 'BCT')
  assert.equal(national.participants[0].country, 'New Zealand')
  assert.equal(national.participants[0].scope, 'National')
  assert.equal(national.participants[0].operatingBaseline, '2014–')
  assert.equal(national.participants[1].shortName, 'NZ Lizard ID')
  assert.equal(national.participants[2].name, 'Brando Yelavich')
  assert.equal(national.participants[2].shortName, 'Wildboy')
  assert.equal(national.participants[2].country, 'New Zealand')
  assert.equal(national.participants[2].scope, 'National')
  assert.equal(national.participants[2].entityType, 'individual')
  assert.equal(national.participants[2].status, 'located')
  assert.equal(Object.hasOwn(national.participants[2], 'active'), false)
  assert.match(brando.summary, /Wildboy/)
  assert.equal(bct.website, 'https://www.backcountrytrust.org.nz/')
  assert.equal(runtime.locatedParticipants.filter(p => p.id === pid).length, 1)
  for (const key of ['location','locations','areaIds','locality','localities','mapLocalities']) {
    assert.equal(Object.hasOwn(national.participants[0], key), false, key)
  }
  const existing = manifest.datasets.filter(d => d.path !== '/data/participants-national-001.json')
    .flatMap(d => read('public'+d.path).participants)
  assert.equal(existing.length, 4444)
  assert.equal(runtime.locatedParticipants.length, new Set(existing.map(p => p.id)).size + 3)
  for (const old of existing) {
    assert.equal(runtime.locatedParticipants.find(p => p.id === old.id)?.name, old.name, old.id)
    assert.notEqual(old.id, pid)
  }
})

test('26 named Areas traverse both ways and generate no invented geometry', () => {
  assert.equal(index.areasForParticipant(pid).length, 26)
  assert.equal(new Set(dataset.areas.map(a => a.id)).size, 26)
  assert.equal(new Set(dataset.areas.map(a => a.name)).size, 26)
  assert.deepEqual(index.warnings, [])
  assert.equal(Object.hasOwn(dataset, 'participantAreaLinks'), false)
  for (const a of dataset.areas) {
    assert.deepEqual(index.participantIdsForArea(a.id), [pid])
    assert.equal(a.boundaryStatus, 'UNRESOLVED')
    assert.equal(a.geometryStatus, 'NOT_ATTACHED')
    assert.equal(Object.hasOwn(a, 'geometry'), false)
    assert.ok(a.sources.every(source => source.startsWith('https://')))
    assert.ok(a.activityEvidence.every(e => e.sourceUrl && e.verificationStatus === 'SOURCE_CHECKED'))
    assert.equal((areaMarkup(a.id, index, runtime.locatedParticipants).match(/class="area-participant"/g) ?? []).length, 1)
  }
  assert.equal(areaFeatures(index).features.length, 0)
  assert.equal((participantAreaMarkup(pid, index).match(/class="participant-area"/g) ?? []).length, 26)
})

test('shared activities retain separate physical Areas; repeated Top Waitaha activity adds no duplicate', () => {
  for (const [a,b,ref] of [
    ['top-waitaha-hut','mullins-hut','bct-waitaha-mullins-toilets-2022'],
    ['brodrick-hut','huxley-forks-hut','bct-brodrick-huxley-2021'],
    ['jollie-brook-hut','cold-stream-hut','bct-jollie-brook-cold-stream-2022'],
  ]) {
    assert.notEqual(area(a).id, area(b).id)
    const first = area(a).activityEvidence.find(e => e.reference === ref)
    assert.ok(first)
    assert.deepEqual(first, area(b).activityEvidence.find(e => e.reference === ref))
  }
  assert.equal(area('top-waitaha-hut').activityEvidence.length, 2)
  assert.equal(dataset.areas.filter(a => a.name === 'Top Waitaha Hut').length, 1)
})

test('funding and support never imply BCT delivered partner field work', () => {
  for (const id of ['poteriteri-track','hump-ridge-to-teal-bay-track','kahikatea-lodge','bald-hill-track','jollie-brook-hut','cold-stream-hut']) {
    assert.ok(classes(id).includes('PARTNER_DELIVERED'), id)
    assert.ok(!classes(id).includes('BCT_DIRECT_TEAM'), id)
    assert.ok(!classes(id).includes('BCT_VOLUNTEER_TEAM'), id)
  }
  assert.match(area('poteriteri-track').description, /Permolat Southland performed the field work/)
  assert.match(area('kahikatea-lodge').description, /built by NZDA North Otago/)
  assert.ok(classes('leon-kinvig-hut').includes('BCT_CONTRACTED'))
  assert.ok(classes('leon-kinvig-hut').includes('BCT_VOLUNTEER_TEAM'))
  assert.ok(classes('mullins-hut').includes('BCT_VOLUNTEER_TEAM'))
  assert.match(areaMarkup('area-poteriteri-track', index, runtime.locatedParticipants), /no map position is invented/)
})

test('search and counts stay singular nationally and in each supported region', () => {
  const regions = new Set(index.areasForParticipant(pid).map(a => a.region))
  assert.equal(regions.size, 7)
  for (const region of [undefined, ...regions]) {
    const results = searchParticipants({ name:'Backcountry Trust', region })
    assert.equal(results.candidates.length, 1, region)
    assert.equal(results.candidates[0].participant.id, pid)
    const count = runtime.locatedParticipants.filter(p => p.id === pid && (!region || runtime.participantInRegion(p.id, region))).length
    assert.equal(count, 1, region)
  }
  assert.equal(searchParticipants({ name:'BCT' }).candidates.filter(c => c.participant.id === pid).length, 1)
  const wildboyResults = searchParticipants({ name:'Wildboy' }).candidates.filter(c => c.participant.id === brandoId)
  assert.equal(wildboyResults.length, 1)
  assert.equal(wildboyResults[0].participant.status, 'located')
  assert.equal(buildParticipantSearchIndex([bct,bct,bct]).length, 1)
  assert.equal(searchParticipants({ name:'Backcountry Trust', region:'Auckland' }).candidates.length, 0)
  assert.equal(runtime.participantInRegion(pid, 'Marlborough Region'), false)
  assert.equal(runtime.participantInLocality(pid, 'Hokitika', 'West Coast Region'), false)
  assert.equal(searchParticipants({ name:'Mullins Hut' }).candidates.filter(c => c.participant.id === pid).length, 1)
})

test('all 32 source candidates accounted for; six held candidates cannot fabricate geography', () => {
  assert.equal(evidence.locationCandidateCount, 32)
  assert.equal(evidence.heldCandidates.length, 6)
  assert.equal(dataset.areas.length + evidence.heldCandidates.length, 32)
  for (const held of evidence.heldCandidates) {
    assert.equal(held.status, 'WITHHELD_FROM_AREA_REGISTRY')
    assert.ok(held.reason.length > 0)
    assert.ok(!dataset.areas.some(a => a.name === held.name))
    assert.ok(held.activityEvidence.every(e => e.sourceUrl && e.classifications.length))
  }
  for (const a of dataset.areas) {
    assert.deepEqual(evidence.registeredEvidenceReferences[a.id], a.activityEvidence.map(e => e.reference))
  }
})
