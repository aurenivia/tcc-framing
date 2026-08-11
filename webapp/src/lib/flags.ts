// Flags de build. `VITE_LIVE=0` (modo `pages`) desliga a análise ao vivo,
// que depende do proxy /api servido só pelo dev server.
export const LIVE_ENABLED = import.meta.env.VITE_LIVE !== '0'
