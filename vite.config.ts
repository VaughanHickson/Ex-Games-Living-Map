import { defineConfig } from 'vite'
import { cachedParticipantDiscovery } from './dev/cachedParticipantDiscovery.ts'

export default defineConfig({
  optimizeDeps: { exclude: ['maplibre-gl'] },
  plugins: [{
    name: 'participant-discovery-api',
    configureServer(server) {
      server.middlewares.use('/api/participants', async (req, res) => {
        const url = new URL(req.url ?? '', 'http:' + '//localhost')
        const locality = url.searchParams.get('locality') ?? ''
        const matches =
          await cachedParticipantDiscovery.discover({ locality })
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(matches))
      })
    },
  }],
})
