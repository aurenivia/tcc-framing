import { useEffect, useMemo, useState } from 'react'
import { FindingsPanel } from './components/FindingsPanel'
import { NewAnalysis } from './components/NewAnalysis'
import { Reader } from './components/Reader'
import { ReportHeader } from './components/ReportHeader'
import { SignalBar } from './components/SignalBar'
import { Topbar } from './components/Topbar'
import { enrichReport, getReport, NEWS } from './lib/dataset'
import { analyzeOne } from './lib/analyze'
import { LIVE_ENABLED } from './lib/flags'
import {
  hasAnyDone,
  loadLast,
  saveLive,
  type LiveModel,
  type LiveState,
} from './lib/live'
import { MODEL_META, MODEL_ORDER, SIGNAL_ORDER } from './lib/signals'
import type { ModelKey, News, SignalId } from './types'

function firstDone(live: LiveState): ModelKey {
  return MODEL_ORDER.find((m) => live.models[m].state === 'done') ?? MODEL_ORDER[0]
}

function badgeFor(lm: LiveModel, now: number): string {
  if (lm.state === 'pending') return `⏳ ${Math.round((now - (lm.startedAt ?? now)) / 1000)}s`
  if (lm.state === 'done') return `✓ ${Math.round((lm.ms ?? 0) / 1000)}s`
  return '✗'
}

