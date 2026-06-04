# Void Navigators — Tile 1 prototype handoff

> **Status on `main` (June 2026):** The **skill-tree email gate is removed** — all students see Void Navigators quests from the database. `VITE_VOID_TILE1_PROTO_EMAIL` still only affects **PatentLedger approval bypass** for testing. See **`docs/developer-handoff-recent-work.md`** for the full recent-work map.

Branch: **`void-tile1-proto`** (historical prototype branch)

Purpose: hardcoded end-to-end UX test for **Tier 1 required quest 1** (profile-cut coaster for a named person/pet) before building the full guild curriculum / modification path. Originally: one tester email, Preview-only on Vercel.

---

## What was built

| Piece | Location |
|-------|----------|
| Email-gated coming-soon bypass | `src/lib/voidProtoAccess.ts` |
| Quest copy, steps, tile detection | `src/lib/voidTile1Proto.ts` |
| DB seed (coaster tile row) | `supabase/migrations/039_void_tile1_coaster_proto.sql` |
| Guild page unlock + tile filter | `src/pages/GuildSkillTreePage.tsx`, `src/pages/SkillTreePage.tsx`, `src/pages/StudentHomePage.tsx` |
| Patent flow (plan → checklist → final) | `src/lib/customTile.ts` → `GenericPatentContent` at `/patent-custom/:tileId` |
| Void welcome copy | `src/lib/guildWelcomeCopy.ts` |
| Env typing | `src/vite-env.d.ts`, `.env.example` |
| Prototype badge CSS fix | `src/App.css` (`position: relative` on guild banner links) |

**Not built (intentionally):** tier metadata, gates between tiers, guild curriculum schema, production Void launch, or changes to `main`.

---

## How it works (historical prototype branch)

On **`void-tile1-proto`** branch only (superseded on `main` for skill tree):

1. **`VITE_VOID_TILE1_PROTO_EMAIL`** is baked into the JS bundle at **build time** (Vite `import.meta.env`).
2. **`canAccessVoidTile1Proto(user)`** compared that value to `user.email` from Supabase Auth (case-insensitive).
3. If true on `/tree/void`: skip coming-soon box, show Void tiles via **`filterVoidTilesForProto`**.

**On `main` today:**

- **`isGuildComingSoonForUser`** — only **Silicon Covenant** is “Coming soon”; Void shows all `Void Navigators` tiles.
- **`canAccessVoidTile1Proto`** — still used in **`PatentLedger`** for `bypassApprovals` during patent UX testing (not skill tree).
- Student patent flow → **`/patent-custom/:tileId`** → **`PatentLedger`** (plan → checklist → packet).

---

## Local development

```bash
# .env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_VOID_TILE1_PROTO_EMAIL=your-google-login@example.com
```

Restart Vite after changing `.env`.

Run migration **039** in Supabase SQL Editor if the tile row is missing.

---

## Vercel Preview (recommended test path)

### Environment variables

| Variable | Production | Preview |
|----------|------------|---------|
| `VITE_SUPABASE_URL` | ✓ | ✓ |
| `VITE_SUPABASE_ANON_KEY` | ✓ | ✓ |
| `VITE_VOID_TILE1_PROTO_EMAIL` | ✗ | ✓ |

After any env change: **Redeploy the Preview deployment** (`void-tile1-proto` branch). Vite inlines env vars at build time; old deploys do not pick up new values.

### Which URL to use

| URL | Use for |
|-----|---------|
| `mandarb77-nexus-academy.vercel.app` | Live **`main`** site — no Void prototype |
| Long Preview URL from **Deployments → Preview → Visit** | Void prototype test |

Preview URLs look like `mandarb77-nexus-academy-git-void-tile1-proto-….vercel.app` or `…-mr05cp7cl-….vercel.app`.

**Do not** redeploy **Production / `main`** when testing Void — use the **Preview** row for branch `void-tile1-proto`.

### Supabase OAuth on Preview

Add to **Authentication → URL Configuration → Redirect URLs**:

```text
https://*.vercel.app/auth/callback
```

Without this, Google sign-in can redirect to the **production** domain after login; the Preview bundle (with proto env var) is then never used.

Sign-in uses `window.location.origin + '/auth/callback'` in `AuthContext` — so the allowlist must include Preview origins.

---

## Challenges faced and how they were resolved

### 1. Void still “Coming soon” after setting Preview env var

