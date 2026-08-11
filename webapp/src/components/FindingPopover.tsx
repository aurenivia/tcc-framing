import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Finding } from '../types'
import { SIGNALS, SUB_SIGNALS } from '../lib/signals'

export interface PopoverAnchor {
  rect: DOMRect
  findings: Finding[]
}

const WIDTH = 380
const GAP = 10
const MARGIN = 12

/** Popover do grifo. Vai no body via portal para nao ser cortado pelo
    scroll da coluna do texto; nao recebe ponteiro, entao nao pisca. */
export function FindingPopover({ anchor }: { anchor: PopoverAnchor }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const box = ref.current?.getBoundingClientRect()
    const height = box?.height ?? 0
    const { rect } = anchor

    const below = rect.bottom + GAP
    const above = rect.top - GAP - height
    const top = below + height + MARGIN <= window.innerHeight || above < MARGIN ? below : above

    const wanted = rect.left + rect.width / 2 - WIDTH / 2
    const left = Math.min(Math.max(wanted, MARGIN), window.innerWidth - WIDTH - MARGIN)

    setPos({ top, left })
  }, [anchor])

  return createPortal(
    <div
      ref={ref}
      className="hl-pop"
      role="tooltip"
      style={{
        width: WIDTH,
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      {anchor.findings.map((finding) => (
        <FindingBrief key={finding.id} finding={finding} />
      ))}
      {anchor.findings.length > 1 && (
        <p className="hl-pop-note">{anchor.findings.length} achados neste trecho</p>
      )}
    </div>,
    document.body,
  )
}

function FindingBrief({ finding }: { finding: Finding }) {
  const meta = SIGNALS[finding.signal]

  return (
    <div
      className="hl-pop-item"
      style={{ '--tint': meta.tint, '--ink': meta.ink } as React.CSSProperties}
    >
      <div className="hl-pop-head">
        <span className="sub-code">{finding.sub_sinal}</span>
        <span className="sub-name">{SUB_SIGNALS[finding.sub_sinal] ?? meta.label}</span>
        <span className={`tag confidence conf-${finding.confianca}`}>
          {finding.confianca || 'n/d'}
        </span>
      </div>
      <p className="hl-pop-just">{finding.justificativa}</p>
      {finding.limitacao && (
        <p className="hl-pop-limit">
          <b>Limitação</b> {finding.limitacao}
        </p>
      )}
    </div>
  )
}
