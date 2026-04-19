/** Rows from `shop_items` with embedded `shop_tiers` (Supabase select). */
export type ShopTierEmbed = {
  id: string
  name: string
  subtitle: string
  sort_order: number
}

export type ShopCatalogItem = {
  id: string
  item_key: string
  name: string
  description: string
  tier_id: string
  price_gold: number | null
  is_active: boolean
  rank_requirement: string | null
  flavor_text: string | null
  is_locked: boolean
  display_order: number
  max_purchases_per_chicago_school_day: number | null
  shop_tiers: ShopTierEmbed | ShopTierEmbed[] | null
}
