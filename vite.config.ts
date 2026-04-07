import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  /** Load `.env` from the project root (same folder as this file). */
  envDir: __dirname,
  plugins: [
    react(),
    {
      name: 'html-cache-bust',
      transformIndexHtml(html) {
        const t = Date.now()
        return html.replace(
          '</head>',
          `  <meta name="nexus-build" content="${t}" />\n  </head>`,
        )
      },
    },
    {
      name: 'nexus-dev-url-hint',
      configureServer(server) {
        server.httpServer?.once('listening', () => {
          const addr = server.httpServer?.address()
          const port = addr && typeof addr === 'object' ? String(addr.port) : '?'
          const root = process.cwd()
          // eslint-disable-next-line no-console -- intentional dev UX when port != 5173
          console.log(
            `\n\x1b[1m\x1b[33m[Nexus Academy]\x1b[0m Vite project root:\n  \x1b[1m${root}\x1b[0m\n` +
              `\nOpen: \x1b[1mhttp://localhost:${port}/\x1b[0m\n` +
              `Sanity check (must show text): \x1b[1mhttp://localhost:${port}/nexus-dev-verify.txt\x1b[0m\n` +
              `\x1b[33mIf 5173 was busy, Vite may use 5174+ — do not use a random localhost port.\x1b[0m\n` +
              `Stop old Vite: \x1b[1mpkill -f vite\x1b[0m then \x1b[1mnpm run dev\x1b[0m again.\n`,
          )
        })
      },
    },
  ],
  server: {
    port: 5173,
    /** If 5173 is taken (e.g. another `npm run dev`), use the next free port instead of failing. */
    strictPort: false,
    open: true,
    /** Reduce chance Firefox serves a cached dev bundle from an old session. */
    headers: {
      'Cache-Control': 'no-store',
    },
  },
})
