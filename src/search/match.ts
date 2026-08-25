import type {
  ParticipantSearchCandidate,
  ParticipantSearchRequest,
  ParticipantSearchResult,
} from './types'

import { buildParticipantSearchIndex } from './index'
import { locatedParticipants, type LocatedParticipant } from '../potentialParticipants'
import { normaliseSearchText, sameSearchText, searchTokens } from './normalise'

const matchCandidate = (
  request: ParticipantSearchRequest,
  participants: readonly LocatedParticipant[],
): readonly ParticipantSearchCandidate[] => {
  const name = normaliseSearchText(request.name)
  const locality = normaliseSearchText(request.locality)
  const tokens = searchTokens(request.name)
  return buildParticipantSearchIndex(participants)
    .filter((entry) => {
      if (request.region && entry.region !== request.region) return false
      const haystack = normaliseSearchText(entry.searchText)
      return tokens.length > 0 && tokens.every((token) => haystack.includes(token))
    })
    .map((entry) => {
      const reasons: string[] = []
      if (sameSearchText(entry.name, request.name)) {
        reasons.push('exact name')
      } else if (normaliseSearchText(entry.name).includes(name)) {
        reasons.push('name contains search text')
      } else if (normaliseSearchText(entry.locality).includes(name)) {
        reasons.push('locality match')
      } else if (normaliseSearchText(entry.type).includes(name)) {
        reasons.push('participant type match')
      } else {
        reasons.push('profile information match')
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
  participants: readonly LocatedParticipant[] = locatedParticipants,
): ParticipantSearchResult => {
  const candidates = matchCandidate(request, participants)

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
