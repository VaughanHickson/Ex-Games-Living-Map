import type {
  ParticipantDiscoveryAdapter,
} from '../shared/participantDiscoveryAdapter.ts'
import { searchSearxng } from './searxngSearch.ts'
import { qualifiesParticipantResult } from './qualifyParticipantResult.ts'
import { toParticipantEvidence } from './participantEvidence.ts'

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
      if (!qualifiesParticipantResult(result)) return false
      const url = result.url!
      if (seen.has(url)) return false
      seen.add(url)
      return true
    })

    const evidence = usable.map((result) =>
      toParticipantEvidence(result.title!, result.url!, result.content),
    )

    return evidence.slice(0, 10).map((item) => ({
      id: slugify(item.title),
      name: item.title,
      locality,
      type: 'Potential participant',
      sourceUrl: item.url,
      sourceUrls: [item.url],
      status: 'potential',
    }))
  },
}
