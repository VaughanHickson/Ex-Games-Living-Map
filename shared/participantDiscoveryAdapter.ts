import type {
  PotentialParticipant,
} from './participantDiscovery.ts'

export interface ParticipantDiscoveryRequest {
  locality: string
}

export interface ParticipantDiscoveryAdapter {
  discover(
    request: ParticipantDiscoveryRequest,
  ): Promise<readonly PotentialParticipant[]>
}
