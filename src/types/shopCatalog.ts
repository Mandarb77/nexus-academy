/*
 * Gold shop catalog types — joined `shop_items` + `shop_tiers` query shape
 *
 * `max_purchases_per_chicago_school_day` pairs with `lib/schoolDayEastern.ts` limits in
 * the shop UI. `rank_requirement` lets high-tier cosmetics stay locked until promotion.
 */

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
