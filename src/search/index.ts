import {
  locatedParticipants,
  type LocatedParticipant,
} from '../potentialParticipants'

export interface ParticipantSearchIndexEntry {
  participant: LocatedParticipant
  name: string
  locality: string
  type: string
}

export const buildParticipantSearchIndex = (
  participants: readonly LocatedParticipant[] = locatedParticipants,
): readonly ParticipantSearchIndexEntry[] =>
  participants.map((participant) => ({
    participant,
    name: participant.name,
    locality: participant.locality,
    type: participant.type,
  }))

export const participantSearchIndex = buildParticipantSearchIndex()

export * from './types'
export * from './normalise'

export { searchParticipants } from './match'
