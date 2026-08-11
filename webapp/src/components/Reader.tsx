import { Fragment, useMemo, useState } from 'react'
import type { EnrichedReport, News, SignalId } from '../types'
import { splitParagraphs } from '../lib/matching'
import {
  coveringSignals,
  highlightBackground,
  rangesFor,
  segmentize,
  type Segment,
} from '../lib/highlight'
import { FindingPopover, type PopoverAnchor } from './FindingPopover'

interface Props {
  news: News
  enriched: EnrichedReport
  activeSignals: Set<SignalId>
  focusedId: string | null
  onFocus: (findingId: string | null) => void
}

function Marks({
  segments,
  focusedId,
  onFocus,
  onHover,
}: {
  segments: Segment[]
  focusedId: string | null
  onFocus: (findingId: string | null) => void
  onHover: (anchor: PopoverAnchor | null) => void
}) {
  return (
    <>
      {segments.map((segment) => {
        if (!segment.covering.length) {
          return <Fragment key={segment.start}>{segment.text}</Fragment>
        }

        const signals = coveringSignals(segment.covering)
        const focused = segment.covering.some((finding) => finding.id === focusedId)

        return (
          <mark
            key={segment.start}
            className={`hl${focused ? ' is-focused' : ''}`}
            style={{ background: highlightBackground(signals) }}
            data-finding={segment.covering[0].id}
            onClick={() => onFocus(segment.covering[0].id)}
            onMouseEnter={(event) =>
              onHover({
                rect: event.currentTarget.getBoundingClientRect(),
                findings: segment.covering,
              })
            }
            onMouseLeave={() => onHover(null)}
          >
            {segment.text}
          </mark>
        )
      })}
    </>
  )
}

export function Reader({ news, enriched, activeSignals, focusedId, onFocus }: Props) {
  const [anchor, setAnchor] = useState<PopoverAnchor | null>(null)
  const paragraphs = useMemo(() => splitParagraphs(news.texto ?? ''), [news])

  const titleSegments = useMemo(() => {
    const ranges = rangesFor(enriched.findings, 'title', activeSignals)
    return segmentize(news.titulo ?? '', ranges)
  }, [enriched, activeSignals, news])

  const bodyRanges = useMemo(
    () => rangesFor(enriched.findings, 'body', activeSignals),
    [enriched, activeSignals],
  )

  return (
    <article className="reader" onScroll={() => setAnchor(null)}>
      <h3 className="reader-title">
        <Marks
          segments={titleSegments}
          focusedId={focusedId}
          onFocus={onFocus}
          onHover={setAnchor}
        />
      </h3>

      <p className="reader-byline">
        {news.veiculo} · {news.data}
        {news.url && (
          <>
            {' · '}
            <a href={news.url} target="_blank" rel="noreferrer noopener">
              fonte original
            </a>
          </>
        )}
      </p>

      {paragraphs.map((paragraph) => (
        <p key={paragraph.start} className="reader-paragraph">
          <span className="paragraph-index" aria-hidden="true">
            {paragraph.index}
          </span>
          <Marks
            segments={segmentize(news.texto, bodyRanges, paragraph.start, paragraph.end)}
            focusedId={focusedId}
            onFocus={onFocus}
            onHover={setAnchor}
          />
        </p>
      ))}

      {anchor && <FindingPopover anchor={anchor} />}
    </article>
  )
}
