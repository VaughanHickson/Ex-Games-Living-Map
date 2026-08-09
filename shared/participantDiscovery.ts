export interface PotentialParticipant {
  id: string
  name: string
  locality: string
  type: string
  website?: string
  sourceUrl?: string
  status: 'potential'
}

export const participantsForLocality = (
  participants: readonly PotentialParticipant[],
  locality: string,
) =>
  participants.filter(
    (participant) => participant.locality === locality,
  )
