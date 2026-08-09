import type {
  SearxngResponse,
  SearxngResult,
} from './searxngTypes.ts'

declare const Deno: {
  env: { get(name: string): string | undefined }
}

export const searchSearxng = async (
  query: string,
): Promise<readonly SearxngResult[]> => {
  const baseUrl = Deno.env.get('SEARXNG_URL')
  if (!baseUrl) return []

  const url = new URL('/search', baseUrl)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')

  const response = await fetch(url)
  if (!response.ok) return []

  const data = await response.json() as SearxngResponse
  return data.results ?? []
}
