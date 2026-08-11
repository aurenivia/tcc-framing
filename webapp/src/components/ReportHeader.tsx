import type { EnrichedReport, ModelKey, News } from '../types'
import { MODEL_META, MODEL_ORDER, temaLabel } from '../lib/signals'

interface Props {
  news: News
  enriched: EnrichedReport
  model: ModelKey
  onModel: (model: ModelKey) => void
  /** Selo por modelo na aba (ao vivo): ⏳12s / ✓53s / ✗. */
  modelBadges?: Partial<Record<ModelKey, string>>
}

function formatDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('pt-BR')
}

/** Topo da coluna do relatorio: identificacao da noticia, modelo e numeros. */
export function ReportHeader({ news, enriched, model, onModel, modelBadges }: Props) {
  const { report, presentCount, findingCount, unresolvedCount } = enriched

  return (
    <header className="report-header">
      <div className="header-id">
        <span className="pill">{news.id}</span>
        <span className="pill ghost">{news.veiculo}</span>
        <span className="pill ghost">{formatDate(news.data)}</span>
        <span className="pill ghost">{temaLabel(news.categoria)}</span>
      </div>

      <h2 className="header-title">{news.titulo}</h2>

      <div className="model-switch" role="tablist" aria-label="Modelo">
        {MODEL_ORDER.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={item === model}
            className={`model-tab${item === model ? ' is-active' : ''}`}
            onClick={() => onModel(item)}
            title={MODEL_META[item].full}
          >
            {item}
            {modelBadges?.[item] && <small className="model-badge">{modelBadges[item]}</small>}
          </button>
        ))}
      </div>

      <div className="metrics">
        <div className="metric">
          <span className="metric-value">{presentCount}/5</span>
          <span className="metric-label">critérios</span>
        </div>
        <div className="metric">
          <span className="metric-value">{findingCount}</span>
          <span className="metric-label">subcritérios</span>
        </div>
        <div className="metric">
          <span className="metric-value">{report.tempo_segundos.toFixed(1)}s</span>
          <span className="metric-label">execução</span>
        </div>
        <div className="metric">
          <span className="metric-value">{report.tokens_resposta.toLocaleString('pt-BR')}</span>
          <span className="metric-label">tokens</span>
        </div>
      </div>

      {unresolvedCount > 0 && (
        <p className="alert" role="status">
          {unresolvedCount}{' '}
          {unresolvedCount === 1
            ? 'achado ficou sem grifo automático'
            : 'achados ficaram sem grifo automático'}{' '}
          por falta de correspondência literal. Eles continuam listados abaixo.
        </p>
      )}
    </header>
  )
}
