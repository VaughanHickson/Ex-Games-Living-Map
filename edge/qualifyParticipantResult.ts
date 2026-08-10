import type { SearxngResult } from './searxngTypes.ts'

export const qualifiesParticipantResult = (
  result: SearxngResult,
): boolean => {
  if (!result.title || !result.url) return false

  const url = result.url.toLowerCase()
  const title = result.title.toLowerCase()

  if (url.endsWith('.pdf')) return false
  if (url.includes('wikipedia.org')) return false
  if (url.includes('seek.com')) return false
  if (url.includes('eventfinda.co.nz')) return false
  if (url.includes('treasury.govt.nz/publications/consultation')) return false
  if (url.includes('instagram.com/p/') || url.includes('instagram.com/reel/')) return false
  if (title.startsWith('response id ')) return false

  return true
}
