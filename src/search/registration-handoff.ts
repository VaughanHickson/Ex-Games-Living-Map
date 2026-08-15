import type { ParticipantSearchResult } from './types'

export interface RegistrationHandoffDraft {
  registrantUserId: string
  proposed: {
    name: string
    kind?: string
    locality?: string
    region?: string
    activities?: readonly string[]
    website?: string
  }
  privateDetails?: {
    email?: string
    phone?: string
    address?: string
  }
  matchResult: ParticipantSearchResult
}

export type RegistrationHandoffAction =
  | 'ENDORSE_EXISTING'
  | 'REVIEW_POSSIBLE'
  | 'START_REGISTRATION'

export const registrationHandoffAction = (
  result: ParticipantSearchResult,
): RegistrationHandoffAction => {
  if (result.outcome === 'EXISTING_MATCH') {
    return 'ENDORSE_EXISTING'
  }

  if (
    result.outcome === 'POSSIBLE_MATCH' ||
    result.outcome === 'MULTIPLE_MATCHES'
  ) {
    return 'REVIEW_POSSIBLE'
  }

  return 'START_REGISTRATION'
}

export type PlatformMatchCategory =
  | 'existing_match'
  | 'possible_match'
  | 'multiple_possible'
  | 'no_match'

export const toPlatformMatchCategory = (
  result: ParticipantSearchResult,
): PlatformMatchCategory => {
  if (result.outcome === 'EXISTING_MATCH') return 'existing_match'
  if (result.outcome === 'POSSIBLE_MATCH') return 'possible_match'
  if (result.outcome === 'MULTIPLE_MATCHES') return 'multiple_possible'
  return 'no_match'
}

export const buildRegistrationHandoff = (
  draft: RegistrationHandoffDraft,
) => ({
  registrantUserId: draft.registrantUserId,
  proposed: draft.proposed,
  privateDetails: draft.privateDetails,
  matchCategory: toPlatformMatchCategory(draft.matchResult),
  action: registrationHandoffAction(draft.matchResult),
})
