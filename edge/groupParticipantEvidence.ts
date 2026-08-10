import type { ParticipantEvidence } from './participantEvidence.ts'
import type { ParticipantEntityCandidate } from './participantEntityCandidate.ts'
import { inferParticipantEntityName } from './inferParticipantEntity.ts'

const cleanHost = (url: string) => {
  const host = new URL(url).hostname
  return host.slice(0, 4) === String.fromCharCode(119, 119, 119, 46) ? host.slice(4) : host
}

export const groupParticipantEvidence = (
  locality: string,
  evidence: readonly ParticipantEvidence[],
): ParticipantEntityCandidate[] => {
  const groups = new Map<string, ParticipantEntityCandidate>()

  for (const item of evidence) {
    const host = cleanHost(item.url)
    const name = inferParticipantEntityName(item.title, locality)
    const local = name.toLowerCase().includes(locality.toLowerCase())

    const hostGroup = [...groups.values()].find((g) =>
      g.evidence.some((e) => cleanHost(e.url) === host)
      && g.name.toLowerCase().includes(locality.toLowerCase())
    )

    if (!local && hostGroup) hostGroup.evidence.push(item)
    else groups.set(name.toLowerCase(), { name, locality, evidence: [item] })
  }

  return [...groups.values()]
}
