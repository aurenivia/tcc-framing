// Localizacao literal dos trechos citados pelos modelos.
//
// Regra do projeto: nada de busca aproximada silenciosa. So vira grifo o que
// casa literalmente depois de uma normalizacao conservadora (caixa, espacos,
// aspas e travessoes). Trecho com reticencias vira uma sequencia ordenada de
// fragmentos. Sem correspondencia segura, o achado fica sem grifo.

import type { MatchResult, News, Span } from '../types'

const ELLIPSIS_RE = /\s*(?:\[\s*\.{3}\s*\]|\.{3}|…)\s*/
const TITLE_PREFIX_RE = /^\s*T[ií]tulo:\s*/i

const CHAR_NORMALIZATION: Record<string, string> = {
  '"': '',
  "'": '',
  '“': '',
  '”': '',
  '„': '',
  '‟': '',
  '‘': '',
  '’': '',
  '‚': '',
  '‛': '',
  '–': '-',
  '—': '-',
  '−': '-',
  ' ': ' ',
}

interface Normalized {
  text: string
  /** positions[i] = indice no texto original do caractere normalizado i. */
  positions: number[]
}

function normalizeWithMap(text: string): Normalized {
  const chars: string[] = []
  const positions: number[] = []
  let previousSpace = false

  for (let index = 0; index < text.length; index += 1) {
    const original = text[index]
    const mapped = CHAR_NORMALIZATION[original] ?? original

    if (mapped === '') continue

    if (/\s/.test(mapped)) {
      if (!previousSpace) {
        chars.push(' ')
        positions.push(index)
      }
      previousSpace = true
      continue
    }

    previousSpace = false
    // toLowerCase pode expandir um caractere em varios; todos apontam para o
    // mesmo indice original.
    for (const lowered of mapped.toLowerCase()) {
      chars.push(lowered)
      positions.push(index)
    }
  }

  return { text: chars.join(''), positions }
}

function normalizedFragment(text: string): string {
  return normalizeWithMap(text.trim()).text.trim()
}

function findNormalized(text: string, snippet: string): Span | null {
  const { text: haystack, positions } = normalizeWithMap(text)
  const needle = normalizedFragment(snippet)
  if (!needle) return null

  const index = haystack.indexOf(needle)
  if (index < 0) return null

  return { start: positions[index], end: positions[index + needle.length - 1] + 1 }
}

function findFragments(text: string, snippet: string): Span[] | null {
  const fragments = snippet
    .split(ELLIPSIS_RE)
    .map((fragment) => fragment.replace(/^[\s"'[\]()]+|[\s"'[\]()]+$/g, ''))
    .filter((fragment) => normalizedFragment(fragment).length >= 12)

  if (!fragments.length) return null

  const spans: Span[] = []
  let cursor = 0
  for (const fragment of fragments) {
    const span = findNormalized(text.slice(cursor), fragment)
    if (!span) return null
    const absolute = { start: span.start + cursor, end: span.end + cursor }
    spans.push(absolute)
    cursor = absolute.end
  }
  return spans
}

const UNRESOLVED: MatchResult = { source: 'unresolved', spans: [], method: 'unresolved' }

export function resolveExcerpt(news: Pick<News, 'titulo' | 'texto'>, excerpt: string): MatchResult {
  const raw = (excerpt ?? '').trim()
  if (!raw) return UNRESOLVED

  const withoutPrefix = raw.replace(TITLE_PREFIX_RE, '')
  const titleFirst = withoutPrefix !== raw

  const sources: Array<['title' | 'body', string]> = titleFirst
    ? [
        ['title', news.titulo ?? ''],
        ['body', news.texto ?? ''],
      ]
    : [
        ['body', news.texto ?? ''],
        ['title', news.titulo ?? ''],
      ]

  for (const [source, text] of sources) {
    const candidate = source === 'title' ? withoutPrefix : raw
    const span = findNormalized(text, candidate)
    if (span) return { source, spans: [span], method: 'normalized' }
  }

  if (ELLIPSIS_RE.test(raw)) {
    for (const [source, text] of sources) {
      const candidate = source === 'title' ? withoutPrefix : raw
      const spans = findFragments(text, candidate)
      if (spans) return { source, spans, method: 'fragments' }
    }
  }

  return UNRESOLVED
}

export interface Paragraph {
  start: number
  end: number
  text: string
  index: number
}

/** Quebra o corpo em paragrafos preservando os offsets do texto original. */
export function splitParagraphs(text: string): Paragraph[] {
  const paragraphs: Paragraph[] = []
  let cursor = 0
  let index = 0

  for (const chunk of text.split('\n')) {
    const start = cursor
    const end = cursor + chunk.length
    cursor = end + 1
    if (chunk.trim()) {
      index += 1
      paragraphs.push({ start, end, text: chunk, index })
    }
  }

  return paragraphs
}

export function paragraphOf(paragraphs: Paragraph[], position: number): number | null {
  const found = paragraphs.find((item) => position >= item.start && position < item.end)
  return found ? found.index : null
}
