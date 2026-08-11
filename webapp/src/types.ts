export type ModelKey = 'DeepSeek' | 'GPT-5.4' | 'Claude'
export type SignalId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5'

export interface News {
  id: string
  categoria: string
  veiculo: string
  data: string
  titulo: string
  texto: string
  url?: string
  notas?: string
}

export interface RawFinding {
  sub_sinal: string
  trecho: string
  justificativa: string
  confianca: string
  limitacao: string
}

export interface RawSignal {
  sinal: SignalId
  presente: boolean
  justificativa_ausencia: string
  sub_sinais_detectados: RawFinding[]
}

export interface Report {
  arquivo: string
  noticia_id: string
  modelo: string
  modelo_key: ModelKey
  tokens_prompt: number
  tokens_resposta: number
  tempo_segundos: number
  erro: string | null
  analise: {
    raciocinio: string
    resumo: string
    sinais: RawSignal[]
  }
}

export interface Dataset {
  news: News[]
  reports: Report[]
}

export type MatchSource = 'title' | 'body' | 'unresolved'

export interface Span {
  start: number
  end: number
}

export interface MatchResult {
  source: MatchSource
  spans: Span[]
  /** normalized = achado literal; fragments = trecho com reticencias remontado. */
  method: 'normalized' | 'fragments' | 'unresolved'
}

/** Achado com a localizacao ja resolvida contra o texto da noticia. */
export interface Finding extends RawFinding {
  id: string
  signal: SignalId
  match: MatchResult
  /** Indice 1-based do paragrafo do corpo, quando localizado no corpo. */
  paragraph: number | null
}

export interface SignalGroup {
  signal: SignalId
  presente: boolean
  justificativa_ausencia: string
  findings: Finding[]
}

export interface EnrichedReport {
  report: Report
  groups: SignalGroup[]
  findings: Finding[]
  presentCount: number
  findingCount: number
  unresolvedCount: number
}
