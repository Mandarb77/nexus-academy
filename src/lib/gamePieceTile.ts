import type { TileRow } from '../types/tile'

/** Forge “Design Your Personal Game Piece” tile (DB id 5 in some installs, or by name). */
export function isPersonalGamePieceTile(tile: TileRow): boolean {
  if (tile.id === '5') return true
  const asNum = Number(tile.id)
  if (Number.isFinite(asNum) && asNum === 5) return true
  const skill = tile.skill_name?.trim().toLowerCase()
  const guild = tile.guild?.trim().toLowerCase()
  return guild === 'forge' && skill === 'design your personal game piece'
}
