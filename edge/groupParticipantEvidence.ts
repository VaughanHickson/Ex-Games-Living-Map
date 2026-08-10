import type { ParticipantEvidence } from './participantEvidence.ts'
import type { ParticipantEntityCandidate } from './participantEntityCandidate.ts'
import { inferParticipantEntityName } from './inferParticipantEntity.ts'

const cleanHost = (url: string) => {
  const host = new URL(url).hostname
  return host.slice(0, 4) === String.fromCharCode(119, 119, 119, 46) ? host.slice(4) : host
}

const sharedHost = (host: string) =>
  ['facebook.com', 'instagram.com', 'linkedin.com'].includes(host)

export const groupParticipantEvidence = (
  locality: string,
  evidence: readonly ParticipantEvidence[],
): ParticipantEntityCandidate[] => {
  const groups = new Map<string, ParticipantEntityCandidate>()

  for (const item of evidence) {
    const name = inferParticipantEntityName(item.title, locality)
    const key = name.toLowerCase()
    const exact = groups.get(key)
    if (exact) {
      exact.evidence.push(item)
      continue
    }

    const host = cleanHost(item.url)
    const hostGroup = !sharedHost(host)
      ? [...groups.values()].find((g) =>
          g.evidence.some((e) => cleanHost(e.url) === host)
        )
      : undefined

    if (hostGroup) hostGroup.evidence.push(item)
    else groups.set(key, { name, locality, evidence: [item] })
  }

  return [...groups.values()]
}
