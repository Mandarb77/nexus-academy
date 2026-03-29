/** Normalize DB guild label (e.g. "Forge") for CSS modifiers and routes. */
export function skillTreeGuildModifier(guildKey: string): 'forge' | 'prism' | 'default' {
  const key = guildKey.trim().toLowerCase()
  if (key === 'forge') return 'forge'
  if (key === 'prism') return 'prism'
  return 'default'
}

export function guildHeading(guild: string): string {
  const g = guild.trim()
  if (!g) return 'Guild'
  return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase()
}
