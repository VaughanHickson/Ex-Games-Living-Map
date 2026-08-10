import type {
  ParticipantEvidence,
} from './participantEvidence.ts'

export interface ParticipantEntityCandidate {
  name: string
  locality: string
  evidence: ParticipantEvidence[]
}
