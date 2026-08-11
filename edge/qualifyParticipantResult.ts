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
  if (url.includes('instagram.com/p/')) return false
  if (url.includes('instagram.com/reel/')) return false
  if (title.startsWith('response id ')) return false
  if (title.includes('general businesses')) return false
  if (title.includes('business directory')) return false
  if (title.includes('local guide')) return false
  if (title.includes('suburb guide')) return false
  if (title.includes('schools, lifestyle')) return false
  if (title.includes('things to do')) return false

  return true
}
