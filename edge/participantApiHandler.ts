import { bunnyParticipantDiscovery } from './bunnyParticipantDiscovery.ts'

export const handleParticipantRequest = async (
  request: Request,
) => {
  const url = new URL(request.url)
  const locality = url.searchParams.get('locality') ?? ''

  const participants =
    await bunnyParticipantDiscovery.discover({ locality })

  return Response.json(participants, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': 'https://ex-games-living-map.b-cdn.net',
    },
  })
}
