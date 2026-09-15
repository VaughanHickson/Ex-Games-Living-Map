import { locatedParticipants, participantLocalities, areaIndex, type LocatedParticipant } from '../potentialParticipants'

import { uniqueParticipants } from '../participant-model'

export interface ParticipantSearchIndexEntry {
  participant: LocatedParticipant
  name: string
  locality: string
  region: string
  regions: readonly string[]
  localities: readonly string[]
  type: string
  searchText: string
}

export const buildParticipantSearchIndex = (
  participants: readonly LocatedParticipant[] = locatedParticipants,
): readonly ParticipantSearchIndexEntry[] =>
  uniqueParticipants(participants).map((p) => ({
    participant: p,
    name: p.name,
    locality: p.locality,
    region: p.region,
    regions: [...new Set([p.region, ...participantLocalities(p.id).map(m => m.region), ...areaIndex.areasForParticipant(p.id).map(a => a.region)])],
    localities: [...new Set([p.locality, ...participantLocalities(p.id).map(m => m.locality)])],
    type: p.type,
    searchText: [p.name, p.locality, p.type, p.relationship, p.summary,
      p.detail, p.website, ...(p.activities ?? []), ...participantLocalities(p.id).map(m => m.locality), ...areaIndex.areasForParticipant(p.id).map(a => a.name)].filter(Boolean).join(' '),
  }))

export const participantSearchIndex = buildParticipantSearchIndex()
export * from './types'
export * from './normalise'
export { searchParticipants } from './match'
export * from './registration-handoff'
