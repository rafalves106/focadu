import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Fase 87: CSP do laboratorio de codigo em /lab/ (dev e preview; em producao e o nginx.conf). O codigo do
 * aluno roda em Workers carregados dali e nao pode chamar a API da Focada nem outra origem: `connect-src`
 * so libera o caminho /lab/ (host-source com caminho, sem esquema pra valer em http e https). Mantenha igual
 * ao `location /lab/` do nginx.conf.
 */
export function labContentSecurityPolicy(host: string) {
  return [
    "default-src 'none'",
    "script-src 'self' 'wasm-unsafe-eval' blob:",
    "worker-src 'self' blob:",
    `connect-src ${host}/lab/`,
    "frame-ancestors 'self'",
  ].join('; ')
}

function labHeaders(): Plugin {
  // Sem `return`: o Vite trata a funcao devolvida por configureServer como um gancho pos-servidor.
  const attach = (server: { middlewares: { use: (fn: (req: { url?: string; headers: { host?: string } }, res: { setHeader: (k: string, v: string) => void }, next: () => void) => void) => unknown } }) => {
    server.middlewares.use((req, res, next) => {
      if (req.url?.startsWith('/lab/') && req.headers.host) res.setHeader('Content-Security-Policy', labContentSecurityPolicy(req.headers.host))
      next()
    })
  }
  return { name: 'lab-headers', configureServer: attach, configurePreviewServer: attach }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), labHeaders()],
})
