import type { ModelKey, News, Report } from '../types'

export interface AnalyzeInput {
  url?: string
  text?: string
  titulo?: string
  veiculo?: string
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data?.error || `Erro ${resp.status}`)
  return data as T
}

/** Passo 1: extrai o texto (URL) ou monta a notícia (texto colado). */
export async function extractNews(input: AnalyzeInput): Promise<News> {
  const data = await post<{ news: News }>('/api/extract', input)
  return data.news
}

/** Passo 2: roda um modelo sobre a notícia. Chamado 3× em paralelo. */
export async function analyzeOne(news: News, model: ModelKey): Promise<Report> {
  const data = await post<{ report: Report }>('/api/analyze-one', { news, model })
  return data.report
}
