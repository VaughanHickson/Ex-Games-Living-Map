import type { ParticipantEntityCandidate } from './participantEntityCandidate.ts'

export const isEligibleParticipantEntity = (
  candidate: ParticipantEntityCandidate,
): boolean => {
  const name = candidate.name.toLowerCase()
  const place = candidate.locality.toLowerCase()

  const entityCues = [
    'association', 'community group', 'trust', 'conservation',
    'environmental', 'predator free', 'pest free', 'pest control',
    'school', 'limited', ' ltd', 'society', 'foundation',
  ]

  const entityLike = entityCues.some((cue) => name.includes(cue))
  if (!entityLike) return false

  if (name.includes(place)) return true

  return candidate.evidence.some((item) => {
    const title = item.title.toLowerCase()
    const text = item.content.toLowerCase()

    return title.includes(place) ||
      text.includes(`, ${place},`) ||
      text.includes(`in ${place}, new zealand`)
  })
}
