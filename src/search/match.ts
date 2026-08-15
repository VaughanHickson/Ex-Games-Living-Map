import type {
  ParticipantSearchCandidate,
  ParticipantSearchRequest,
  ParticipantSearchResult,
} from './types'

import { participantSearchIndex } from './index'
import { normaliseSearchText, sameSearchText } from './normalise'

const matchCandidate = (
  request: ParticipantSearchRequest,
): readonly ParticipantSearchCandidate[] => {
  const name = normaliseSearchText(request.name)
  const locality = normaliseSearchText(request.locality)
  return participantSearchIndex
    .filter((entry) => normaliseSearchText(entry.name).includes(name))
    .map((entry) => {
      const reasons: string[] = []
      if (sameSearchText(entry.name, request.name)) {
        reasons.push('exact name')
      } else {
        reasons.push('name contains search text')
      }

      const exactName = sameSearchText(entry.name, request.name)
      const sameLocality = locality
        ? sameSearchText(entry.locality, locality)
        : false

      if (sameLocality) {
        reasons.push('same locality')
      }

      return {
        participant: entry.participant,
        confidence: exactName && (!locality || sameLocality)
          ? 'strong'
          : 'possible',
        reasons,
      }
    })
}

export const searchParticipants = (
  request: ParticipantSearchRequest,
): ParticipantSearchResult => {
  const candidates = matchCandidate(request)

  if (!candidates.length) {
    return {
      outcome: 'NO_MATCH',
      confidence: 'none',
      candidates: [],
      request,
    }
  }

  const strong = candidates.filter(
    (candidate) => candidate.confidence === 'strong',
  )

  if (strong.length === 1) {
    return {
      outcome: 'EXISTING_MATCH',
      confidence: 'strong',
      candidates: strong,
      request,
    }
  }

  if (strong.length > 1) {
    return {
      outcome: 'MULTIPLE_MATCHES',
      confidence: 'ambiguous',
      candidates: strong,
      request,
    }
  }

  if (candidates.length === 1) {
    return {
      outcome: 'POSSIBLE_MATCH',
      confidence: 'possible',
      candidates,
      request,
    }
  }

  return {
    outcome: 'MULTIPLE_MATCHES',
    confidence: 'ambiguous',
    candidates,
    request,
  }
}
