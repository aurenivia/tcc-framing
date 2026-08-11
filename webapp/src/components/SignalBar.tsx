import type { SignalId } from '../types'
import { SIGNALS, SIGNAL_ORDER } from '../lib/signals'

interface Props {
  activeSignals: Set<SignalId>
  onToggle: (signal: SignalId) => void
  onAll: () => void
  /** Quantos achados grifados existem por criterio no relatorio aberto. */
  counts: Partial<Record<SignalId, number>>
}

/** Topo da coluna do texto: liga e desliga os grifos por criterio. */
export function SignalBar({ activeSignals, onToggle, onAll, counts }: Props) {
  const allActive = activeSignals.size === SIGNAL_ORDER.length

  return (
    <div className="signal-bar">
      <span className="filter-label">Grifos</span>
      {SIGNAL_ORDER.map((signal) => {
        const active = activeSignals.has(signal)
        const total = counts[signal] ?? 0
        return (
          <button
            key={signal}
            type="button"
            className={`signal-chip${active ? ' is-active' : ''}`}
            style={{ '--tint': SIGNALS[signal].tint, '--ink': SIGNALS[signal].ink } as React.CSSProperties}
            onClick={() => onToggle(signal)}
            aria-pressed={active}
            title={SIGNALS[signal].label}
          >
            <i />
            <b>{signal}</b>
            <span className="chip-count">{total}</span>
          </button>
        )
      })}
      <button type="button" className="link-button" onClick={onAll} disabled={allActive}>
        todos
      </button>
    </div>
  )
}
