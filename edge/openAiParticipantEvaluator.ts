import type {
  ParticipantEvaluator,
  ParticipantEvaluationInput,
} from '../shared/participantEvaluator.ts'

declare const Deno: {
  env: { get(name: string): string | undefined }
}

const apiUrl = 'https://api.openai.com/v1/responses'

export const openAiParticipantEvaluator:
  ParticipantEvaluator = {
  async evaluate(input: ParticipantEvaluationInput) {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) throw new Error('OPENAI_API_KEY is required')

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.6-terra',
        input: [
          {
            role: 'system',
            content:
              `Evaluate candidate entities for the Ex Games Living Map.
Eligible candidates are identifiable organisations, groups, projects,
schools, trusts, businesses or people with credible ecological,
conservation, restoration, biodiversity, predator-control,
pest-management or community-environment activity relevant to the locality.
Reject directories, search-result pages, generic listings, articles that
merely mention an entity, and ordinary commercial services where the
evidence does not establish ecological or community-environment relevance.
Use only the supplied evidence. Do not infer unsupported relationships.
Score from 0 to 100 and explain the judgement concisely.`, 
          },
          {
            role: 'user',
            content: JSON.stringify(input),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'participant_evaluation',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                eligible: { type: 'boolean' },
                score: { type: 'number' },
                rationale: { type: 'string' },
                ecologicalRelationship: { type: 'string' },
                localityRelationship: { type: 'string' },
                evidenceUrls: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: [
                'eligible', 'score', 'rationale',
                'ecologicalRelationship',
                'localityRelationship', 'evidenceUrls',
              ],
              additionalProperties: false,
            },
          },
        },
      }),
    })

    if (!response.ok)
      throw new Error(`Evaluator failed: ${response.status}`)

    const data = await response.json()
    const text = data.output
      ?.flatMap((item: any) => item.content ?? [])
      .find((item: any) => item.type === 'output_text')
      ?.text

    if (!text) throw new Error('Evaluator returned no text output')
    return JSON.parse(text)
  },
}
