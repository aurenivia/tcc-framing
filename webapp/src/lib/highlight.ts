import type { Finding, MatchSource, SignalId } from '../types'
import { SIGNALS } from './signals'

export interface Segment {
  start: number
  end: number
  text: string
  /** Achados que cobrem integralmente este segmento (pode ser vazio). */
  covering: Finding[]
}

interface Range {
  start: number
  end: number
  finding: Finding
}

export function rangesFor(
  findings: Finding[],
  source: MatchSource,
  activeSignals: Set<SignalId>,
): Range[] {
  const ranges: Range[] = []
  for (const finding of findings) {
    if (!activeSignals.has(finding.signal)) continue
    if (finding.match.source !== source) continue
    for (const span of finding.match.spans) {
      ranges.push({ start: span.start, end: span.end, finding })
    }
  }
  return ranges
}

/**
 * Corta [from, to) nos limites de todos os grifos. Sobreposicao parcial ou
 * total gera segmentos com mais de um achado cobrindo o mesmo trecho.
 */
export function segmentize(text: string, ranges: Range[], from = 0, to = text.length): Segment[] {
  const local = ranges.filter((range) => range.end > from && range.start < to)
  if (!local.length) {
    return [{ start: from, end: to, text: text.slice(from, to), covering: [] }]
  }

  const boundaries = new Set<number>([from, to])
  for (const range of local) {
    if (range.start > from && range.start < to) boundaries.add(range.start)
    if (range.end > from && range.end < to) boundaries.add(range.end)
  }

  const ordered = [...boundaries].sort((a, b) => a - b)
  const segments: Segment[] = []

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const start = ordered[index]
    const end = ordered[index + 1]
    if (end <= start) continue
    const covering = local
      .filter((range) => range.start <= start && end <= range.end)
      .map((range) => range.finding)
    segments.push({ start, end, text: text.slice(start, end), covering })
  }

  return segments
}

/** Fundo do grifo: cor unica, ou faixas verticais quando ha varios criterios. */
export function highlightBackground(signals: SignalId[]): string {
  const colors = signals.map((signal) => SIGNALS[signal].tint)
  if (colors.length === 1) return colors[0]

  const width = 100 / colors.length
  const stops = colors.flatMap((color, index) => [
    `${color} ${(index * width).toFixed(2)}%`,
    `${color} ${((index + 1) * width).toFixed(2)}%`,
  ])
  return `linear-gradient(180deg, ${stops.join(', ')})`
}

export function coveringSignals(covering: Finding[]): SignalId[] {
  return [...new Set(covering.map((finding) => finding.signal))].sort()
}

export function coveringTooltip(covering: Finding[]): string {
  const parts = [...new Set(covering.map((finding) => finding.sub_sinal).filter(Boolean))]
  return parts.join(' · ')
}
