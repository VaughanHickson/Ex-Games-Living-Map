import type {
  ParticipantDiscoveryAdapter,
} from '../shared/participantDiscoveryAdapter.ts'
import { searchSearxng } from './searxngSearch.ts'

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const bunnyParticipantDiscovery:
  ParticipantDiscoveryAdapter = {
  async discover({ locality }) {
    const results = await searchSearxng(
      `${locality} Auckland organisation community business conservation`
    )

    const seen = new Set<string>()
    const usable = results.filter((result) => {
      if (!result.title || !result.url) return false
      if (seen.has(result.url)) return false
      seen.add(result.url)
      return true
    })

    return usable.slice(0, 10).map((result) => ({
      id: slugify(result.title!),
      name: result.title!,
      locality,
      type: 'Potential participant',
      sourceUrl: result.url,
      status: 'potential',
    }))
  },
}
