import type { ReactNode } from 'react'
import type { News } from '../types'

interface Props {
  news: News[]
  selectedId: string
  onSelect: (id: string) => void
  children?: ReactNode
}

/** Barra fixa: identidade + navegacao entre as 10 noticias em uma linha so. */
export function Topbar({ news, selectedId, onSelect, children }: Props) {
  const index = news.findIndex((item) => item.id === selectedId)

  function step(delta: number) {
    const next = news[index + delta]
    if (next) onSelect(next.id)
  }

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <h1>Leitor de enquadramento</h1>
      </div>

      <div className="topbar-nav">
        {children}
        <button
          type="button"
          className="nav-step"
          onClick={() => step(-1)}
          disabled={index <= 0}
          aria-label="Notícia anterior"
        >
          ◀
        </button>
        <select
          className="news-select"
          value={selectedId}
          onChange={(event) => onSelect(event.target.value)}
          aria-label="Notícia"
        >
          {index < 0 && <option value={selectedId}>análise ao vivo</option>}
          {news.map((item) => (
            <option key={item.id} value={item.id}>
              {item.id} · {item.veiculo} · {item.titulo}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="nav-step"
          onClick={() => step(1)}
          disabled={index < 0 || index >= news.length - 1}
          aria-label="Próxima notícia"
        >
          ▶
        </button>
        <span className="nav-count">
          {index >= 0 ? `${index + 1}/${news.length}` : '—'}
        </span>
      </div>
    </header>
  )
}
