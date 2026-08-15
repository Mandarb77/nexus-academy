/*
 * Gold shop catalog types — joined `shop_items` + `shop_tiers` query shape
 *
 * cap_period / fulfillment_kind / completion_reward_gold were added for Keeper's Duty
 * (and future duty SKUs): weekly vs semester windows reuse per_kid_semester_cap as the
 * count; duty_completion routes Kit away from redemption_requests into shop_duty_completions
 * with a gold-only teacher payout. Fields are optional so older selects before the
 * migration still type-check.
 */

export type ShopTierEmbed = {
  id: string
  name: string
  subtitle: string
  sort_order: number
}

export type ConvenienceBand = 'in_room' | 'out_of_room'

/** Window for `per_kid_semester_cap`. Default in DB is semester (unchanged legacy behavior). */
export type ShopCapPeriod = 'semester' | 'week'

/**
 * How inventory is fulfilled after purchase.
 * redemption = Use item → redemption_requests (privileges).
 * duty_completion = Mark complete → shop_duty_completions (+ completion_reward_gold).
 */
export type ShopFulfillmentKind = 'redemption' | 'duty_completion'

export type ShopCatalogItem = {
  id: string
  item_key: string
  name: string
  description: string
  tier_id: string
  price_gold: number | null
  is_active: boolean
  flavor_text: string | null
  purchase_moment_text: string | null
  is_locked: boolean
  display_order: number
  max_purchases_per_chicago_school_day: number | null
  convenience_band: ConvenienceBand | null
  stock_per_semester: number | null
  per_kid_semester_cap: number | null
  cap_period?: ShopCapPeriod | null
  fulfillment_kind?: ShopFulfillmentKind | null
  completion_reward_gold?: number | null
  per_kid_daily_rate_limit: number | null
  per_kid_rate_limit_days: number | null
  per_kid_lifetime_cap: number | null
  workshop_total_stock: number | null
  time_window_start: string | null
  time_window_end: string | null
  gate_requirement: string | null
  shop_tiers: ShopTierEmbed | ShopTierEmbed[] | null
}

export type ShopStockStatus = {
  limited: boolean
  limit?: number
  sold?: number
  remaining?: number
}

export type ShopLimitStatus = {
  item_id: string
  allowed: boolean
  error_code?: string | null
  disabled_message?: string | null
  messages: string[]
  /** Period purchase count (semester or week depending on cap_period). Key kept for older UI. */
  semester_count?: number | null
  semester_cap?: number | null
  /** Echoed from shop_items so the shop can word remaining/limit messages correctly. */
  cap_period?: ShopCapPeriod | null
  today_count?: number | null
  daily_limit?: number | null
  lifetime_count?: number | null
  lifetime_cap?: number | null
  workshop_stock_limit?: number | null
  workshop_stock_remaining?: number | null
  time_window_start?: string | null
  time_window_end?: string | null
}
