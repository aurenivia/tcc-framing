// Gera src/data/dataset.json a partir dos JSONs de artefato do repo.
// Nenhuma chamada de rede: o app le apenas o arquivo gerado aqui.

import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..')
// Artefatos ficam na raiz do repo do webapp e sob ARTEFATOS/ no repo do TCC.
const artefato = (...parts) => {
  const raiz = join(repoRoot, ...parts)
  return existsSync(raiz) ? raiz : join(repoRoot, 'ARTEFATOS', ...parts)
}
const newsDir = artefato('noticias')
const resultsDir = artefato('resultados', 'v3')
const outDir = join(here, '..', 'src', 'data')
const outFile = join(outDir, 'dataset.json')

const MODEL_PATTERNS = [
  ['deepseek', 'DeepSeek'],
  ['gpt-5.4', 'GPT-5.4'],
  ['claude', 'Claude'],
]

function modelKey(rawModel) {
  const lowered = String(rawModel || '').toLowerCase()
  for (const [pattern, key] of MODEL_PATTERNS) {
    if (lowered.includes(pattern)) return key
  }
  return null
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

const news = readdirSync(newsDir)
  .filter((name) => /^N\d+\.json$/.test(name))
  .sort()
  .map((name) => readJson(join(newsDir, name)))

const newsIds = new Set(news.map((item) => item.id))
const reports = []
const skipped = []

for (const name of readdirSync(resultsDir).filter((f) => f.endsWith('.json')).sort()) {
  let raw = readJson(join(resultsDir, name))
  // Um dos arquivos empacota o relatorio dentro de uma lista.
  if (Array.isArray(raw)) raw = raw.find((item) => item && item.noticia_id)
  if (!raw || typeof raw !== 'object') {
    skipped.push([name, 'formato desconhecido'])
    continue
  }

  const key = modelKey(raw.modelo)
  if (!newsIds.has(raw.noticia_id) || !key) {
    skipped.push([name, `noticia=${raw.noticia_id} modelo=${raw.modelo}`])
    continue
  }

  const analise = raw.analise || { raciocinio: '', sinais: [], resumo: '' }
  reports.push({
    arquivo: name,
    noticia_id: raw.noticia_id,
    modelo: raw.modelo,
    modelo_key: key,
    tokens_prompt: raw.tokens_prompt ?? 0,
    tokens_resposta: raw.tokens_resposta ?? 0,
    tempo_segundos: raw.tempo_segundos ?? 0,
    erro: raw.erro ?? null,
    analise: {
      raciocinio: analise.raciocinio ?? '',
      resumo: analise.resumo ?? '',
      sinais: (analise.sinais || []).map((signal) => ({
        sinal: signal.sinal,
        presente: Boolean(signal.presente),
        justificativa_ausencia: signal.justificativa_ausencia ?? '',
        sub_sinais_detectados: (signal.sub_sinais_detectados || []).map((finding) => ({
          sub_sinal: finding.sub_sinal ?? '',
          trecho: finding.trecho ?? '',
          justificativa: finding.justificativa ?? '',
          confianca: finding.confianca ?? '',
          limitacao: finding.limitacao ?? '',
        })),
      })),
    },
  })
}

mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, JSON.stringify({ news, reports }, null, 0), 'utf8')

const findings = reports.reduce(
  (total, report) =>
    total + report.analise.sinais.reduce((sum, s) => sum + s.sub_sinais_detectados.length, 0),
  0,
)

console.log(`dataset.json: ${news.length} noticias, ${reports.length} relatorios, ${findings} achados`)
for (const [name, reason] of skipped) console.warn(`  ignorado: ${name} (${reason})`)
