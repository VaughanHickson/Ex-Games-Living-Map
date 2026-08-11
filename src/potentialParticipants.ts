export interface PotentialParticipant {
  id: string
  name: string
  locality: string
  type: string
  website?: string
  sourceUrl?: string
  status: 'potential'
}

type SeedParticipant = {
  id: string
  name: string
  entityType: string
  status: 'potential'
  localities: string[]
  sources?: string[]
}

const seed = await fetch('/data/participants-auckland.json').then(r => r.json())

export const potentialParticipants: readonly PotentialParticipant[] =
  (seed.participants as SeedParticipant[]).flatMap(p =>
    p.localities.map(locality => ({
      id: p.id, name: p.name, locality,
      type: p.entityType, sourceUrl: p.sources?.[0], status: 'potential' as const,
    }))
  )

export const loadPotentialParticipants = async (locality: string) =>
  potentialParticipants.filter(p => p.locality === locality)
