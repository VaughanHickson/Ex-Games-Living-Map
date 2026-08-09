import { defineConfig } from 'vite'
import { readFile } from 'node:fs/promises'
import { participantsForLocality } from './shared/participantDiscovery.ts'

export default defineConfig({
  optimizeDeps: { exclude: ['maplibre-gl'] },
  plugins: [{
    name: 'participant-discovery-api',
    configureServer(server) {
      server.middlewares.use('/api/participants', async (req, res) => {
        const url = new URL(req.url ?? '', 'http:' + '//localhost')
        const locality = url.searchParams.get('locality') ?? ''
        const raw = await readFile(
          'public/data/potential-participants.json', 'utf8'
        )
        const all = JSON.parse(raw)
        const matches = participantsForLocality(
          all,
          locality,
        )
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(matches))
      })
    },
  }],
})
