import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { apiPlugin } from './server/api-plugin.mjs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Build estático (GitHub Pages): sem proxy da API, sem análise ao vivo.
  const live = env.VITE_LIVE !== '0'
  return {
    base: env.VITE_BASE || '/',
    plugins: [react(), ...(live ? [apiPlugin(env.OPENROUTER_API_KEY)] : [])],
    server: { port: Number(process.env.PORT) || 5173, open: false },
  }
})
