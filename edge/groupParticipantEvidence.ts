import type { ParticipantEvidence } from './participantEvidence.ts'
import type { ParticipantEntityCandidate } from './participantEntityCandidate.ts'
import { inferParticipantEntityName } from './inferParticipantEntity.ts'

export const groupParticipantEvidence = (
  locality: string,
  evidence: readonly ParticipantEvidence[],
): ParticipantEntityCandidate[] => {
  const groups = new Map<string, ParticipantEntityCandidate>()

  for (const item of evidence) {
    const name = inferParticipantEntityName(item.title, locality)
    const key = name.toLowerCase()
    const exact = groups.get(key)

    if (exact) exact.evidence.push(item)
    else groups.set(key, { name, locality, evidence: [item] })
  }

  return [...groups.values()]
}
