import type { TileRow } from '../types/tile'

/** Folded Path "Design Your Personal Sticker" tile — identified by guild + name. */
export function isStickerTile(tile: TileRow): boolean {
  const skill = tile.skill_name?.trim().toLowerCase()
  const guild = tile.guild?.trim().toLowerCase()
  return guild === 'folded path' && skill === 'design your personal sticker'
}
