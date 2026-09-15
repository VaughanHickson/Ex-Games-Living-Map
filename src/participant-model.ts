export interface LocatedParticipant {
  id: string
  name: string
  locality: string
  region: string
  type: string
  website?: string
  sourceUrl?: string
  status: 'located'
  relationship?: string
  summary?: string
  activities?: string[]
  detail?: string
}

export interface SeedParticipant {
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

export interface LocalityMembership { region: string; locality: string }

const localityAliases: Record<string, string> = {
  'Hukerenui':'Hūkerenui','Mokau':'Mōkau','Okaihau':'Ōkaihau',
  'Okura':'Ōkura','Puhipuhi':'Puhi Puhi','Ruakaka':'Ruakākā',
  'Taupo Bay':'Taupō Bay','Whangarei':'Whangārei',
  'Whangarei Heads':'Whangārei Heads',
}

/** Compatibility projection of existing regional/locality datasets, not new geography. */
export function buildParticipantRegistry(seeds: readonly { region: string; participants: SeedParticipant[] }[]) {
  const byId = new Map<string, LocatedParticipant>()
  const localityMemberships = new Map<string, LocalityMembership[]>()
  for (const seed of seeds) for (const p of seed.participants) {
    if (!p.id || !p.name || p.status !== 'located') throw new Error('Invalid participant identity/state')
    const previous = byId.get(p.id)
    if (previous && previous.name !== p.name) throw new Error(`Conflicting participant identity: ${p.id}`)
    const names = p.mapLocalities?.length ? p.mapLocalities
      : (p.localities ?? (p.locality ? [p.locality] : []))
    const memberships = localityMemberships.get(p.id) ?? []
    for (const name of names.length ? names : ['']) {
      const locality = localityAliases[name] ?? name
      if (!memberships.some(m => m.region === seed.region && m.locality === locality)) {
        memberships.push({ region: seed.region, locality })
      }
    }
    localityMemberships.set(p.id, memberships)
    if (!previous) byId.set(p.id, {
      id: p.id, name: p.name, locality: memberships[0].locality, region: seed.region,
      type: p.entityType ?? p.populationClass ?? 'Participant', status: 'located',
      sourceUrl: p.sources?.[0], relationship: p.relationship, summary: p.summary,
      activities: p.activities, detail: p.detail, website: p.website ?? undefined,
    })
  }
  return { participants: [...byId.values()], localityMemberships }
}

export function uniqueParticipants(participants: readonly LocatedParticipant[]) {
  return [...new Map(participants.map(p => [p.id, p])).values()]
}
