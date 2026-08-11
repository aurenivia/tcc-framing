import raw from '../data/dataset.json'
import type {
  Dataset,
  EnrichedReport,
  Finding,
  ModelKey,
  News,
  Report,
  SignalGroup,
} from '../types'
import { paragraphOf, resolveExcerpt, splitParagraphs } from './matching'
import { SIGNAL_ORDER } from './signals'

const dataset = raw as unknown as Dataset

export const NEWS: News[] = dataset.news
export const REPORTS: Report[] = dataset.reports

const byNewsAndModel = new Map<string, Report>()
for (const report of REPORTS) {
  byNewsAndModel.set(`${report.noticia_id}::${report.modelo_key}`, report)
}

export function getReport(newsId: string, model: ModelKey): Report | undefined {
  return byNewsAndModel.get(`${newsId}::${model}`)
}

export interface ReportCounts {
  present: number
  findings: number
}

export function reportCounts(report: Report | undefined): ReportCounts {
  if (!report || report.erro) return { present: 0, findings: 0 }
  const signals = report.analise.sinais
  return {
    present: signals.filter((signal) => signal.presente).length,
    findings: signals.reduce((total, signal) => total + signal.sub_sinais_detectados.length, 0),
  }
}

const enrichedCache = new Map<string, EnrichedReport>()

/** Resolve a posicao de cada trecho no titulo/corpo e agrupa por criterio. */
export function enrichReport(news: News, report: Report): EnrichedReport {
  const cacheKey = `${news.id}::${report.modelo_key}`
  const cached = enrichedCache.get(cacheKey)
  if (cached) return cached

  const paragraphs = splitParagraphs(news.texto ?? '')
  const groups: SignalGroup[] = []
  const findings: Finding[] = []
  let sequence = 0

  const byId = new Map(report.analise.sinais.map((signal) => [signal.sinal, signal]))

  for (const signalId of SIGNAL_ORDER) {
    const signal = byId.get(signalId)
    if (!signal) {
      groups.push({
        signal: signalId,
        presente: false,
        justificativa_ausencia: '',
        findings: [],
      })
      continue
    }

    const groupFindings: Finding[] = signal.sub_sinais_detectados.map((item) => {
      sequence += 1
      const match = resolveExcerpt(news, item.trecho)
      const finding: Finding = {
        ...item,
        id: `${news.id}-${report.modelo_key}-${item.sub_sinal || signalId}-${sequence}`,
        signal: signalId,
        match,
        paragraph:
          match.source === 'body' ? paragraphOf(paragraphs, match.spans[0].start) : null,
      }
      return finding
    })

    findings.push(...groupFindings)
    groups.push({
      signal: signalId,
      presente: signal.presente,
      justificativa_ausencia: signal.justificativa_ausencia,
      findings: groupFindings,
    })
  }

  const enriched: EnrichedReport = {
    report,
    groups,
    findings,
    presentCount: groups.filter((group) => group.presente).length,
    findingCount: findings.length,
    unresolvedCount: findings.filter((finding) => finding.match.source === 'unresolved').length,
  }

  enrichedCache.set(cacheKey, enriched)
  return enriched
}

export const VEICULOS: string[] = [...new Set(NEWS.map((item) => item.veiculo))].sort((a, b) =>
  a.localeCompare(b, 'pt-BR'),
)

export const TEMAS: string[] = [...new Set(NEWS.map((item) => item.categoria))].sort((a, b) =>
  a.localeCompare(b, 'pt-BR'),
)
