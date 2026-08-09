import { bunnyParticipantDiscovery } from './bunnyParticipantDiscovery.ts'

globalThis.Deno = {
  env: { get: () => 'http:' + '//search.test' },
} as typeof Deno

globalThis.fetch = async () => Response.json({
  results: [
    {
      title: 'Riverhead School',
      url: 'https:' + '//school.test',
      content: 'Riverhead Auckland community school',
    },
    {
      title: 'Riverhead School',
      url: 'https:' + '//school.test',
      content: 'duplicate',
    },
    {
      title: 'Bob Possum Removal Ltd',
      url: 'https:' + '//bob.test',
      content: 'Auckland pest control services',
    },
  ],
})

const results =
  await bunnyParticipantDiscovery.discover({
    locality: 'Riverhead',
  })

console.log(JSON.stringify(results, null, 2))
