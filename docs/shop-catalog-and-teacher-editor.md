# Shop catalog and teacher Shop Manager

Developer notes for editable **Supply** (`/shop`) items: DB catalog, purchase RPC, and teacher admin at `/teacher/shop`.

**Related:** [developer-handoff-recent-work.md](./developer-handoff-recent-work.md), [quest-tiles-teacher-builder-and-backfill.md](./quest-tiles-teacher-builder-and-backfill.md).

**Landed on `main`:** commit `dd73779` (June 2026). Frontend deploys via Vercel; **048** / **049** must be applied on hosted Supabase separately (already applied on prod when this shipped — confirm with `npx supabase migration list`).

---

## What changed in `dd73779` (annotated)

| Area | Change |
|------|--------|
| **Before** | Student UI read `shop_items`, but `buy_shop_item` only handled `workshop_dj`, `phone_time`, `free_tardy`, and related hardcoded branches (**008**, **036**, **043**). |
| **After** | RPC loads any active catalog row by `item_key`; limits and gold come from columns on that row. |
| **Phone** | SKUs **deleted** from `shop_items` (not deactivated). |
| **Gates** | `is_locked` blocks purchase; `gate_requirement` is student-facing copy only. |
| **Teacher** | New `/teacher/shop` — CRUD, price, unlock, gate text, convenience band, semester stock, daily cap. |
| **Student** | `GoldShopPage` filters `is_active`; shows gate text and semester stock; handles `item_locked`, `semester_stock_exhausted`. |
| **Legacy RPC keys** | `workshop_dj`, `free_tardy` removed from DB in **049** (superseded by catalog items like `pick_class_playlist`, tardy pass). |

---

## Architecture

| Piece | Role |
|--------|------|
| `shop_tiers` | Convenience, Craft, Legacy (+ subtitle, sort_order) |
| `shop_items` | Catalog rows; student copy + rules |
| `buy_shop_item(item_key)` | Atomic purchase (gold, limits, inventory) |
| `shop_stock_status(item_id)` | Global semester remaining count |
| `GoldShopPage` | Student Supply UI |
| `TeacherShopPage` | Teacher CRUD |

**Not used:** Hardcoded `CASE` SKUs in old migrations (`workshop_dj`, `phone_time`, …). Migration **049** replaces RPC with catalog lookup.

**Removed:** Phone time SKUs hard-deleted in **049** (`phone_time_one_class_period`, legacy `phone_time`, etc.).

---

## `shop_items` columns

| Column | Purpose |
|--------|---------|
| `item_key` | Unique SKU for RPC + icons |
| `name`, `description` | Student card copy |
| `tier_id` | → `shop_tiers` |
| `price_gold` | Cost; `null` when locked with no price |
| `is_active` | `false` hides from Supply |
| `is_locked` | **Enforcement** — students cannot buy while true |
| `gate_requirement` | **Display only** when locked (e.g. “Mr. Cook keeps the key on this one. Talk to him.”) |
| `convenience_band` | `in_room` \| `out_of_room` (Convenience only) |
| `stock_per_semester` | Global cap; `null` = unlimited |
| `max_purchases_per_chicago_school_day` | Per-student daily cap (America/New_York) |
| `flavor_text`, `display_order` | Lore + sort |

`rank_requirement` may exist on older DBs; UI and RPC use **`gate_requirement` only**.

---

## Gates (your decisions)

- **Enforcement:** `is_locked` only — teacher toggles unlock in Shop Manager.
- **Copy:** `gate_requirement` shown on locked cards (Craft/Legacy).
- **No automated guild-gate engine yet.**

Legacy items can be **unlocked** and given a **price** like any other tier.

---

## Purchase RPC errors

| Error | Meaning |
|--------|---------|
| `item_locked` | `is_locked = true` |
| `not_for_sale` | Inactive or `price_gold` null |
| `insufficient_gold` | Profile gold too low |
| `daily_purchase_limit` | Already bought today (Eastern) |
| `semester_stock_exhausted` | Global `stock_per_semester` reached |

---

## Migrations

| File | Purpose |
|------|---------|
| `048_shop_catalog_baseline.sql` | Tables, columns, RLS, `gold_purchases.shop_item_id` |
| `049_shop_catalog_seed_and_buy_rpc.sql` | Prod-like seed, phone delete, `buy_shop_item`, `shop_stock_status` |

Apply on hosted Supabase like other migrations (`db query` + `migration repair` if needed).

**048 pitfall:** If `shop_items` already existed, `CREATE TABLE IF NOT EXISTS` does not add new columns — **048** uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for `gate_requirement`, `stock_per_semester`, `convenience_band`. Run **048** before **049**.

---

## Teacher page (`/teacher/shop`)

Create / edit / delete items. Delete confirm: `Delete '[name]' permanently?`

Defaults on create: tier-based price, Legacy starts locked.

---

## Student Supply

- Only `is_active = true` rows.
- Locked: button “Locked” + `gate_requirement` if set.
- Stock: “N of M left this semester” via `shop_stock_status`.

---

## Pitfalls

| Symptom | Cause |
|---------|--------|
| Purchase always `unknown_item` | Old hardcoded RPC — apply **049** |
| Phone still listed | Re-run **049** delete or remove row in Shop Manager |
| Stock count wrong | Purchases missing `shop_item_id` (pre-catalog rows) |

---

## Files

```
supabase/migrations/048_shop_catalog_baseline.sql
supabase/migrations/049_shop_catalog_seed_and_buy_rpc.sql
src/pages/TeacherShopPage.tsx
src/pages/GoldShopPage.tsx
src/lib/shopCatalogDefaults.ts
src/types/shopCatalog.ts
```
