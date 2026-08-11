// Análise ao vivo: extrai texto de URL (ou usa texto colado), chama os 3 modelos
// no OpenRouter com o prompt v3 e devolve { news, reports } no schema do leitor.
// Roda SÓ no servidor (dev/preview do Vite) — a chave nunca vai para o bundle.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extract } from '@extractus/article-extractor'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..')
// Raiz do repo do webapp; ARTEFATOS/ no repo do TCC.
const promptRaiz = resolve(repoRoot, 'prompts', 'v3.txt')
const promptPath = existsSync(promptRaiz)
  ? promptRaiz
  : resolve(repoRoot, 'ARTEFATOS', 'prompts', 'v3.txt')
const V3_PROMPT = readFileSync(promptPath, 'utf8')

// Mesmo esquema que os resultados v3 já usam; anexado ao prompt para travar a saída.
const FORMATO_JSON = `

══════════════════════════════════════════════════
FORMATO DE SAÍDA — JSON
══════════════════════════════════════════════════

Responda EXCLUSIVAMENTE com um objeto JSON válido, sem nenhum texto fora dele:

{
  "raciocinio": "análise categoria por categoria (S1 a S5)",
  "resumo": "síntese de 2-3 frases dos achados principais",
  "sinais": [
    {
      "sinal": "S1",
      "presente": true,
      "justificativa_ausencia": "",
      "sub_sinais_detectados": [
        {
          "sub_sinal": "S1.2",
          "trecho": "trecho literal extraído do texto",
          "justificativa": "por que configura o subcritério",
          "confianca": "alta|media|baixa",
          "limitacao": "ressalva interpretativa"
        }
      ]
    }
  ]
}

O array "sinais" DEVE conter exatamente 5 objetos, na ordem S1, S2, S3, S4, S5.
Se a categoria não tem achados: presente=false, sub_sinais_detectados=[], justificativa_ausencia preenchido.`

// `api` = slug do OpenRouter (sem o prefixo litellm); `id` = registro no relatório.
const MODELOS = [
  { api: 'deepseek/deepseek-v4-pro', id: 'openrouter/deepseek/deepseek-v4-pro', key: 'DeepSeek' },
  { api: 'openai/gpt-5.4', id: 'openrouter/openai/gpt-5.4', key: 'GPT-5.4' },
  { api: 'anthropic/claude-sonnet-4.6', id: 'openrouter/anthropic/claude-sonnet-4.6', key: 'Claude' },
]

const SIGNAL_ORDER = ['S1', 'S2', 'S3', 'S4', 'S5']

