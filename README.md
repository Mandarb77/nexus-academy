# Nexus Academy at Kents Hill

Student maker-class web app: guild skill trees, patent (quest) packets, gold shop, teacher approvals. React + TypeScript + Vite, Supabase auth/data, deployed on Vercel.

## Developer orientation

**Start here for recent work (bench chrome, PatentLedger, Dispatch, teacher alerts, Void guild):**

→ **[docs/developer-handoff-recent-work.md](docs/developer-handoff-recent-work.md)**

**Quest tiles, WP/gold scale, teacher Quest Builder, DB backfill (`02f4d8a` / `dd73779`, migrations 045–047):**

→ **[docs/quest-tiles-teacher-builder-and-backfill.md](docs/quest-tiles-teacher-builder-and-backfill.md)**

**Shop catalog, teacher Shop Manager (`dd73779`, migrations 048–049):**

→ **[docs/shop-catalog-and-teacher-editor.md](docs/shop-catalog-and-teacher-editor.md)**

Other docs:

- [docs/patent-form-strings.md](docs/patent-form-strings.md) — patent field copy
- [docs/void-tile1-prototype.md](docs/void-tile1-prototype.md) — Void Tile 1 prototype history (partially superseded on `main`)

## Local setup

```bash
npm install
cp .env.example .env   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev            # open the Local: URL from the terminal (often :5173 or :5174)
```

Optional: `VITE_VOID_TILE1_PROTO_EMAIL` — patent approval bypass for one tester only (`PatentLedger`); does not gate the skill tree on `main`.

## Supabase

SQL migrations live in `supabase/migrations/`. Applying them to the hosted project is manual (SQL Editor or `supabase db push`). Deploying the frontend does **not** run migrations.

Patent ledger columns (if missing): `043_patent_record_row_and_signature.sql`, `044_patents_delivery_url.sql`, `046_tile_quest_metadata_and_patent_field6.sql`.  
Quest payouts / types / backfill: `045_wp_gold_scale_quest_kind.sql`, `047_backfill_tile_content_from_code.sql` (regenerate via `npx tsx scripts/generate-tile-backfill-migration.ts`).  
Shop catalog + catalog `buy_shop_item`: `048_shop_catalog_baseline.sql`, `049_shop_catalog_seed_and_buy_rpc.sql` (phone SKUs deleted in **049**).  
Tool-chip hints: `050_tool_glossary.sql` — teacher edits at `/teacher/tools`.  
Void quests (if empty guild): `039_void_tile1_coaster_proto.sql`, `040_void_tile2_holder_quest.sql`.  
After step changes: `scripts/verify-patent-checklist-alignment.sql` (expect zero rows).

## Production

- **Site:** `https://mandarb77-nexus-academy.vercel.app` (GitHub `main` → Vercel)
- After deploy, hard-refresh if UI looks stale (cached JS bundles)

## Stack notes

Built with Vite + React. ESLint/TypeScript config follows the default Vite template; see Vite docs for expanding lint rules.
