import { handleParticipantRequest } from '../../edge/participantApiHandler.ts'

const port = Number(Deno.env.get('PORT') ?? '8080')

Deno.serve({ port }, async (request) => {
  const url = new URL(request.url)

  if (url.pathname === '/api/participants') {
    return handleParticipantRequest(request)
  }

  if (url.pathname === '/health') {
    return new Response('ok')
  }

  return new Response('Not Found', { status: 404 })
})