/** Converte o HTML do artigo em texto com parágrafos separados por linha em branco. */
function htmlToText(html) {
  return String(html || '')
    .replace(/<\/(p|div|h\d|li|br)[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

// Muitos veículos bloqueiam fetch sem User-Agent de navegador (403).
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
}

/** Extrai título/texto/veículo/data de uma URL de notícia. */
async function extrairDeUrl(url) {
  const artigo = await extract(url, {}, { headers: BROWSER_HEADERS })
  if (!artigo) throw new Error('Não consegui extrair o artigo dessa URL.')
  const texto = htmlToText(artigo.content)
  if (!texto) throw new Error('A URL foi lida mas não retornou texto de artigo (paywall?).')
  return {
    titulo: (artigo.title || '').trim(),
    veiculo: (artigo.source || new URL(url).hostname).trim(),
    data: (artigo.published || '').slice(0, 10),
    texto,
    url,
  }
}

function extrairJson(texto) {
  let t = String(texto || '').trim()
  if (t.startsWith('```')) {
    const linhas = t.split('\n')
    const fim = linhas[linhas.length - 1].trim() === '```' ? linhas.length - 1 : linhas.length
    t = linhas.slice(1, fim).join('\n').trim()
  }
  // Corta qualquer prefixo/sufixo fora das chaves externas.
  const ini = t.indexOf('{')
  const fim = t.lastIndexOf('}')
  if (ini > 0 || fim < t.length - 1) t = t.slice(ini, fim + 1)
  return JSON.parse(t)
}

/** Normaliza os 5 sinais na ordem canônica, tolerando ausências. */
function normalizarSinais(sinais) {
  const porId = new Map((sinais || []).map((s) => [s.sinal, s]))
  return SIGNAL_ORDER.map((id) => {
    const s = porId.get(id) || {}
    const subs = Array.isArray(s.sub_sinais_detectados) ? s.sub_sinais_detectados : []
    return {
      sinal: id,
      presente: Boolean(s.presente ?? subs.length > 0),
      justificativa_ausencia: s.justificativa_ausencia ?? '',
      sub_sinais_detectados: subs.map((f) => ({
        sub_sinal: f.sub_sinal ?? '',
        trecho: f.trecho ?? '',
        justificativa: f.justificativa ?? '',
        confianca: f.confianca ?? '',
        limitacao: f.limitacao ?? '',
      })),
    }
  })
}

async function chamarModelo(modelo, apiKey, userMessage) {
  const t0 = Date.now()
  const base = {
    arquivo: `live-${modelo.key}`,
    noticia_id: 'live',
    modelo: modelo.id,
    modelo_key: modelo.key,
    tokens_prompt: 0,
    tokens_resposta: 0,
    tempo_segundos: 0,
    erro: null,
    analise: { raciocinio: '', resumo: '', sinais: normalizarSinais([]) },
  }
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelo.api,
        messages: [
          { role: 'system', content: V3_PROMPT + FORMATO_JSON },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
        top_p: 0.9,
        // Folga alta: DeepSeek v4 pro é modelo de raciocínio e trunca o JSON
        // quando o teto aperta (raciocinio longo + 5 categorias).
        max_tokens: 16000,
      }),
    })
    if (!resp.ok) throw new Error(`OpenRouter ${resp.status}: ${(await resp.text()).slice(0, 200)}`)
    const data = await resp.json()
    const raw = data.choices?.[0]?.message?.content || ''
    base.tokens_prompt = data.usage?.prompt_tokens ?? 0
    base.tokens_resposta = data.usage?.completion_tokens ?? 0
    const parsed = extrairJson(raw)
    base.analise = {
      raciocinio: parsed.raciocinio ?? '',
      resumo: parsed.resumo ?? '',
      sinais: normalizarSinais(parsed.sinais),
    }
  } catch (err) {
    base.erro = `${err.name}: ${err.message}`
  }
  base.tempo_segundos = (Date.now() - t0) / 1000
  return base
}

const MODELOS_POR_KEY = new Map(MODELOS.map((m) => [m.key, m]))

/** Lista de modelos (chaves) na ordem canônica — o front dispara um por um. */
export const MODEL_KEYS = MODELOS.map((m) => m.key)

function toNews(meta) {
  return {
    id: 'live',
    categoria: 'ao_vivo',
    veiculo: meta.veiculo || '—',
    data: meta.data || '',
    titulo: meta.titulo || '(sem título)',
    texto: meta.texto,
    url: meta.url,
    notas: '',
  }
}

function buildUserMessage(news) {
  return `TEXTO PARA ANÁLISE:

Veículo: ${news.veiculo}
Data: ${news.data}
Título: ${news.titulo}

---

${news.texto}`
}

/** Passo 1: {url?} | {text,titulo,veiculo} → objeto news (sem relatórios). */
export async function extractNews(input) {
  if (input.url && input.url.trim()) {
    return toNews(await extrairDeUrl(input.url.trim()))
  }
  if (input.text && input.text.trim()) {
    return toNews({
      titulo: (input.titulo || '').trim(),
      veiculo: (input.veiculo || '').trim(),
      data: '',
      texto: input.text.trim(),
      url: undefined,
    })
  }
  throw new Error('Envie uma URL ou um texto para analisar.')
}

/** Passo 2: news + um modelo → um relatório. Chamado 3× em paralelo pelo front. */
export async function analyzeOne(news, modelKey, apiKey) {
  if (!apiKey) throw new Error('OPENROUTER_API_KEY ausente no .env do webapp.')
  const modelo = MODELOS_POR_KEY.get(modelKey)
  if (!modelo) throw new Error(`Modelo desconhecido: ${modelKey}`)
  if (!news || !news.texto) throw new Error('news.texto ausente.')
  return chamarModelo(modelo, apiKey, buildUserMessage(news))
}
