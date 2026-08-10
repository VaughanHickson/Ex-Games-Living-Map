import { handleParticipantRequest } from '../../edge/participantApiHandler.ts'
import { runParticipantEvaluatorCheck } from '../../edge/participantEvaluatorCheck.ts'

const port = Number(Deno.env.get('PORT') ?? '8080')

Deno.serve({ port }, async (request) => {
  const url = new URL(request.url)

  if (url.pathname === '/api/participants') {
    return handleParticipantRequest(request)
  }

  if (url.pathname === '/api/evaluator-check') {
  const expected = Deno.env.get('EVALUATOR_CHECK_TOKEN')
  const supplied = request.headers.get('x-evaluator-check')
  if (!expected || supplied !== expected)
    return new Response('Forbidden', { status: 403 })
  return Response.json(await runParticipantEvaluatorCheck())
}

if (url.pathname === '/health') {
    return new Response('ok')
  }

  return new Response('Not Found', { status: 404 })
})
