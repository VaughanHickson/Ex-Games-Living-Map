import type {
  ParticipantDiscoveryAdapter,
} from '../shared/participantDiscoveryAdapter.ts'
import { searchSearxng } from './searxngSearch.ts'
import { qualifiesParticipantResult } from './qualifyParticipantResult.ts'
import { toParticipantEvidence } from './participantEvidence.ts'
import { scoreParticipantEvidence } from './scoreParticipantEvidence.ts'
import { groupParticipantEvidence } from './groupParticipantEvidence.ts'

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const bunnyParticipantDiscovery:
  ParticipantDiscoveryAdapter = {
  async discover({ locality }) {
    const queries = [
      `${locality} pest control`,
      `${locality} predator control`,
      `${locality} conservation`,
      `${locality} biodiversity restoration`,
      `${locality} environmental trust`,
    ]

    const batches = await Promise.all(
      queries.map((query) => searchSearxng(query)),
    )
    const results = batches.flat()

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

    const rankedEvidence = evidence
      .map((item) => ({ item, score: scoreParticipantEvidence(locality, item) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item)

    const candidates = groupParticipantEvidence(locality, rankedEvidence)

    return candidates.slice(0, 10).map((candidate) => ({
      id: slugify(candidate.name),
      name: candidate.name,
      locality,
      type: 'Potential participant',
      sourceUrl: candidate.evidence[0].url,
      sourceUrls: candidate.evidence.map((item) => item.url),
      status: 'potential',
    }))
  },
}
