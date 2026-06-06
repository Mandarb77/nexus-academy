# Quest tiles, WP/gold scale, and teacher Quest Builder

Developer notes for the **June 2026** pass that unified quest content in Supabase, scaled payouts by quest type, and expanded `/teacher/quests`. Read this before editing flagship quests (game piece, sticker, pop-up, Void, T-shirt) or changing checklist copy.

**Related:** [developer-handoff-recent-work.md](./developer-handoff-recent-work.md) (bench chrome, PatentLedger shell), [patent-form-strings.md](./patent-form-strings.md) (student-facing patent labels).

**Commits on `main`:**

| Commit | Scope |
|--------|--------|
| `ce063bc` | Migration **054** (Prism Order tree), `unlock_after_any_slugs`, `tileUnlock.ts` OR logic |
| `10ff3ae` | Migration **053** (`unlock_after_slugs`), Forge + Silicon unlock seeds, `QuestLockedGate` |
| `2673d0c` / `b0ecabd` | Migrations **051** (Forge), **052** (Silicon Covenant) — slug/chips/sort_order quest trees |
| `02f4d8a` | Migration **045** + `questKindScale.ts` + semester gold reset on `TeacherResetPage` |
| `dd73779` | Migrations **046–047**, DB-driven patent resolver, `TeacherQuestsPage` on all tiles, generator/verify scripts |

Frontend deploys via Vercel; migrations are manual on hosted Supabase.

---

## What changed in `dd73779` (046–047 + app)

| Area | Change |
|------|--------|
| **046** | `tile_description`, `recipient_guidance`, `level4_eligible`, `ledger_resources`; `patents.field_6` (“Who taught you?”) |
| **047** | Byte-stable backfill of flagship `tiles.steps` / resources / guidance from `src/lib/*.ts` (generator: `scripts/generate-tile-backfill-migration.ts`) |
| **PatentLedger** | Checklist copy from DB; quest brief + recipient hint; optional `field_6` save |
| **Quest Builder** | All tiles editable; smart WP/gold on type change; `is_core` from `required`; `level4_eligible` manual only |
| **Removed pattern** | `patentLedgerContent.ts` / `customTile.ts` no longer override flagship steps from TS at runtime |

---

## Why this change happened

1. **Payouts** should follow quest type (required / stretch / tier 2 / boss) on editable DB columns, not scattered constants.
2. **Teachers** need one editor for **all** tiles — not a split between “Quest Builder rows” and hardcoded TS checklists.
3. **Student patents** store checklist progress as `patents.checklist_state` — a boolean array **indexed by step order**. Changing step count or order without a migration plan breaks in-progress quests.

---

## Migrations (apply order on hosted Supabase)

| File | What it does |
|------|----------------|
| `045_wp_gold_scale_quest_kind.sql` | `quest_kind`, `is_core`; rescales `wp_value` / `gold_value`; semester gold reset RPCs |
| `046_tile_quest_metadata_and_patent_field6.sql` | `tile_description`, `recipient_guidance`, `level4_eligible`, `ledger_resources`; `patents.field_6` (“Who taught you?”) |
| `047_backfill_tile_content_from_code.sql` | Copies canonical steps/resources/guidance from `src/lib/*.ts` into `tiles`; **fails if any patent’s `checklist_state` length ≠ `steps` length** |

**Production note:** Migrations **039–044** may still be pending on remote if `db push` hit duplicate version numbers (`039`, `042`, `043` each have two files). **045** (`02f4d8a`) and **046–047** (`dd73779`) were applied on prod via `supabase db query` + `migration repair` — verify with `npx supabase migration list`.

**Regenerating 047:** Do not hand-edit step JSON in `047_*.sql`. Change canonical copy in TypeScript, then:

```bash
npx tsx scripts/generate-tile-backfill-migration.ts
```

Review the diff, then apply (SQL Editor or `db query`). Re-run verification (below) before calling it done.

---

## `tiles` table — columns that matter

