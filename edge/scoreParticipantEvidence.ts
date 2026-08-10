import type { ParticipantEvidence } from './participantEvidence.ts'

export const scoreParticipantEvidence = (
  locality: string,
  item: ParticipantEvidence,
): number => {
  const text = `${item.title} ${item.content}`.toLowerCase()
  const url = item.url.toLowerCase()
  const place = locality.toLowerCase()
  let score = 0

  if (item.title.toLowerCase().includes(place)) score += 5
  else if (text.includes(place)) score += 3

  for (const cue of [
    'association', 'community group', 'school', 'trust',
    'club', 'society', 'foundation', 'organisation',
    'business', 'collective', 'grapevine',
  ]) if (text.includes(cue)) score += 2

  for (const cue of [
    '.pdf', '/media/', '/docs/', '/document', '/attachment',
    '/notice/', '/consultation/', '/posts/', '/videos/',
    'report', 'strategy', 'work programme', 'response id',
  ]) if (url.includes(cue) || text.includes(cue)) score -= 5

  return score
}