**Cause:** Prototype code was staged locally but **not pushed**; Vercel Preview built old `main`-era logic (`isComingSoonGuildSection` with no email check).

**Fix:** Commit + push `voidProtoAccess.ts` and related files on `void-tile1-proto`.

---

### 2. Git commit appeared to “do nothing”

**Cause:** Broken heredoc (`<<'EOF'` must end with `EOF` on its own line); shell stayed in `>` continuation mode and swallowed pasted commands.

**Fix:** `Ctrl+C` to cancel, then simple one-line commit:  
`git commit -m "message"` → `git push`.

---

### 3. Every deployment listed as “Production”

**Cause:** Opening deployment details for **`main`** (Production · Current) instead of the **`void-tile1-proto`** Preview row. Production deploys are correct for `main`; prototype code lives on another branch.

**Fix:** Deployments list → row with **Preview** badge + branch **`void-tile1-proto`** → **Visit** on that row only.

---

### 4. Preview env var had no effect

**Cause:** `VITE_VOID_TILE1_PROTO_EMAIL` was **Preview-only**, but the site being tested was **Production** (wrong URL or OAuth redirect — see #6).

**Fix:** Test on Preview URL; keep proto email var Preview-only for long-term safety.

---

### 5. “Connect Supabase in `.env`” on Preview

**Cause:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` were scoped to **Production only** in Vercel. Preview builds had no Supabase config.

**Fix:** Enable **Preview** (and Production) for both Supabase vars; redeploy Preview.

---

### 6. After Google login, URL jumped to production domain

**Cause:** Supabase redirect allowlist did not include Preview `*.vercel.app` origins; auth fell back to Site URL (production).

**Fix:** Add `https://*.vercel.app/auth/callback` to Supabase Redirect URLs. Sign out, open Preview URL, sign in again; address bar should stay on Preview.

---

### 7. Preview build failed (`npm run build` exit 2)

**Cause:** Corrupted TypeScript in `gamePieceTile.ts` and `stickerTile.ts` (function headers lost during an earlier edit); missing `T_SHIRT_QUEST_SKILL_NAME` in `tShirtQuestSteps.ts`.

**Fix:** Restore full function exports; commit `b6987d5` “Fix TypeScript build errors for Vercel preview deploy”.

---

### 8. Migration 039 failed — `checklist_footer_note` does not exist

**Cause:** Class DB had not applied migrations 031/034; 039 assumed columns already existed.

**Fix:** 039 now runs `ALTER TABLE … ADD COLUMN IF NOT EXISTS` for `gold_value`, `steps`, and `checklist_footer_note` before insert.

---

### 9. “Prototype” badge appeared on Prism banner

**Cause:** CSS — badge uses `position: absolute`, but `position: relative` was only on `.student-home-guild-banner-link--coming-soon`. Unlocked Void lost `relative`, so the badge floated onto the wrong grid cell.

**Fix:** `position: relative` on all `.student-home-guild-banner-link` in `App.css`.

---

### 10. Vercel “Invalid git email address” warning

**Cause:** Local git used auto-generated `ccook@mba-y21wfv.local` as commit author; Vercel cannot link to GitHub user.

**Impact:** Cosmetic only — deploys still run.

**Optional fix:** `git config user.email "your-github-email@example.com"` in repo.

---

## Verification checklist

- [ ] Preview deployment **Ready** for branch `void-tile1-proto`
- [ ] Preview URL (long domain) — not production alias
- [ ] Signed in as email matching `VITE_VOID_TILE1_PROTO_EMAIL`
- [ ] Home: **Prototype** on Void banner (bottom row, violet art)
- [ ] `/tree/void`: welcome copy + coaster quest tile
- [ ] Patent opens at `/patent-custom/:tileId`
- [ ] Migration 039 applied in Supabase

---

## When moving beyond the prototype

**Done on `main`:** Void skill tree open to all students (`2ebb2e4`).

**Still open:**

1. Remove or narrow `canAccessVoidTile1Proto` when patent testing no longer needs bypass.
2. Implement tier metadata and sectioned guild UI (modification path).
3. Decide fate of `filterVoidTilesForProto` (unused on skill tree; can delete or repurpose for tier filtering).

---

## Related commits (reference)

- `e20d94c` — Void Tile 1 prototype + email gate
- `44930a3` — Trigger preview deploy (empty commit)
- `b6987d5` — Fix TypeScript build for Vercel
- (later) — Prototype badge CSS fix, optional debug banner on locked Void page
