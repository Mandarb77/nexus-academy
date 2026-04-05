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
  ],
  server: {
    port: 5173,
    strictPort: true,
    open: true,
  },
})