| Column | Purpose |
|--------|---------|
| `guild`, `skill_name` | Unique together; full guild names (`Void Navigators`, not “Void”) |
| `wp_value`, `gold_value` | **Authoritative payouts** at skill approval (triggers copy to `skill_completions.wp_awarded` / `gold_awarded`) |
| `quest_kind` | `required` \| `stretch` \| `tier2` \| `boss` |
| `is_core` | Tier 1 **required core** flag (`true` when `quest_kind = required` on save from Quest Builder) |
| `level4_eligible` | **Independent** — A-gate eligibility; teacher sets per tile; **not** auto-changed on tier change |
| `tile_description` | Student brief on **skill tree** + **patent plan** (“Quest brief”) |
| `recipient_guidance` | Student hint on patent **plan** panel (per-tile prose) |
| `steps` | JSONB `[{ description, requiresApproval, resourceUrl?, resourceLabel? }]` — null = mark-complete intro tile |
| `ledger_resources` | JSONB `[{ label, url }]` — extra resource buttons (game piece TinkerCAD links, pop-up template sites, etc.) |
| `checklist_footer_note` | Text under checklist (replay rules, tier notes) |
| `wp_display`, `gold_display` | Optional **text** on tree cards (e.g. Void holder “WPT” / “GDP”) |
| `subtitle` | Short tooltip on tile **title** (hover) |
| `slug` | Stable id for idempotent seeds and unlock references (e.g. `forge-01-marks-home`) — **051** |
| `sort_order` | Display order within guild on skill tree (lower first) — **051** |
| `chips` | JSONB `[{ label, kind }]` — tool/resource chips on tree cards (`tinkercad_tool`, `platform`, `technique`, …) — **051** |
| `unlock_after_slugs` | Prerequisite slugs; **all** must be teacher-approved before tile opens — **053** |
| `unlock_after_any_slugs` | Prerequisite slugs; **any one** approved unlocks tile (Prism boss) — **054** |

There is **no** `wp_awarded` on `tiles` — only on `skill_completions` after approval.

**Unlock rule:** `src/lib/tileUnlock.ts` checks `skill_completions.status = 'approved'` on prerequisite tile ids resolved via `slug`. Used on skill tree (`SkillTilesList`) and patent entry (`QuestLockedGate`).

### Default payouts by `quest_kind` (also in `src/lib/questKindScale.ts`)

| `quest_kind` | WP | Gold |
|--------------|-----|------|
| `required` | 10 | 3 |
| `stretch` | 6 | 13 |
| `tier2` | 10 | 22 |
| `boss` | 15 | 35 |

---

## Guild quest trees (051–054, June 2)

Full guild curricula are **editable `tiles` rows** — not hardcoded in React. Each tree migration:

1. Adds schema columns if needed (`slug`, `chips`, `sort_order` in **051**; unlock columns in **053** / **054**).
2. Deletes legacy guild rows where `slug is null` (FK-safe: `patents` + `skill_completions` first).
3. `INSERT … ON CONFLICT (slug) DO UPDATE` for idempotent seeds.

### Forge (`051`, guild = `Forge`)

| Sort | Slug | `quest_kind` |
|------|------|----------------|
| 1–3 | `forge-01` … `forge-03-two-parts-gate` | required (3 = gate) |
| 4–5 | `forge-04` … `forge-05-borrowed-changed` | stretch |
| 6–7 | `forge-gate-a-cross-guild`, `forge-gate-b-reverse-engineer` | tier2 (parallel) |
| 8 | `forge-boss` | boss |

**Chips:** `tinkercad_tool`, `resource`, `fusion_option`.

**Unlock (053):** linear 1→2→3→4→5; gates 6+7 after tile 3; boss after **both** gates.

### Silicon Covenant (`052`, guild = `Silicon Covenant`)

8 tiles; chips use `platform` / `technique`. Same unlock shape as Forge (`silicon-01` … `silicon-boss`).

### Prism Order (`054`, guild = `Prism`)

| Sort | Slug | `quest_kind` |
|------|------|----------------|
| 1–3 | `prism-01` … `prism-03-layers-of-meaning` | required (3 = gate) |
| 4–5 | `prism-04` … `prism-05-borrowed-and-changed` | stretch (gold **12**, not 13) |
| 6–7 | `prism-path-a-archive`, `prism-path-a-restore-what-faded` | tier2 Preservation |
| 8–9 | `prism-path-b-thing-that-organizes`, `prism-path-b-place-for-everything` | tier2 Utility |
| 10 | `prism-boss` | boss |

