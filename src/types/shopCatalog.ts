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
  gate_requirement: string | null
  shop_tiers: ShopTierEmbed | ShopTierEmbed[] | null
}

export type ShopStockStatus = {
  limited: boolean
  limit?: number
  sold?: number
  remaining?: number
}
