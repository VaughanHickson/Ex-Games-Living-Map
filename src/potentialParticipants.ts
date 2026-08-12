export interface LocatedParticipant {
  id: string
  name: string
  locality: string
  type: string
  website?: string
  sourceUrl?: string
  status: 'located'
  relationship?: string
  summary?: string
  activities?: string[]
  detail?: string
}

type SeedParticipant = {
  id: string
  name: string
  entityType?: string
  populationClass?: string
  status: 'located'
  localities?: string[]
  mapLocalities?: string[]
  locality?: string
  sources?: string[]
  relationship?: string
  summary?: string
  activities?: string[]
  detail?: string
  website?: string | null
}

const regionalDatasetManifest = await fetch(
  '/data/participant-regional-datasets.json'
).then(response => response.json())

const regionalParticipantDatasets = (
  regionalDatasetManifest.datasets as { region: string; path: string }[]
).map(dataset => dataset.path)

const seeds = (
  await Promise.all(
    regionalParticipantDatasets.map(async path => {
      try {
        const response = await fetch(path)
        if (!response.ok) return null
        return await response.json()
      } catch {
        return null
      }
    })
  )
).filter(Boolean)

const localityAliases: Record<string,string> = {
'Hukerenui':'Hūkerenui','Mokau':'Mōkau','Okaihau':'Ōkaihau',
'Okura':'Ōkura','Puhipuhi':'Puhi Puhi','Ruakaka':'Ruakākā',
'Taupo Bay':'Taupō Bay','Whangarei':'Whangārei',
'Whangarei Heads':'Whangārei Heads',
}

export const locatedParticipants: readonly LocatedParticipant[] =
  seeds.flatMap(seed => (seed.participants as SeedParticipant[])).flatMap(p =>
    (p.mapLocalities?.length ? p.mapLocalities : (p.localities ?? (p.locality ? [p.locality] : []))).map(locality => ({
      id: p.id, name: p.name, locality: localityAliases[locality] ?? locality,
      type: p.entityType ?? p.populationClass ?? 'Participant', sourceUrl: p.sources?.[0],
      relationship: p.relationship, summary: p.summary,
      activities: p.activities, detail: p.detail,
      website: p.website ?? undefined, status: 'located' as const,
    }))
  )

export const loadLocatedParticipants = async (locality: string) =>
  locatedParticipants.filter(p => p.locality === locality)
