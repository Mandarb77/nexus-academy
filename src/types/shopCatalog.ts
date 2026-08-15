/*
 * Gold shop catalog types — joined `shop_items` + `shop_tiers` query shape
 */

export type ShopTierEmbed = {
  id: string
  name: string
  subtitle: string
  sort_order: number
}

export type ConvenienceBand = 'in_room' | 'out_of_room'

export type ShopCapPeriod = 'semester' | 'week'

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
  semester_count?: number | null
  semester_cap?: number | null
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
