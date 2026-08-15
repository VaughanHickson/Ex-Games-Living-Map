export const normaliseSearchText = (value: string | undefined): string =>
  (value ?? '')
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')

export const searchTokens = (
  value: string | undefined,
): readonly string[] =>
  normaliseSearchText(value)
    .split(' ')
    .filter(Boolean)

export const sameSearchText = (
  left: string | undefined,
  right: string | undefined,
): boolean => {
  const a = normaliseSearchText(left)
  const b = normaliseSearchText(right)

  return Boolean(a && b && a === b)
}