function LiveStatus({
  live,
  now,
  onModel,
}: {
  live: LiveState
  now: number
  onModel: (m: ModelKey) => void
}) {
  return (
    <div className="live-status">
      <h2 className="header-title">{live.news.titulo}</h2>
      <p className="header-sub">Analisando nos 3 modelos — clique num concluído para abrir.</p>
      <ul className="live-rows">
        {MODEL_ORDER.map((m) => {
          const lm = live.models[m]
          const done = lm.state === 'done'
          return (
            <li key={m}>
              <button
                type="button"
                className={`live-row is-${lm.state}`}
                onClick={() => done && onModel(m)}
                disabled={!done}
              >
                <span className="live-row-name">{MODEL_META[m].full}</span>
                <span className="live-row-badge">{badgeFor(lm, now)}</span>
                {lm.err && <span className="live-row-err">{lm.err}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function App() {
  const [live, setLive] = useState<LiveState | null>(() => (LIVE_ENABLED ? loadLast() : null))
  const [selectedId, setSelectedId] = useState(() => {
    const restored = LIVE_ENABLED ? loadLast() : null
    return restored && hasAnyDone(restored) ? restored.news.id : NEWS[0]?.id ?? ''
  })
  const [model, setModel] = useState<ModelKey>(() => {
    const restored = LIVE_ENABLED ? loadLast() : null
    return restored && hasAnyDone(restored) ? firstDone(restored) : MODEL_ORDER[0]
  })
  const [activeSignals, setActiveSignals] = useState<Set<SignalId>>(new Set(SIGNAL_ORDER))
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())

  const liveActive = live !== null && selectedId === live.news.id

  const news = liveActive ? live.news : NEWS.find((item) => item.id === selectedId) ?? NEWS[0]
  const report = liveActive
    ? live.models[model].report
    : news
      ? getReport(news.id, model)
      : undefined
  const enriched = useMemo(
    () => (news && report ? enrichReport(news, report) : null),
    [news, report],
  )

  const anyPending = live ? MODEL_ORDER.some((m) => live.models[m].state === 'pending') : false

  // Cronômetro ao vivo enquanto algum modelo roda.
  useEffect(() => {
    if (!anyPending) return
    const timer = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [anyPending])

  // Enquanto o modelo selecionado está pendente, pula para o primeiro já pronto.
  useEffect(() => {
    if (!liveActive || !live) return
    if (live.models[model].state === 'pending') {
      const done = MODEL_ORDER.find((m) => live.models[m].state === 'done')
      if (done) setModel(done)
    }
  }, [live, liveActive, model])

  useEffect(() => {
    setFocusedId(null)
  }, [selectedId, model])

  useEffect(() => {
    if (!focusedId) return
    const card = document.getElementById(`card-${focusedId}`)
    card?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const mark = document.querySelector(`mark[data-finding="${focusedId}"]`)
    mark?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusedId])

  function toggleSignal(signal: SignalId) {
    setActiveSignals((current) => {
      const next = new Set(current)
      if (next.has(signal)) next.delete(signal)
      else next.add(signal)
      return next
    })
  }

  function patchModel(key: ModelKey, patch: Partial<LiveModel>) {
    setLive((prev) => {
      if (!prev) return prev
      const next: LiveState = {
        ...prev,
        models: { ...prev.models, [key]: { ...prev.models[key], ...patch } },
      }
      saveLive(next)
      return next
    })
  }

  function onCached(cached: LiveState) {
    setLive(cached)
    saveLive(cached)
    setSelectedId(cached.news.id)
    setModel(firstDone(cached))
    setActiveSignals(new Set(SIGNAL_ORDER))
    setFocusedId(null)
  }

  function onStart(extracted: News, inputKey: string) {
    const id = `live-${Date.now()}`
    const newsItem: News = { ...extracted, id }
    const startedAt = Date.now()
    const models = Object.fromEntries(
      MODEL_ORDER.map((m) => [m, { state: 'pending', startedAt } as LiveModel]),
    ) as Record<ModelKey, LiveModel>
    const init: LiveState = { news: newsItem, inputKey, models }

    setLive(init)
    saveLive(init)
    setSelectedId(id)
    setModel(MODEL_ORDER[0])
    setActiveSignals(new Set(SIGNAL_ORDER))
    setFocusedId(null)
    setNowTick(Date.now())

    for (const m of MODEL_ORDER) {
      const t0 = Date.now()
      analyzeOne(newsItem, m)
        .then((rep) =>
          patchModel(m, {
            state: rep.erro ? 'error' : 'done',
            report: rep,
            ms: Date.now() - t0,
            err: rep.erro || undefined,
          }),
        )
        .catch((err) =>
          patchModel(m, {
            state: 'error',
            ms: Date.now() - t0,
            err: err instanceof Error ? err.message : String(err),
          }),
        )
    }
  }

  const modelBadges = liveActive
    ? (Object.fromEntries(
        MODEL_ORDER.map((m) => [m, badgeFor(live.models[m], nowTick)]),
      ) as Partial<Record<ModelKey, string>>)
    : undefined

  const signalCounts = useMemo(() => {
    const counts: Partial<Record<SignalId, number>> = {}
    enriched?.groups.forEach((group) => {
      counts[group.signal] = group.findings.length
    })
    return counts
  }, [enriched])

  return (
    <div className="shell">
      <Topbar news={NEWS} selectedId={liveActive ? '' : news?.id ?? ''} onSelect={setSelectedId}>
        {LIVE_ENABLED && <NewAnalysis onCached={onCached} onStart={onStart} />}
        {LIVE_ENABLED && live && (
          <button
            type="button"
            className={`live-return${liveActive ? ' is-active' : ''}`}
            onClick={() => setSelectedId(live.news.id)}
          >
            ● Ao vivo: {live.news.titulo.slice(0, 28)}
            {live.news.titulo.length > 28 ? '…' : ''}
          </button>
        )}
      </Topbar>

      {liveActive && !report ? (
        <main className="workspace is-single">
          <LiveStatus live={live} now={nowTick} onModel={setModel} />
        </main>
      ) : !news || !enriched ? (
        <main className="workspace is-single">
          <div className="empty-state">
            <p>Relatório indisponível para esta combinação de notícia e modelo.</p>
          </div>
        </main>
      ) : (
        <main className="workspace">
          <section className="col-report" aria-label="Relatório">
            <ReportHeader
              news={news}
              enriched={enriched}
              model={model}
              onModel={setModel}
              modelBadges={modelBadges}
            />

            {report?.erro && (
              <p className="alert" role="status">
                {report.modelo_key} falhou: {report.erro}
              </p>
            )}

            <FindingsPanel
              enriched={enriched}
              activeSignals={activeSignals}
              focusedId={focusedId}
              onFocus={setFocusedId}
            />
          </section>

          <section className="col-text" aria-label="Texto da notícia">
            <SignalBar
              activeSignals={activeSignals}
              onToggle={toggleSignal}
              onAll={() => setActiveSignals(new Set(SIGNAL_ORDER))}
              counts={signalCounts}
            />
            <Reader
              news={news}
              enriched={enriched}
              activeSignals={activeSignals}
              focusedId={focusedId}
              onFocus={setFocusedId}
            />
          </section>
        </main>
      )}
    </div>
  )
}
