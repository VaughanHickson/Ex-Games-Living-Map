export interface SearxngResult {
  title?: string
  url?: string
  content?: string
}

export interface SearxngResponse {
  results?: SearxngResult[]
  unresponsive_engines?: unknown[]
}
