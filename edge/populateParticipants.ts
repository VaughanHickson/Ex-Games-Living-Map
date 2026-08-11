import { bunnyParticipantDiscovery } from './bunnyParticipantDiscovery.ts'

declare const process: {
  env: Record<string, string | undefined>
  argv: string[]
}

const endpoint = process.env.SEARXNG_URL
if (!endpoint) throw new Error('SEARXNG_URL is required')

Object.assign(globalThis, {
  Deno: { env: { get: () => endpoint } },
})

for (const locality of process.argv.slice(2)) {
  try {
    const results = await bunnyParticipantDiscovery.discover({ locality })
    console.log(JSON.stringify({
      locality, status: 'COMPLETE', count: results.length, results,
    }))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log(JSON.stringify({
      locality, status: 'RETRY_REQUIRED', error: message,
    }))
  }
}
