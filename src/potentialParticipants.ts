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

export const loadPotentialParticipants = async (locality: string) => {
  const encodedLocality = encodeURIComponent(locality)
  const endpoint = import.meta.env.DEV
    ? `/api/participants?locality=${encodedLocality}`
    : `https://mc-buom3p4wv3.bunny.run/api/participants?locality=${encodedLocality}`

  const response = await fetch(endpoint)

  if (!response.ok) {
    throw new Error(
      `Participant discovery load failed: ${response.status}`,
    )
  }

  return (await response.json()) as PotentialParticipant[]
}
