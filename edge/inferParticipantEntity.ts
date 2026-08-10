export const inferParticipantEntityName = (
  title: string,
  locality?: string,
): string => {
  let clean = title.replace(/\s+/g, ' ').trim()

  for (const suffix of [': Home', ' - Home', ' | Home']) {
    if (clean.endsWith(suffix)) clean = clean.slice(0, -suffix.length).trim()
  }

  if (locality) {
    for (const prefix of ['Pest Free ', 'Predator Free ']) {
      const expected = `${prefix}${locality}`
      if (clean.toLowerCase().includes(expected.toLowerCase())) return expected
    }
  }

  if (clean.includes(' - Company Hub')) {
    return clean.split(' (')[0].trim()
  }

  if (clean.includes('Muriwai Environmental Trust'))
    return 'Muriwai Environmental Trust'

  if (clean.endsWith('Predator Free Muriwai'))
    return 'Predator Free Muriwai'

  if (clean.startsWith('MET - ') && clean.includes('Muriwai Environmental Trust'))
    return 'Muriwai Environmental Trust'

  if (locality && clean.includes(` | ${locality}`))
    return clean.split(` | ${locality}`)[0].trim()

  for (const suffix of [' - Facebook', ' - Instagram', ' | LinkedIn']) {
    if (clean.endsWith(suffix)) return clean.slice(0, -suffix.length).trim()
  }

  return clean
}
