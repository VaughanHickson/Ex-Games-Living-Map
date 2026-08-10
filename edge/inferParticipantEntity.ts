export const inferParticipantEntityName = (
  title: string,
  locality?: string,
): string => {
  const clean = title.replace(/\s+/g, ' ').trim()

  if (locality) {
    const lower = clean.toLowerCase()
    for (const prefix of ['Pest Free ', 'Predator Free ']) {
      const expected = `${prefix}${locality}`
      if (lower.includes(expected.toLowerCase())) return expected
    }
  }

  const social =
    clean.match(/^(.*?)\s+(?:-|[|])\s+(Facebook|Instagram|LinkedIn)$/i)
  if (social) return social[1].trim()

  const pipe = clean.split(' | ')
  if (pipe.length > 1) return pipe[pipe.length - 1].trim()

  const dash = clean.split(' - ')
  if (dash.length === 2) return dash[1].trim()

  return clean
}
