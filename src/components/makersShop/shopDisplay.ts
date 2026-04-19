/** Guild welcome strip accents (see `.skill-tree-guild-welcome--*` in App.css). */
export type GuildShelfAccent = 'forge' | 'prism' | 'folded'

export function shelfAccentForTier(tierName: string): GuildShelfAccent {
  const n = tierName.trim().toLowerCase()
  if (n === 'convenience') return 'forge'
  if (n === 'craft') return 'prism'
  return 'folded'
}

/** First shelf stays “Conveniences”; other shelves use the catalog tier name. */
export function displayShelfTitle(tierName: string): string {
  if (tierName.trim() === 'Convenience') return 'Conveniences'
  return tierName.trim()
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