**Chips:** `laser cutter` (technique), `Glowforge` + `Cuttle` (platform).

**Unlock:**

- Tier 1 linear through gate (same as Forge).
- 6A and 6B both unlock after gate (tile 3).
- 7A after 6A; 7B after 6B.
- Boss: `unlock_after_slugs = {}`, `unlock_after_any_slugs = {prism-path-a-restore-what-faded, prism-path-b-place-for-everything}` — **one path capstone** is enough.

**No `branch` column:** both paths visible; student may complete one track; UI does not hide the other path yet.

**Removed:** legacy Prism intro skills + pop-up card quest (no slug).

### Applying on hosted Supabase

```bash
npx supabase db query --linked -f supabase/migrations/054_prism_quest_tree.sql
npx supabase migration repair 054 --status applied
```

Same pattern for **051–053** if `db push` fails on duplicate **039–044** versions.

---

## Checklist / patent contract (do not break)

- `patents.checklist_state` is a JSON array of booleans: index `i` = step `i` in `tiles.steps`.
- **Game piece, sticker, pop-up** had real student data with **8** steps while `tiles.steps` was often `null` in DB; **047** backfilled steps from code **byte-for-byte** so indices stayed valid.
- **Pop-up canonical copy** is `src/lib/popUpCardQuest.ts` (step 2 says “resource links **below**”), not the older `035_prism_popup_card_quest.sql` wording (“in the app”).
- **Legacy T-shirt title:** some DBs have `Design a T-Shirt for Someone You Know` instead of `…In the Room`. **047** includes an `UPDATE` for Folded Path rows that fuzzy-match t-shirt quests.

**Verify after any step change:**

```bash
npx supabase db query --linked -f scripts/verify-patent-checklist-alignment.sql
```

Expect **zero rows**. The tail of `047` also runs this check and **aborts the migration** on mismatch.

---

## App architecture after backfill

### Single source of truth for checklist content

| Before | After |
|--------|--------|
| `patentLedgerContent.ts` branched on `isPersonalGamePieceTile`, `isPopUpCardTile`, etc. | Reads `tile.steps`, `recipient_guidance`, `checklist_footer_note`, `ledger_resources` from DB |
| `customTile.ts` overrode Void / pop-up steps from TS | `resolvedTileSteps()` = DB `steps` only |
| `journeyPatentReadView.ts` used hardcoded step strings | Uses `resolvedTileSteps()` |

**Routing helpers remain** (`gamePieceTile.ts`, `popUpCardQuest.ts`, `stickerTile.ts`, `voidTile1Proto.ts`) for **URLs only** (`/patent-game-piece` vs `/patent-custom` vs `/patent-sticker`). Step **text** should be edited in DB (or via generator → 047), not only in those files.

### Canonical TypeScript copy (still the “source” for regenerating SQL)

| Quest | File(s) |
|-------|---------|
| Personal game piece | `personalGamePieceSteps.ts`, resources in generator / `patentLedgerContent` history |
| Pop-up card | `popUpCardQuest.ts` |
| Sticker | `stickerSteps.ts` |
| Void coaster | `voidTile1Proto.ts` |
| T-shirt | `tShirtQuestSteps.ts` |
| Void holder (4 short steps) | `scripts/generate-tile-backfill-migration.ts` (`VOID_HOLDER_STEPS`) |

After editing these, regenerate **047** and re-apply if you intend to sync hosted DB.

### Student UI

- **Skill tree:** `tile_description` under tile name (`SkillTilesList.tsx`); loads via `useSkillTree` select.
- **PatentLedger:** “Quest brief” + `recipient_guidance`; fixed plan/record questions; optional **Who taught you?** → `patents.field_6` (migration **046**).

### Teacher Quest Builder (`/teacher/quests`)

**File:** `src/pages/TeacherQuestsPage.tsx`

