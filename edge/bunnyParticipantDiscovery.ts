import type {
  ParticipantDiscoveryAdapter,
} from '../shared/participantDiscoveryAdapter.ts'

export const bunnyParticipantDiscovery:
  ParticipantDiscoveryAdapter = {
  async discover({ locality }) {
    console.info(
      `Bunny participant discovery requested for ${locality}`,
    )
    return []
  },
}
