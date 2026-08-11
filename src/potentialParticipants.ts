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
  locality?: string
  sources?: string[]
  relationship?: string
  summary?: string
  activities?: string[]
  detail?: string
  website?: string | null
}

const seed = await fetch('/data/participants-auckland-located-001.json').then(r => r.json())

export const locatedParticipants: readonly LocatedParticipant[] =
  (seed.participants as SeedParticipant[]).flatMap(p =>
    (p.localities ?? (p.locality ? [p.locality] : [])).map(locality => ({
      id: p.id, name: p.name, locality,
      type: p.entityType ?? p.populationClass ?? 'Participant', sourceUrl: p.sources?.[0],
      relationship: p.relationship, summary: p.summary,
      activities: p.activities, detail: p.detail,
      website: p.website ?? undefined, status: 'located' as const,
    }))
  )

export const loadLocatedParticipants = async (locality: string) =>
  locatedParticipants.filter(p => p.locality === locality)
