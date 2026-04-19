/** Presentation-only labels (no API / DB changes). */
export type ShopRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary'

/** Slight variety on Craft shelf: alternate Rare / Epic by row order. */
export function rarityForShelfItem(tierName: string, displayOrder: number): ShopRarity {
  const n = tierName.trim().toLowerCase()
  if (n === 'legacy') return 'Legendary'
  if (n === 'craft') return displayOrder % 2 === 0 ? 'Rare' : 'Epic'
  return 'Common'
}

/** Maps DB tier names to friendlier shelf titles from the design brief. */
export function displayShelfTitle(tierName: string): string {
  switch (tierName.trim()) {
    case 'Convenience':
      return 'Classroom Privileges'
    case 'Craft':
      return 'Maker Rewards'
    case 'Legacy':
      return 'Legendary Unlocks'
    default:
      return tierName
  }
}

export function iconVariantForItemKey(itemKey: string): string {
  const k = itemKey.toLowerCase()
  if (k.includes('phone')) return 'phone'
  if (k.includes('playlist') || k.includes('dj')) return 'playlist'
  if (k.includes('snack')) return 'snack'
  if (k.includes('tardy')) return 'tardy'
  if (k.includes('clean')) return 'broom'
  if (k.includes('premium') || k.includes('material')) return 'gem'
  if (k.includes('machine')) return 'gear'
  if (k.includes('sponsor') || k.includes('community')) return 'community'
  if (k.includes('commission')) return 'token'
  if (k.includes('gallery') || k.includes('dedicate')) return 'frame'
  if (k.includes('propose') || k.includes('tool')) return 'tool'
  if (k.includes('vocabulary') || k.includes('name_technique')) return 'book'
  if (k.includes('archive')) return 'archive'
  if (k.includes('locked') || k.includes('mystery')) return 'mystery'
  return 'star'
}
