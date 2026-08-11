import type { EnrichedReport, Finding, SignalId } from '../types'
import { SIGNALS, SUB_SIGNALS } from '../lib/signals'

interface Props {
  enriched: EnrichedReport
  activeSignals: Set<SignalId>
  focusedId: string | null
  onFocus: (findingId: string | null) => void
}

function locationLabel(finding: Finding): string {
  if (finding.match.source === 'title') return 'no título'
  if (finding.match.source === 'body') {
    const suffix = finding.paragraph ? `parágrafo ${finding.paragraph}` : 'no texto'
    return finding.match.method === 'fragments' ? `${suffix} · fragmentos` : suffix
  }
  return 'não localizado literalmente'
}

function FindingCard({
  finding,
  focused,
  onFocus,
}: {
  finding: Finding
  focused: boolean
  onFocus: (findingId: string | null) => void
}) {
  const meta = SIGNALS[finding.signal]
  const unresolved = finding.match.source === 'unresolved'

  return (
    <article
      id={`card-${finding.id}`}
      className={`finding${focused ? ' is-focused' : ''}`}
      style={{ '--tint': meta.tint, '--ink': meta.ink } as React.CSSProperties}
      onClick={() => onFocus(finding.id)}
    >
      <header className="finding-head">
        <span className="sub-code">{finding.sub_sinal}</span>
        <span className="sub-name">{SUB_SIGNALS[finding.sub_sinal] ?? meta.label}</span>
      </header>

      <div className="finding-tags">
        <span className={`tag confidence conf-${finding.confianca}`}>
          confiança {finding.confianca || 'n/d'}
        </span>
        <span className={`tag location${unresolved ? ' is-unresolved' : ''}`}>
          {locationLabel(finding)}
        </span>
      </div>

      <blockquote className="finding-quote">{finding.trecho}</blockquote>
      <p className="finding-just">{finding.justificativa}</p>

      {finding.limitacao && (
        <p className="finding-limit">
          <b>Limitação</b> {finding.limitacao}
        </p>
      )}
    </article>
  )
}

export function FindingsPanel({ enriched, activeSignals, focusedId, onFocus }: Props) {
  const { report, groups } = enriched

  return (
    <section className="panel" aria-label="Achados do relatório">
      <div className="panel-block">
        <h4 className="panel-heading">Síntese</h4>
        <p className="panel-summary">{report.analise.resumo || 'Sem síntese registrada.'}</p>
      </div>

      <details className="reasoning">
        <summary>Raciocínio registrado pelo modelo</summary>
        <p>{report.analise.raciocinio || 'Sem raciocínio registrado.'}</p>
      </details>

      <div className="groups">
        {groups.map((group) => {
          const meta = SIGNALS[group.signal]
          const dimmed = !activeSignals.has(group.signal)

          return (
            <section
              key={group.signal}
              className={`group${dimmed ? ' is-dimmed' : ''}`}
              style={{ '--tint': meta.tint, '--ink': meta.ink } as React.CSSProperties}
            >
              <header className="group-head">
                <span className="group-code">{group.signal}</span>
                <span className="group-name">{meta.label}</span>
                <span className={`group-state${group.presente ? ' present' : ''}`}>
                  {group.presente ? `presente · ${group.findings.length}` : 'ausente'}
                </span>
              </header>

              {group.presente ? (
                group.findings.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    focused={finding.id === focusedId}
                    onFocus={onFocus}
                  />
                ))
              ) : (
                <p className="absence">
                  {group.justificativa_ausencia || 'Sem justificativa de ausência registrada.'}
                </p>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}
