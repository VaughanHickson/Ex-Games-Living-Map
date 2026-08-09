import { bunnyParticipantDiscovery } from './bunnyParticipantDiscovery.ts'

declare const process: {
  env: Record<string, string | undefined>
  argv: string[]
}

const endpoint = process.env.SEARXNG_URL
if (!endpoint) throw new Error('SEARXNG_URL is required')

Object.assign(globalThis, {
  Deno: {
    env: {
      get: (name: string) =>
        name === 'SEARXNG_URL' ? endpoint : undefined,
    },
  },
})

const locality = process.argv[2] ?? 'Riverhead'
const results =
  await bunnyParticipantDiscovery.discover({ locality })

console.log(JSON.stringify(results, null, 2))
