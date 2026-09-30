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
const filename = 'participants-hawkes-bay-located-001-resolved-001.json'
const dataset = read('public/data/' + filename)
const pid = 'exg-hawke-s-bay-te-mata-park-trust'
const retiredId = 'exg-hawke-s-bay-te-mata-park'
const actualFetch = globalThis.fetch
globalThis.fetch = async path => new Response(JSON.stringify(read('public' + path)))
const runtime = await import('../src/potentialParticipants.ts')
const { searchParticipants, registrationHandoffAction } = await import('../src/search/index.ts')
globalThis.fetch = actualFetch

test('Te Mata Park reconciles to its established Trust ID through the production manifest', async () => {
  assert.deepEqual(dataset, read('data/participants/resolved/' + filename))
  assert.equal(dataset.participants.length, 267)
  const matches = runtime.locatedParticipants.filter(p => /^Te Mata Park(?: Trust)?$/.test(p.name))
  assert.equal(matches.length, 1)
  assert.equal(matches[0].id, pid)
  assert.equal(matches[0].status, 'located')
  assert.ok(!runtime.locatedParticipants.some(p => p.id === retiredId))
  assert.ok(runtime.participantInRegion(pid, "Hawke's Bay Region"))
  const local = await runtime.loadLocatedParticipants('Havelock North', "Hawke's Bay Region")
  assert.equal(local.filter(p => p.id === pid).length, 1)
  assert.equal(runtime.areaIndex.areasForParticipant(pid).length, 0)
})

test('Find/Add searches reconcile names and evidence to the same ordinary LOCATED participant', () => {
  const exact = searchParticipants({ name: 'Te Mata Park Trust', region: "Hawke's Bay Region", locality: 'Havelock North' })
  assert.equal(exact.outcome, 'EXISTING_MATCH')
  assert.deepEqual(exact.candidates.map(c => c.participant.id), [pid])
  assert.equal(registrationHandoffAction(exact), 'ENDORSE_EXISTING')
  const park = searchParticipants({ name: 'Te Mata Park', region: "Hawke's Bay Region" })
  assert.deepEqual(park.candidates.map(c => c.participant.id), [pid])
  assert.equal(registrationHandoffAction(park), 'REVIEW_POSSIBLE')
  const national = searchParticipants({ name: 'Te Mata Park' })
  assert.equal(national.candidates.filter(c => c.participant.id === pid).length, 1)
  assert.ok(!national.candidates.some(c => c.participant.id === retiredId))
  assert.equal(registrationHandoffAction(national), 'REVIEW_POSSIBLE')
  for (const name of ['Te Mata Park TrapNZ', 'Te Mata Park pest-plant', 'Te Mata Park ecological education']) {
    assert.deepEqual(searchParticipants({ name }).candidates.map(c => c.participant.id), [pid])
  }
  assert.equal(searchParticipants({ name: 'Te Mata Park Trust', region: 'Auckland' }).candidates.length, 0)
})

test('public evidence survives projection without conferring verification, authority or participation', () => {
  const seed = dataset.participants.find(p => p.id === pid)
  const projected = runtime.locatedParticipants.find(p => p.id === pid)
  assert.match(projected.detail, /670 introduced predators over five years/)
  assert.match(projected.detail, /82 traps/)
  assert.match(projected.detail, /TrapNZ/)
  assert.match(projected.detail, /does not imply endorsement, partnership, consent/)
  assert.equal(projected.sourceUrl, seed.sources[0])
  assert.deepEqual(projected.activities, seed.activities)
  for (const p of [seed, projected]) {
    assert.equal(p.status, 'located')
    for (const key of ['active', 'verified', 'authority', 'profileClaimed', 'joinedAt', 'competitionState']) {
      assert.equal(Object.hasOwn(p, key), false, key)
    }
  }
})
