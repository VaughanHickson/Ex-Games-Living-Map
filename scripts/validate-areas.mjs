import fs from 'node:fs'
import { buildAreaIndex, areaFeatures } from '../src/area-model.ts'
import { buildParticipantRegistry } from '../src/participant-model.ts'
const manifest = JSON.parse(fs.readFileSync('public/data/participant-regional-datasets.json'))
const registry = buildParticipantRegistry(manifest.datasets.map(d => ({
  region:d.region, participants:JSON.parse(fs.readFileSync('public'+d.path)).participants,
})))
const file = process.argv[2] ?? 'public/data/areas.json'
const index = buildAreaIndex(JSON.parse(fs.readFileSync(file)), registry.participants)
for (const warning of index.warnings) console.warn(warning)
console.log(`Validated ${registry.participants.length} participant identities; ${index.areasById.size} Areas; ${areaFeatures(index).features.length} geographic features.`)
