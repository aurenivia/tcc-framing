// Plugin do Vite: expõe as rotas de análise no dev e no preview.
//   POST /api/extract      {url} | {text,...}        → { news }
//   POST /api/analyze-one  {news, model}             → { report }
// Um modelo por chamada: o front dispara os 3 em paralelo e mostra parcial.
// A chave do OpenRouter fica no servidor — nunca vai para o bundle.

import { analyzeOne, extractNews } from './analyze.mjs'

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function makeMiddleware(apiKey) {
  return async (req, res, next) => {
    const url = req.url || ''
    if (req.method !== 'POST' || !url.startsWith('/api/')) return next()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    try {
      const body = JSON.parse((await readBody(req)) || '{}')
      let payload
      if (url.startsWith('/api/extract')) {
        payload = { news: await extractNews(body) }
      } else if (url.startsWith('/api/analyze-one')) {
        payload = { report: await analyzeOne(body.news, body.model, apiKey) }
      } else {
        return next()
      }
      res.end(JSON.stringify(payload))
    } catch (err) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: `${err.name}: ${err.message}` }))
    }
  }
}

export function apiPlugin(apiKey) {
  return {
    name: 'analyze-api',
    configureServer(server) {
      server.middlewares.use(makeMiddleware(apiKey))
    },
    configurePreviewServer(server) {
      server.middlewares.use(makeMiddleware(apiKey))
    },
  }
}
