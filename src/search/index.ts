import { locatedParticipants, type LocatedParticipant } from '../potentialParticipants'

export interface ParticipantSearchIndexEntry {
  participant: LocatedParticipant
  name: string
  locality: string
  type: string
  searchText: string
}

export const buildParticipantSearchIndex = (
  participants: readonly LocatedParticipant[] = locatedParticipants,
): readonly ParticipantSearchIndexEntry[] =>
  participants.map((p) => ({
    participant: p,
    name: p.name,
    locality: p.locality,
    type: p.type,
    searchText: [p.name, p.locality, p.type, p.relationship, p.summary,
      p.detail, p.website, ...(p.activities ?? [])].filter(Boolean).join(' '),
  }))

export const participantSearchIndex = buildParticipantSearchIndex()
export * from './types'
export * from './normalise'
export { searchParticipants } from './match'
export * from './registration-handoff'
