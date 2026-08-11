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

const seeds = await Promise.all([
fetch('/data/participants-auckland-located-001.json').then(r => r.json()),
fetch('/data/participants-northland-located-001.json').then(r => r.json()),
])

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
