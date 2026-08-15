import type { LocatedParticipant } from '../potentialParticipants'

export type ParticipantSearchKind = 'individual' | 'group' | 'any'

export type ParticipantMatchOutcome =
  | 'EXISTING_MATCH'
  | 'POSSIBLE_MATCH'
  | 'MULTIPLE_MATCHES'
  | 'NO_MATCH'

export type ParticipantMatchConfidence =
  | 'strong'
  | 'possible'
  | 'ambiguous'
  | 'none'

export interface ParticipantSearchRequest {
  kind?: ParticipantSearchKind
  name: string
  locality?: string
  region?: string
}

export interface ParticipantSearchCandidate {
  participant: LocatedParticipant
  confidence: Exclude<ParticipantMatchConfidence, 'none'>
  reasons: readonly string[]
}

export interface ParticipantSearchResult {
  outcome: ParticipantMatchOutcome
  confidence: ParticipantMatchConfidence
  candidates: readonly ParticipantSearchCandidate[]
  request: ParticipantSearchRequest
}
