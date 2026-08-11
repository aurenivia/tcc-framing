import { useState } from 'react'
import { extractNews, type AnalyzeInput } from '../lib/analyze'
import { keyOf, loadByKey, type LiveState } from '../lib/live'
import type { News } from '../types'

interface Props {
  /** Análise já em cache (refresh / re-submissão do mesmo input). */
  onCached: (live: LiveState) => void
  /** Notícia extraída, pronta para rodar os modelos. */
  onStart: (news: News, inputKey: string) => void
}

type Mode = 'url' | 'text'

export function NewAnalysis({ onCached, onStart }: Props) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('url')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [titulo, setTitulo] = useState('')
  const [veiculo, setVeiculo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = mode === 'url' ? url.trim().length > 0 : text.trim().length > 0

  async function submit() {
    setLoading(true)
    setError(null)
    const input: AnalyzeInput = mode === 'url' ? { url } : { text, titulo, veiculo }
    const inputKey = keyOf(input)
    try {
      const cached = loadByKey(inputKey)
      if (cached) {
        onCached(cached)
        setOpen(false)
        return
      }
      const news = await extractNews(input)
      onStart(news, inputKey)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button type="button" className="new-analysis-open" onClick={() => setOpen(true)}>
        + Analisar nova notícia
      </button>
    )
  }

  return (
    <div className="new-analysis">
      <div className="na-modes">
        <button
          type="button"
          className={`na-mode${mode === 'url' ? ' is-active' : ''}`}
          onClick={() => setMode('url')}
        >
          URL
        </button>
        <button
          type="button"
          className={`na-mode${mode === 'text' ? ' is-active' : ''}`}
          onClick={() => setMode('text')}
        >
          Colar texto
        </button>
        <button type="button" className="na-close" onClick={() => setOpen(false)} aria-label="Fechar">
          ×
        </button>
      </div>

      {mode === 'url' ? (
        <input
          type="url"
          className="field"
          placeholder="https://veiculo.com/noticia"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      ) : (
        <>
          <div className="field-row">
            <input
              className="field"
              placeholder="Título (opcional)"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
            <input
              className="field"
              placeholder="Veículo (opcional)"
              value={veiculo}
              onChange={(e) => setVeiculo(e.target.value)}
            />
          </div>
          <textarea
            className="field na-textarea"
            placeholder="Cole o texto da notícia aqui"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
          />
        </>
      )}

      {error && <p className="na-error">{error}</p>}

      <button type="button" className="na-submit" onClick={submit} disabled={!canSubmit || loading}>
        {loading ? (mode === 'url' ? 'Extraindo texto…' : 'Preparando…') : 'Analisar'}
      </button>
    </div>
  )
}
