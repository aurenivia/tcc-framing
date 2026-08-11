import type { ModelKey, News, Report } from '../types'
import { MODEL_ORDER } from './signals'

export type ModelState = 'pending' | 'done' | 'error'

export interface LiveModel {
  state: ModelState
  report?: Report
  ms?: number // duração final, em ms
  startedAt?: number // para o cronômetro ao vivo
  err?: string
}

export interface LiveState {
  news: News
  inputKey: string
  models: Record<ModelKey, LiveModel>
  savedAt?: number
}

export function allDone(live: LiveState): boolean {
  return MODEL_ORDER.every((m) => live.models[m].state !== 'pending')
}

export function hasAnyDone(live: LiveState): boolean {
  return MODEL_ORDER.some((m) => live.models[m].state === 'done')
}

function hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export function keyOf(input: { url?: string; text?: string }): string {
  if (input.url && input.url.trim()) return 'url:' + input.url.trim()
  return 'text:' + hash((input.text || '').trim())
}

// ── Cache em localStorage ─────────────────────────────────
const PREFIX = 'framing:live:'
const INDEX = 'framing:live:index'
const LAST = 'framing:live:last'
const MAX = 10

function readIndex(): string[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX) || '[]')
  } catch {
    return []
  }
}

/** Salva/atualiza a análise e a marca como a última vista. Poda para MAX. */
export function saveLive(live: LiveState): void {
  try {
    const entry = { ...live, savedAt: Date.now() }
    localStorage.setItem(PREFIX + live.inputKey, JSON.stringify(entry))
    localStorage.setItem(LAST, live.inputKey)
    let index = readIndex().filter((k) => k !== live.inputKey)
    index.push(live.inputKey)
    while (index.length > MAX) {
      const old = index.shift()!
      localStorage.removeItem(PREFIX + old)
    }
    localStorage.setItem(INDEX, JSON.stringify(index))
  } catch {
    // quota cheia ou storage indisponível: seguimos sem cache.
  }
}

/** Modelos que ficaram pendentes num refresh nunca vão concluir: viram erro. */
function sanitize(live: LiveState): LiveState {
  const models = { ...live.models }
  for (const m of MODEL_ORDER) {
    if (models[m]?.state === 'pending') {
      models[m] = { state: 'error', err: 'interrompido (refresh)' }
    }
  }
  return { ...live, models }
}

function read(key: string): LiveState | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as LiveState) : null
  } catch {
    return null
  }
}

export function loadLast(): LiveState | null {
  try {
    const key = localStorage.getItem(LAST)
    const live = key ? read(key) : null
    return live ? sanitize(live) : null
  } catch {
    return null
  }
}

/** Só reaproveita se tudo já concluiu e ao menos um modelo deu certo. */
export function loadByKey(key: string): LiveState | null {
  const live = read(key)
  if (live && allDone(live) && hasAnyDone(live)) return live
  return null
}
