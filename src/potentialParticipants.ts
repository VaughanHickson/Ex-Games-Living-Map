import { buildParticipantRegistry, type SeedParticipant } from './participant-model'
import { buildAreaIndex, type AreaDataset } from './area-model'
export type { LocatedParticipant } from './participant-model'

const regionalDatasetManifest = await fetch(
  '/data/participant-regional-datasets.json'
).then(response => response.json())

const regionalParticipantDatasets =
  regionalDatasetManifest.datasets as { region: string; path: string }[]

const seeds = (
  await Promise.all(
    regionalParticipantDatasets.map(async dataset => {
      try {
        const response = await fetch(dataset.path)
        if (!response.ok) return null
        const payload = await response.json()
        return { ...payload, region: dataset.region }
      } catch {
        return null
      }
    })
  )
).filter(Boolean)

const registry = buildParticipantRegistry(seeds as { region: string; participants: SeedParticipant[] }[])
export const locatedParticipants = registry.participants
export const participantLocalities = (id: string) => registry.localityMemberships.get(id) ?? []

export let areaLoadError: string | undefined
export const areaIndex = await (async () => {
  try {
    const response = await fetch('/data/areas.json')
    if (!response.ok) throw new Error(`Area dataset HTTP ${response.status}`)
    const index = buildAreaIndex(await response.json() as AreaDataset, locatedParticipants)
    for (const warning of index.warnings) console.warn(warning)
    return index
  } catch (error) {
    areaLoadError = error instanceof Error ? error.message : 'Area dataset unavailable'
    console.error(`Area validation failed: ${areaLoadError}`)
    return buildAreaIndex({ areaModel: 'EXG-LM-AREA-MODEL-002', areas: [] }, locatedParticipants)
  }
})()

export const participantInRegion = (id: string, region: string) =>
  participantLocalities(id).some(m => m.region === region)
  || areaIndex.areasForParticipant(id).some(a => a.region === region)

export const participantInLocality = (id: string, locality: string, region?: string) =>
  participantLocalities(id).some(m => m.locality === locality && (!region || m.region === region))

export const loadLocatedParticipants = async (locality: string, region?: string) =>
  locatedParticipants.filter(p => participantInLocality(p.id, locality, region))
