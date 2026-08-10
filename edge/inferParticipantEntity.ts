export const inferParticipantEntityName = (
  title: string,
): string => {
  const clean = title.replace(/\s+/g, ' ').trim()

  const pipe = clean.split(' | ')
  if (pipe.length > 1) return pipe[pipe.length - 1].trim()

  const dash = clean.split(' - ')
  if (dash.length > 1) return dash[dash.length - 1].trim()

  return clean
}
