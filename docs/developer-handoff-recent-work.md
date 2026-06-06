# Developer handoff — recent `main` work (June 2026)

This document explains **what changed on `main` recently and why**, so a new developer can orient without reading the full git history. Commits are listed newest-first; the big visual pass landed in **`b60734e`**.

**Production:** GitHub `main` → Vercel (`mandarb77-nexus-academy.vercel.app`). Supabase schema changes are **not** applied by deploy — run SQL migrations manually in the hosted project.

**Large quest/tile pass (WP/gold, DB backfill, Quest Builder):** → **[docs/quest-tiles-teacher-builder-and-backfill.md](./quest-tiles-teacher-builder-and-backfill.md)**

**Shop catalog (editable Supply, `/teacher/shop`):** → **[docs/shop-catalog-and-teacher-editor.md](./shop-catalog-and-teacher-editor.md)**

---

## Timeline (reference commits)

| Commit | Summary |
|--------|---------|
| `ce063bc` | **Prism Order quest tree (054):** 10 editable tiles; legacy Prism rows removed; `unlock_after_any_slugs` (boss opens after **one** Tier 2 capstone — 7A or 7B); guild accent `#378ADD`. Prod: `db query` + `migration repair 054`. |
| `b1f863b` | **Guild accordion UX:** one guild open at a time; quest panel fills page height below the five-tile nav strip (`SkillTreePage` + `App.css`). |
| `10ff3ae` | **Quest sequential unlock (053):** `tiles.unlock_after_slugs`; Forge + Silicon linear gates; `tileUnlock.ts`, `QuestLockedGate`, patent routes gated. |
| `1fe462f` | **Guild accordion (first pass):** all five guilds always visible in top row; quests in scroll panel below. |
| `bb22502` | **Silicon Covenant unlocked** on skill tree (`isGuildComingSoonForUser` → false for all guilds). |
| `b0ecabd` | **Silicon Covenant quest tree (052):** 8 tiles; `platform` / `technique` chips; Path B placeholder step. |
| `2673d0c` | **Forge quest tree (051):** 8 tiles; `slug`, `chips`, `sort_order`; legacy Forge rows deleted FK-safe. |
| `10596e9` | **Field Guide** nav rename (`Archive` → `Field Guide`, route `/resources` unchanged); **tool glossary (050)** + `/teacher/tools`. |
| `dd73779` | **Shop catalog (048–049):** editable `shop_items`, catalog `buy_shop_item`, teacher **Shop Manager** (`/teacher/shop`), phone SKUs hard-deleted. **Quest tiles (046–047):** tile metadata + `patents.field_6`, canonical `steps` backfill, DB-driven `patentLedgerContent`, Quest Builder on all tiles — [shop](./shop-catalog-and-teacher-editor.md), [quests](./quest-tiles-teacher-builder-and-backfill.md). |
| `02f4d8a` | **Quest payouts (045):** `quest_kind` / `is_core`, WP/gold rescale, semester gold reset UI on Reset page. |
| `2ebb2e4` | Void Navigators quests visible to **all** students (not email-gated on skill tree). |
| `5fb5cc4` | Teacher submission alerts (banner + chime); student approval chime added. |
| `a8b1a3a` | Removed long instructional subtitle on Teacher panel. |
| `bd46fe0` | Teacher pages use bench chrome; OS dark mode no longer tints teacher UI purple. |
| `3973846` | Dispatch rebuilt as **Where You Are** flip-card grid (`/powerups`). |
| `b60734e` | **PatentLedger**, bench chrome, nav rename, shop/guild tiles, patent migrations 043/044. |

