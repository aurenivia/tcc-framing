import type { ModelKey, SignalId } from '../types'

export const SIGNAL_ORDER: SignalId[] = ['S1', 'S2', 'S3', 'S4', 'S5']

export interface SignalMeta {
  label: string
  /** Fundo do grifo. */
  tint: string
  /** Traco/texto do criterio; usado tambem nos chips. */
  ink: string
}

export const SIGNALS: Record<SignalId, SignalMeta> = {
  S1: { label: 'Marcação lexical', tint: '#FBE38C', ink: '#8A5A00' },
  S2: { label: 'Causal-moral', tint: '#F9BDBD', ink: '#9B2C2C' },
  S3: { label: 'Suporte evidencial', tint: '#AECDF7', ink: '#1E5F99' },
  S4: { label: 'Pluralidade', tint: '#DDC5F7', ink: '#68419A' },
  S5: { label: 'Contextualização', tint: '#AEE9C4', ink: '#287044' },
}

export const SUB_SIGNALS: Record<string, string> = {
  'S1.1': 'Adjetivação avaliativa',
  'S1.2': 'Rotulação lexical',
  'S1.3': 'Intensificação / sensacionalismo',
  'S1.4': 'Verbo de elocução carregado',
  'S2.1': 'Causalidade unilateral',
  'S2.2': 'Responsabilização desproporcional',
  'S2.3': 'Avaliação moral implícita',
  'S2.4': 'Apelo ao medo / consequência extrema',
  'S2.5': 'Falsa dicotomia ou lógica falha',
  'S3.1': 'Claim sem evidência explícita',
  'S3.2': 'Fonte vaga ou anônima',
  'S3.3': 'Opinião apresentada como fato',
  'S3.4': 'Número ou comparação sem origem',
  'S3.5': 'Generalização não fundamentada',
  'S4.1': 'Parte diretamente afetada ausente',
  'S4.2': 'Contraponto formal / fraco',
  'S4.3': 'Assimetria severa de espaço',
  'S4.4': 'Fonte única para controvérsia',
  'S5.1': 'Ausência de antecedente relevante',
  'S5.2': 'Ausência de dado comparativo',
  'S5.3': 'Foco estratégico / bastidor',
  'S5.4': 'Contexto institucional ausente',
}

export const MODEL_ORDER: ModelKey[] = ['DeepSeek', 'GPT-5.4', 'Claude']

export const MODEL_META: Record<ModelKey, { full: string; initial: string }> = {
  DeepSeek: { full: 'DeepSeek V4 Pro', initial: 'D' },
  'GPT-5.4': { full: 'GPT-5.4', initial: 'G' },
  Claude: { full: 'Claude Sonnet 4.6', initial: 'C' },
}

export const TEMA_LABELS: Record<string, string> = {
  politica: 'Política',
  mundo: 'Mundo',
  policial: 'Policial',
  factual_evento: 'Factual / evento',
}

export function temaLabel(tema: string): string {
  return TEMA_LABELS[tema] ?? tema
}
