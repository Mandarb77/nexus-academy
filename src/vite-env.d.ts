/*
 * Vite client typings — extends `import.meta.env` for TypeScript
 *
 * Lists public env vars exposed to the browser (`VITE_*`). Values come from `.env`
 * at build/dev time; this file does not set secrets — it only types what the app
 * reads in `lib/supabase.ts` and elsewhere. Add new `VITE_` keys here when you
 * introduce them so `import.meta.env` stays type-safe.
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Email allowed to see Void Navigators Tile 1 prototype (coming-soon bypass). */
  readonly VITE_VOID_TILE1_PROTO_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