Older Void prototype work lives on branch `void-tile1-proto` and in `docs/void-tile1-prototype.md` (partially superseded on `main` — see [Void guild](#void-navigators-guild) below).

---

## Design systems (two chrome families)

### 1. Machinist's Bench — `.bench-chrome`

**Why:** Student + teacher app chrome was purple/black and felt like a generic SaaS app. Bench chrome is a warm “workshop” shell: tan ground, cream panels, flat 2px corners, no shadows, guild color only as thin accents.

**Tokens:** `src/index.css` (`--color-ground`, `--color-panel`, `--font-ui`, `--font-display`, `--font-mono`, guild accent colors). Bench pages **ignore** `prefers-color-scheme: dark` for those tokens.

**Styles:** `src/App.css` block starting at `Machinist's Bench redesign`. Rules are **appended late** so they override legacy purple gradients and dark-mode `:root` overrides.

**Critical fix (teacher purple bug):** `.bench-chrome` redefines legacy CSS variables (`--bg`, `--card-bg`, `--accent`, etc.) so components that still use `var(--card-bg)` do not flip to purple-black when the OS is in dark mode. `body:has(.bench-chrome)` keeps the page background warm.

**Apply the class on:** `app-shell bench-chrome` on student pages (home, guilds, shop, journey, inventory, resources, codex, login) and teacher pages (dashboard, teacher panel, reset, quests). **Dispatch** adds `where-you-are-page` for a charcoal grid background (exception to warm ground).

**Do not apply on:** Patent routes — they use `patent-paper-page` + `src/patentLedger.css` (cream paper, Cinzel/Crimson Pro). See `docs/patent-form-strings.md` for copy source of truth.

### 2. Patent ledger — separate from bench

**Why:** Patent forms are intentionally “paper” (cream sheet, ledger panels), not the workshop bench. Mixing bench tokens into patents was explicitly avoided.

**Entry:** `src/components/PatentLedger.tsx` + `src/lib/patentLedgerContent.ts` + `src/patentLedger.css`.

**Replaced (deleted):** `EmpathyForm`, `GenericPatentContent`, `PatentFlowBanner`, `PersonalGamePiecePatentContent`, `StickerPatentContent` — logic consolidated into `PatentLedger`.

**Routes:** `/patent-custom/:tileId`, `/patent-game-piece/:tileId`, `/patent-sticker/:tileId` still exist; pages wrap `PatentLedger`.

**DB (apply in Supabase if missing):**

- `043_patent_record_row_and_signature.sql` — `field_5`, `maker_signature_url` on `patents`
- `044_patents_delivery_url.sql` — `delivery_url` on `patents`
- `046_tile_quest_metadata_and_patent_field6.sql` — `field_6` (“Who taught you?”), tile metadata columns — see [quest tile notes](./quest-tiles-teacher-builder-and-backfill.md)

Ledger reads/writes these best-effort; UI works without migration but those fields won't persist.

**Per-tile checklist copy** now lives on `tiles.steps` (backfill **047**). Resolver: `src/lib/patentLedgerContent.ts` (no longer branches on hardcoded step arrays for flagship quests).

---

## Student navigation rename

**Why:** IA matches workshop metaphor (less “gamified SaaS” labeling).

| Old (rough) | New (`MainNav.tsx`) | Route |
|-------------|---------------------|-------|
| Home | Workshop | `/` |
| Journey | Record | `/journey` |
| Skills | Guilds | `/tree` |
| Shop | Supply | `/shop` |
| Inventory | Kit | `/inventory` |
| Resources | Field Guide | `/resources` |
| Power Ups | Dispatch | `/powerups` |

**Guild list UI:** `SkillTreePage` — **nav strip + expansion panel** (June 2 pass):

- All **five guilds** stay visible in a top row (`skill-tree-guilds-nav` grid).
- **One guild open at a time** — `openGuildKey: string | null`; clicking toggles; quest list renders in a single tall panel below (`skill-tree-guilds-expand`, `flex: 1`, full viewport height).
- Compact `GuildMark` tiles (not full-width banners). Per-guild deep link: `/tree/:guildSlug` (`GuildSkillTreePage`).

**Quest unlock on tree + patents:** `tiles.unlock_after_slugs` (all required) and `tiles.unlock_after_any_slugs` (any one — Prism boss). Resolver: `src/lib/tileUnlock.ts`; UI: `SkillTilesList`, `QuestLockedGate`. Unlock = **teacher-approved** `skill_completion` on prerequisite slug(s). Details: [quest tile notes](./quest-tiles-teacher-builder-and-backfill.md#guild-quest-trees-051054-june-2).

**Shop (Supply):** `GoldShopPage` + `ShopTierBoard` — catalog from `shop_items` / `shop_tiers` (not hardcoded RPC SKUs). Locked items use `is_locked` + optional `gate_requirement` copy. Teacher edits at `/teacher/shop` — see [Shop catalog](#shop-catalog-048049).

**Student home:** `StudentHomePage` — status-focused (“Your status”); guild mark grid on home was removed in favor of Guilds nav.

---

## Dispatch — “Where You Are” (`/powerups`)

**Why:** Replaced placeholder Maine/WP lore and Louise Green dossier with a culture page: local makers/places, **no WP, no assessment language**.

**Files:**

- `src/pages/PowerUpsPage.tsx` — page shell
- `src/lib/whereYouAreCards.ts` — card copy (edit here to add cards)
- `src/components/WhereYouAreCard.tsx` — 3D flip on tap
- `src/App.css` — `.where-you-are-*`, `.where-card-*` (dark background)

**Legacy:** `PowerUpsTabsNav.tsx` is unused after rebuild; safe to delete in a cleanup PR.

---

## Teacher experience

### Bench chrome on teacher routes

**Why:** Teachers were still on legacy purple/dark theme while students moved to bench.

**Pages:** `DashboardPage`, `TeacherPanelPage`, `TeacherResetPage`, `TeacherQuestsPage` — all `bench-chrome teacher-panel-page`.

**Nav:** `MainNav variant="teacher"` — Dashboard, Teacher, Reset, Quests, **Shop** (`/teacher/shop`), **Preview as student** (toggles `studentPreviewMode` in `AuthContext`, navigates to `/`).

### Student preview banner

**Why:** Teachers browse as students with the same Google session; need an obvious exit.

**File:** `src/components/StudentPreviewBanner.tsx` — sticky bench-styled bar; **Exit preview →** `/dashboard`.

**Guards:** `StudentOnlyRoute` allows teachers when `studentPreviewMode`; `TeacherDashboardRoute` blocks dashboard while preview is on.

### Teacher panel copy

**Why:** Operator request — no long how-to paragraph under the title.

Removed the multi-sentence subtitle from `TeacherPanelPage`; approval queues speak for themselves.

### Teacher submission alerts (global)

**Why:** Symmetry with student “Quest Approved!” toast — teachers need **visual + audio** when something enters a pending queue.

**Files:**

| File | Role |
|------|------|
| `TeacherSubmissionAlertSync.tsx` | Realtime on `patents`, `skill_completions`, `redemption_requests` → refresh snapshot |
| `fetchTeacherPendingSnapshot.ts` | Lightweight pending-id fetch + student/tile labels |
| `teacherPendingSnapshot.ts` | Diff vs previous snapshot; batch new rows (~400ms) |
| `teacherSubmissionAlert.ts` | Queue toast + `localStorage` + session dedupe |
| `TeacherSubmissionAlertHost.tsx` | Fixed banner for signed-in teachers (not in preview) |
| `TeacherSubmissionBanner.tsx` | UI: “Needs your review”, link to `/teacher` |
| `alertSound.ts` | Web Audio chimes (no asset files) |

**Queues covered:** plan approvals, checklist approvals, skill completions (final packet), redemption requests.

**Student side:** `approvalCelebration.ts` now calls `playApprovalChime()` when a skill is approved (existing green banner unchanged).

**Browser note:** Audio may require one user click on the page first (autoplay policy).

**Mounted in:** `App.tsx` next to `ApprovalCelebrationHost` / `ApprovalCelebrationSync`.

### Quest Builder + WP/gold scale

**Route:** `/teacher/quests` — `TeacherQuestsPage.tsx` (bench chrome).

**Why:** Teachers author every tile in one place; payouts and quest type align with **045**; flagship quests no longer depend on TS-only checklists.

**Details (migrations, `checklist_state` contract, generator script, pitfalls):** [quest-tiles-teacher-builder-and-backfill.md](./quest-tiles-teacher-builder-and-backfill.md)

**Semester gold reset:** `TeacherResetPage.tsx` — halve student gold only (WP unchanged); RPCs in **045**.

**Landed on `main`:** `02f4d8a` (045 + Reset UI), `dd73779` (046–047 + builder/patent resolver). Full migration and checklist contract: [quest-tiles-teacher-builder-and-backfill.md](./quest-tiles-teacher-builder-and-backfill.md).

---

## Shop catalog (048–049)

**Why:** Production had a full `shop_items` table and student UI, but `buy_shop_item` still only recognized four hardcoded keys from migrations **008** / **036** / **043** — most catalog purchases returned `unknown_item`. Phone-time SKUs were removed from the program entirely.

**Landed on `main`:** `dd73779`. **Hosted Supabase:** **048** and **049** applied via SQL + `migration repair` (same pattern as **045–047**).

### Product decisions (locked in for this pass)

| Topic | Behavior |
|--------|----------|
| Phone time | **Hard delete** — not `is_active = false`. Keys removed in **049**: `phone_time`, `phone_time_one_class_period`, plus legacy RPC-only keys `workshop_dj`, `free_tardy`. |
| Gates | **`is_locked` only** enforces “cannot buy.” **`gate_requirement`** is display copy on locked cards (no guild/rank engine). |
| Legacy tier | Teachers may set **price** and **unlock** like any other item. |
| Rank column | Older DBs may have `rank_requirement`; app and RPC use **`gate_requirement` only**. |

### Schema and RPC

| Migration | Role |
|-----------|------|
| `048_shop_catalog_baseline.sql` | `shop_items` / `shop_tiers` (idempotent), new columns (`convenience_band`, `stock_per_semester`, `gate_requirement`), teacher RLS, `gold_purchases.shop_item_id` |
| `049_shop_catalog_seed_and_buy_rpc.sql` | Prod-like seed (`ON CONFLICT item_key`), phone delete, **`buy_shop_item`** reads catalog row, **`shop_stock_status`** for semester caps |

**Purchase flow:** `buy_shop_item(item_key)` → load row → `is_active`, `is_locked`, `price_gold`, per-student daily limit (America/New_York), global `stock_per_semester` → debit gold, `gold_purchases` + `inventory` with `shop_item_id`.

### App surfaces

| Route | File | Role |
|-------|------|------|
| `/shop` | `GoldShopPage.tsx` | Active items only; buy via RPC; errors `item_locked`, `semester_stock_exhausted`, etc. |
| `/teacher/shop` | `TeacherShopPage.tsx` | Create / edit / **hard delete**; price, lock, gate text, band, stock, daily cap |
| — | `GameShopCard.tsx`, `ShopTierBoard.tsx` | Gate copy on lock; semester stock label |
| — | `shopCatalogDefaults.ts`, `shopItemKey.ts` | Tier defaults + slugify on create |

**Teacher nav:** `MainNav.tsx` — **Shop** link for `variant="teacher"`. **Route:** `App.tsx` → `/teacher/shop`.

**Details:** [shop-catalog-and-teacher-editor.md](./shop-catalog-and-teacher-editor.md)

---

## Void Navigators guild

### Skill tree (current `main` behavior)

**Why:** Class should see Void quests in production, not only a prototype tester email.

- `isGuildComingSoonForUser()` — returns **false** for all guilds (Silicon Covenant unlocked with migration **052**).
- **Void Navigators** shows all rows in `tiles` where `guild = 'Void Navigators'`.
- Quest data comes from Supabase; empty list → error pointing at migrations **039** and **040**.

### Prototype email (still used, narrower scope)

`VITE_VOID_TILE1_PROTO_EMAIL` + `canAccessVoidTile1Proto()` — **no longer** unlocks the skill tree.

**Still used in:** `PatentLedger.tsx` — `bypassApprovals` for Void patent flow testing (auto-approve gates for that one login). See `docs/void-tile1-prototype.md` for env/deploy caveats.

**Tile copy/helpers:** `src/lib/voidTile1Proto.ts` (steps, checklist footer; `filterVoidTilesForProto` still filters guild rows if called — skill tree no longer calls it).

**Migrations:**

- `039_void_tile1_coaster_proto.sql` — coaster quest
- `040_void_tile2_holder_quest.sql` — holder quest
- `042_void_tile2_steps_v2.sql` — step updates if present

---

## Guild marks and assets

**Why:** Replace heavy banner images on guild list with SVG marks; banners kept small on per-guild quest home only.

- `src/components/GuildMark.tsx` — forge/prism/folded/silicon/void marks
- `src/lib/guildBannerAssets.ts` — PNG paths for guild page thumbs only
- **Prism accent** (`--color-prism`): `#378ADD` in `src/index.css` (June 2; was `#3D5A8A`)

---

## Guild quest trees in DB (051–054, June 2)

**Why:** Flagship guild curricula move out of TS/JSX into editable `tiles` rows — same pattern as Void: `slug`, `sort_order`, `chips`, `tile_description`, `recipient_guidance`, `steps`, unlock columns.

| Migration | Guild (`tiles.guild`) | Tiles | Notes |
|-----------|----------------------|-------|-------|
| **051** | `Forge` | 8 | Tinkercad/Fusion chips; gate = tile 3; parallel Tier 2 gates; boss needs both gates |
| **052** | `Silicon Covenant` | 8 | `platform` / `technique` chips; same unlock shape as Forge |
| **053** | — | — | `unlock_after_slugs` column + Forge/Silicon unlock seeds |
| **054** | `Prism` | 10 | Laser/Glowforge/Cuttle chips; **Preservation** (6A→7A) vs **Utility** (6B→7B) paths; boss via `unlock_after_any_slugs` (7A **or** 7B) |

**Display name vs DB:** Skill tree section key is `Prism`; welcome copy uses **Prism Order** (`guildWelcomeCopy.ts`). Silicon/Void use full guild string in DB (`Silicon Covenant`, `Void Navigators`).

**No path/branch column yet:** Prism Tier 2 shows both paths; student completes one track; boss opens after either capstone. Mutual-exclusion UI not built — both path entry tiles unlock after the gate.

**Legacy row cleanup:** 051/054 delete guild rows where `slug is null` (after clearing `patents` / `skill_completions` FKs). Removes old Forge intro skills and Prism pop-up card quest.

**Prod apply:** Duplicate migration numbers **039–044** still block clean `supabase db push`. Apply new migrations with `npx supabase db query --linked -f supabase/migrations/NNN_….sql` then `npx supabase migration repair NNN --status applied`. **054** applied this way on hosted Supabase.

Full unlock/chip/slug reference: [quest-tiles doc — guild trees](./quest-tiles-teacher-builder-and-backfill.md#guild-quest-trees-051054-june-2).

---

## Tool glossary (050)

**Why:** Kid-facing hints for tile tool-chips (teacher-authored; students will look up by `tool_name` when click-to-hint ships).

| Route | File | Role |
|-------|------|------|
| `/teacher/tools` | `TeacherToolGlossaryPage.tsx` | CRUD on `tool_glossary` (`tool_name`, `software`, `hint`, `active`) |
| — | 12 Tinkercad seeds in **050** | `tool_name` must match chip `label` exactly |

---

## June 2, 2026 — session checklist

What landed on `main` and prod in this pass:

1. **Forge** — full quest tree in DB (**051**); UI reads `chips` + `sort_order`.
2. **Silicon Covenant** — full quest tree (**052**); guild no longer “coming soon”.
3. **Quest gating** — sequential unlock (**053**); approved completions on prerequisite slugs.
4. **Guild accordion** — five-tile nav strip; one panel open; tall quest area (**`1fe462f`**, **`b1f863b`**).
5. **Prism Order** — 10 tiles (**054**); OR boss unlock; accent color; prod applied.
6. **Field Guide** rename + **tool glossary** (**050**, **`10596e9`**).

**Not in this pass (deferred):** Folded/Prism/Void `unlock_after` seeds beyond what 053 already set; teacher UI for `unlock_after_slugs` / `chips` / `slug`; Prism path mutual-exclusion; duplicate **039–044** migration renumber for clean `db push`.

---

## Global app wiring (`App.tsx`)

Four headless “sync/host” pairs mount once under `AuthProvider`:

1. **Student approval celebration** — `ApprovalCelebrationSync` + `ApprovalCelebrationHost`
2. **Teacher submission alert** — `TeacherSubmissionAlertSync` + `TeacherSubmissionAlertHost`

Do not mount these per-page; add new global realtime UX here.

---

## Common pitfalls

| Symptom | Likely cause |
|---------|----------------|
| Production still looks purple/old | Browser cache — hard refresh; confirm Vercel deployed latest `main` commit. |
| Teacher UI purple on dark OS | Missing `bench-chrome` on shell or old bundle without token lock in `.bench-chrome`. |
| Void shows “Coming soon” | Old JS bundle, or `isGuildComingSoonForUser` still true (should be false for all guilds since `bb22502`). |
| All quests open / none locked | **053** not applied, or `unlock_after_slugs` empty on tiles. |
| Prism boss never opens | Need approved **7A or 7B** (not both); check `unlock_after_any_slugs` on `prism-boss`. |
| Guild panel tiny / many accordions open | Old bundle before **`b1f863b`** — hard refresh. |
| `db push` fails on 039 | Duplicate version numbers **039–044** — use `db query` + `migration repair` per migration. |
| Patent save missing fields | Migrations 043/044 not applied on hosted Supabase. |
| Wrong checklist step checked off | `tiles.steps` order/count changed without matching `patents.checklist_state` — see [quest tile notes](./quest-tiles-teacher-builder-and-backfill.md). |
| Quest Builder empty / save fails | **046** not applied; or column missing in select. |
| Shop purchase `unknown_item` | **049** not applied — RPC still hardcoded to old four SKUs. |
| Phone item still visible | **049** delete not run, or row re-added manually. |
| Locked item won’t unlock for students | Set `is_locked = false` and a numeric `price_gold` in Shop Manager (null price → `not_for_sale`). |
| No teacher chime | Tab not focused / no prior click; check Realtime enabled on tables. |
| `npm run deploy` fails locally | Vercel token; production usually deploys via GitHub → Vercel integration, not local CLI. |

---

## Where to change things next

| Goal | Start here |
|------|------------|
| Add Dispatch card | `src/lib/whereYouAreCards.ts` |
| Nav label / route | `src/components/MainNav.tsx`, `src/App.tsx` |
| Bench colors / typography | `src/index.css` tokens, `src/App.css` `.bench-chrome` |
| Patent form copy/fields | `src/lib/patentLedgerContent.ts`, `PatentLedger.tsx`, `docs/patent-form-strings.md` |
| Quest type / WP/gold / tile brief / steps | `TeacherQuestsPage.tsx`, `questKindScale.ts`, [quest tile notes](./quest-tiles-teacher-builder-and-backfill.md) |
| Teacher alert copy/sound | `TeacherSubmissionBanner.tsx`, `alertSound.ts` |
| New guild quest tree | New migration with `slug` upsert (see **051** / **052** / **054**); set `unlock_after_slugs` in **053** or same file |
| Quest unlock / gating | `tiles.unlock_after_slugs`, `unlock_after_any_slugs`; `src/lib/tileUnlock.ts` |
| Guild accordion layout | `SkillTreePage.tsx`, `App.css` `.skill-tree-guilds-*` |
| New guild quest (single tile) | `/teacher/quests` or migration; regenerate **047** if copying from `src/lib/*.ts` |
| Shop item / price / lock / stock | `/teacher/shop` or `shop_items` SQL; defaults in `shopCatalogDefaults.ts` |
| Supply card copy or tier | `TeacherShopPage` or seed in **049** |
| Tool-chip hint copy | `/teacher/tools` or `tool_glossary` (**050**); `tool_name` must match chip label |
| Coming soon guild | `isGuildComingSoonForUser` in `voidProtoAccess.ts` |

---

## Related docs

- `docs/quest-tiles-teacher-builder-and-backfill.md` — WP/gold scale, 045–047, DB backfill, Quest Builder, checklist contract
- `docs/shop-catalog-and-teacher-editor.md` — Supply catalog, 048–049, gates, purchase RPC
- `docs/patent-form-strings.md` — patent field strings
- `docs/void-tile1-prototype.md` — Void Tile 1 prototype history (email gate, Preview deploy); **skill-tree gate section is outdated on `main`**
