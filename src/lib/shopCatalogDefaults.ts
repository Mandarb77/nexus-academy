/*
 * Defaults for teacher Shop Manager create form.
 */

export type ShopTierName = 'Convenience' | 'Craft' | 'Legacy'
export type ConvenienceBand = 'in_room' | 'out_of_room'

export const SHOP_TIER_OPTIONS: ShopTierName[] = ['Convenience', 'Craft', 'Legacy']

export const CONVENIENCE_BAND_LABELS: Record<ConvenienceBand, string> = {
  in_room: 'In-room',
  out_of_room: 'Out-of-room',
}

export function defaultPriceForTier(tier: ShopTierName, band: ConvenienceBand | null): number {
  if (tier === 'Convenience') return band === 'out_of_room' ? 45 : 8
  if (tier === 'Craft') return 20
  return 200
}

export function defaultLockedForTier(tier: ShopTierName): boolean {
  return tier === 'Legacy'
}
