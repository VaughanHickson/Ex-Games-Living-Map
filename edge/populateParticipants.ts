import { readFileSync, writeFileSync } from 'node:fs'
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

const ledgerPath = 'public/data/participant-population-ledger.json'
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'))

for (const locality of process.argv.slice(2)) {
  const prior = ledger.localities[locality]
  if (prior?.status === 'COMPLETE' || prior?.status === 'ZERO_CONFIRMED') {
    console.log(JSON.stringify({ locality, status: 'SKIPPED', prior: prior.status }))
    continue
  }
  try {
    const results = await bunnyParticipantDiscovery.discover({ locality })
    ledger.localities[locality] = { status: results.length ? 'COMPLETE' : 'ZERO_CONFIRMED', count: results.length }
    writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n')
    console.log(JSON.stringify({ locality, status: ledger.localities[locality].status, count: results.length }))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    ledger.localities[locality] = { status: 'RETRY_REQUIRED', error: message }
    writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n')
    console.log(JSON.stringify({ locality, status: 'RETRY_REQUIRED', error: message }))
  }
}