- Lists **all** tiles (not only rows with `steps`).
- **Create:** changing quest type prefills WP/gold + default `recipient_guidance` (`defaultRecipientGuidanceForQuestKind`).
- **Edit:** changing type compares current WP/gold to **old type’s defaults** — silent snap if equal, `confirm()` if custom.
- **`is_core`:** auto from type on save (`required` → core); **`level4_eligible`:** checkbox only, never auto-flipped.
- Intro tiles: `steps` may be empty/null → **Mark complete** on tree (no patent flow).
- Patent tiles: need checklist steps in DB (from backfill or teacher-authored).

**Semester gold reset:** `TeacherResetPage.tsx` — RPCs `preview_semester_gold_reset`, `teacher_semester_gold_reset` (**045**).

---

## Semester gold reset (045)

- WP unchanged; student `gold = floor(gold * 0.5)`.
- Teacher-only RPCs; UI on **Reset** page with preview table + confirm.

---

## Common pitfalls

| Symptom | Likely cause |
|---------|----------------|
| Checklist ticks wrong step | Step order/count changed without aligning `checklist_state` or re-running safe backfill |
| Migration 047 fails | Existing patents with non-empty `checklist_state` and different `steps` length — fix data or adjust steps to match lengths first |
| Pop-up links missing | `ledger_resources` null on tile — re-run 047 or set in Quest Builder / SQL |
| `field_6` not saving | Migration **046** not applied |
| Tree empty after schema change | PostgREST error on unknown column — apply **046**; `useSkillTree` only requests columns that exist on prod |
| Teacher sees old step text | Hosted DB not updated; or browser cache — hard refresh |
| Intro tile shows patent button | `steps` non-empty in DB — clear `steps` in builder if tile should be mark-complete only |
| Quest locked but prerequisite done | Approval still `pending` — unlock needs **approved** completion |
| Boss locked after one Tier 2 path | Check `unlock_after_any_slugs` (Prism) vs `unlock_after_slugs` (Forge/Silicon need both gates) |
| Tree order wrong | `sort_order` on tiles; teacher list still sorts by `skill_name` |

---

## Where to change things

| Goal | Start here |
|------|------------|
| Default WP/gold / quest type labels | `src/lib/questKindScale.ts` |
| Flagship step copy (then sync DB) | `src/lib/*Steps.ts`, `popUpCardQuest.ts`, `voidTile1Proto.ts` → regenerate **047** |
| Teacher create/edit UX | `src/pages/TeacherQuestsPage.tsx` |
| Student plan hints / resources | `tiles.recipient_guidance`, `tiles.ledger_resources`, `tiles.steps` |
| Patent form fields (fixed questions) | `src/components/PatentLedger.tsx` |
| Payout on approval | `tiles.wp_value` / `gold_value` + approval triggers (migrations **037** / **038**) |
| Classify quest for 045 scale | `tiles.quest_kind` + SQL seeds in **045** |
| Guild tree seed / chips / unlock | Migrations **051–054**; `src/lib/tileUnlock.ts` |
| Skill tree lock UI | `SkillTilesList.tsx`, `QuestLockedGate.tsx` |

---

## Files added or central to this pass

```
supabase/migrations/045_wp_gold_scale_quest_kind.sql
supabase/migrations/046_tile_quest_metadata_and_patent_field6.sql
supabase/migrations/047_backfill_tile_content_from_code.sql  # generated
scripts/generate-tile-backfill-migration.ts
scripts/verify-patent-checklist-alignment.sql
src/lib/questKindScale.ts
src/lib/patentLedgerContent.ts          # DB-driven resolver
src/lib/customTile.ts                   # DB steps only
src/pages/TeacherQuestsPage.tsx         # full CRUD + metadata
src/pages/TeacherResetPage.tsx          # semester gold (045)
src/types/tile.ts                       # new tile + LedgerResource types
supabase/migrations/051_forge_quest_tree.sql
supabase/migrations/052_silicon_quest_tree.sql
supabase/migrations/053_tile_unlock_after_slugs.sql
supabase/migrations/054_prism_quest_tree.sql
src/lib/tileUnlock.ts                   # unlock_after_slugs + unlock_after_any_slugs
src/components/QuestLockedGate.tsx      # patent route gate
src/pages/SkillTreePage.tsx             # guild nav strip + single expansion panel
```
