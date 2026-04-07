/**
 * Main skill tree page shows these guilds in order (strings must match `tiles.guild` for live quests).
 * Prism, Silicon Covenant, and Void Navigators are listed even before tiles exist.
 */
export const SKILL_TREE_SECTION_GUILDS = [
  'Forge',
  'Prism',
  'Folded Path',
  'Silicon Covenant',
  'Void Navigators',
] as const

export function isComingSoonGuildSection(guildKey: string): boolean {
  const k = guildKey.trim().toLowerCase()
  return k === 'prism' || k === 'silicon covenant' || k === 'void navigators'
}

/** Normalize DB guild label to a URL-safe CSS modifier slug. */
export function skillTreeGuildModifier(guildKey: string): 'forge' | 'prism' | 'folded' | 'silicon' | 'void' | 'default' {
  const key = guildKey.trim().toLowerCase()
  if (key === 'forge') return 'forge'
  if (key === 'prism') return 'prism'
  if (key === 'folded path') return 'folded'
  if (key === 'silicon covenant') return 'silicon'
  if (key === 'void navigators') return 'void'
  return 'default'
}

export function guildHeading(guild: string): string {
  const g = guild.trim()
  if (!g) return 'Guild'
  // Title-case each word so "Folded Path" stays "Folded Path"
  return g.replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Map DB `tiles.guild` strings onto canonical section labels (case-insensitive). */
export function canonicalSkillTreeGuild(raw: string): string {
  const t = raw.trim()
  if (!t) return 'Other'
  const lower = t.toLowerCase()
  for (const g of SKILL_TREE_SECTION_GUILDS) {
    if (g.toLowerCase() === lower) return g
  }
  return guildHeading(t)
}
