export interface ParticipantEvidence {
  title: string
  url: string
  content: string
}

export const toParticipantEvidence = (
  title: string,
  url: string,
  content?: string,
): ParticipantEvidence => ({
  title: title.trim(),
  url,
  content: (content ?? '').trim(),
})
