import type { TileRow } from '../types/tile'

/**
 * When true, the personal sticker quest is treated like other coming-soon tiles in the skill tree,
 * and `/patent-sticker/:id` shows a locked message instead of the patent flow.
 */
export const STICKER_QUEST_COMING_SOON = true

/** Folded Path "Design Your Personal Sticker" tile — identified by guild + name. */
export function isStickerTile(tile: TileRow): boolean {
  const skill = tile.skill_name?.trim().toLowerCase()
  const guild = tile.guild?.trim().toLowerCase()
  return guild === 'folded path' && skill === 'design your personal sticker'
}

export function isStickerQuestLocked(tile: TileRow): boolean {
  return isStickerTile(tile) && STICKER_QUEST_COMING_SOON
}
