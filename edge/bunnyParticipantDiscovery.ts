import type {
  ParticipantDiscoveryAdapter,
} from '../shared/participantDiscoveryAdapter.ts'
import { searchSearxng } from './searxngSearch.ts'
import { qualifiesParticipantResult } from './qualifyParticipantResult.ts'
import { toParticipantEvidence } from './participantEvidence.ts'
import { scoreParticipantEvidence } from './scoreParticipantEvidence.ts'
import { groupParticipantEvidence } from './groupParticipantEvidence.ts'
import { isEligibleParticipantEntity } from './isEligibleParticipantEntity.ts'
import { openAiParticipantEvaluator } from './openAiParticipantEvaluator.ts'
import type { ParticipantEvaluation } from '../shared/participantEvaluation.ts'
import type { ParticipantEntityCandidate } from './participantEntityCandidate.ts'

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const formatParticipant = (
  candidate: ParticipantEntityCandidate,
  locality: string,
  evaluation?: ParticipantEvaluation,
) => ({
  id: slugify(candidate.name),
  name: candidate.name,
  locality,
  type: 'Potential participant',
  sourceUrl: candidate.evidence[0].url,
  sourceUrls: candidate.evidence.map((item) => item.url),
  status: 'potential' as const,
  evaluation,
})

export const bunnyParticipantDiscovery:
  ParticipantDiscoveryAdapter = {
  async discover({ locality }) {
    const queries = [
      `${locality} Auckland New Zealand pest control`,
      `${locality} Auckland New Zealand predator control`,
      `${locality} Auckland New Zealand conservation`,
      `${locality} Auckland New Zealand biodiversity restoration`,
      `${locality} Auckland New Zealand environmental trust`,
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
      .filter(isEligibleParticipantEntity)
      .slice(0, 10)

    try {
      const judged = await Promise.all(
        candidates.map(async (candidate) => ({
          candidate,
          evaluation: await openAiParticipantEvaluator.evaluate(candidate),
        })),
      )

      return judged
        .filter(({ evaluation }) => evaluation.eligible)
        .sort((a, b) => b.evaluation.score - a.evaluation.score)
        .map(({ candidate, evaluation }) =>
          formatParticipant(candidate, locality, evaluation)
        )
    } catch (error) {
      console.warn('Participant evaluator unavailable.', error)
      return candidates.map((candidate) =>
        formatParticipant(candidate, locality)
      )
    }
  },
}
