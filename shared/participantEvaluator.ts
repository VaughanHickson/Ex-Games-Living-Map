import type {
  ParticipantEvaluation,
} from './participantEvaluation.ts'

export interface ParticipantEvaluationInput {
  name: string
  locality: string
  evidence: readonly {
    title: string
    url: string
    content: string
  }[]
}

export interface ParticipantEvaluator {
  evaluate(
    input: ParticipantEvaluationInput,
  ): Promise<ParticipantEvaluation>
}
