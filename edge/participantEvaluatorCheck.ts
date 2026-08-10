import { openAiParticipantEvaluator } from './openAiParticipantEvaluator.ts'

const cases = [
  {
    name: 'Kahu Conservation',
    locality: 'Waimauku',
    evidence: [{
      title: 'Kahu Conservation - Facebook',
      url: 'https://www.facebook.com/kahu.conservation/',
      content: 'Conservation activity associated with Waimauku, Auckland.',
    }],
  },
  {
    name: 'Pest Control - Household - General Businesses in Waimauku',
    locality: 'Waimauku',
    evidence: [{
      title: 'Pest Control - Household - General Businesses in Waimauku',
      url: 'https://www.finda.co.nz/pest-control/waimauku/',
      content: 'Directory of pest control businesses in Waimauku.',
    }],
  },
]

export const runParticipantEvaluatorCheck = async () =>
  Promise.all(
    cases.map(async (candidate) => ({
      candidate: candidate.name,
      evaluation:
        await openAiParticipantEvaluator.evaluate(candidate),
    })),
  )
