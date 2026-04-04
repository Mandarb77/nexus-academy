/** Normalize DB guild label to a URL-safe CSS modifier slug. */
export function skillTreeGuildModifier(guildKey: string): 'forge' | 'prism' | 'folded' | 'default' {
  const key = guildKey.trim().toLowerCase()
  if (key === 'forge') return 'forge'
  if (key === 'prism') return 'prism'
  if (key === 'folded path') return 'folded'
  return 'default'
}

export function guildHeading(guild: string): string {
  const g = guild.trim()
  if (!g) return 'Guild'
  // Title-case each word so "Folded Path" stays "Folded Path"
  return g.replace(/\b\w/g, (c) => c.toUpperCase())
}
