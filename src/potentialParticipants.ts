export interface PotentialParticipant {
  id: string
  name: string
  locality: string
  type: string
  website?: string
  sourceUrl?: string
  status: 'potential'
}

import { riverheadParticipants } from './participants'

export const potentialParticipants: readonly PotentialParticipant[] =
  riverheadParticipants.map((participant) => ({
    id: participant.id,
    name: participant.name,
    locality: participant.locality,
    type: participant.type,
    website: participant.website,
    sourceUrl: participant.website,
    status: 'potential',
  }))
