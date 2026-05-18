/*
 * Folded Path — personal sticker patent quest
 *
 * `STICKER_QUEST_COMING_SOON` lets the teacher hide an in-progress patent flow without
 * deleting the tile: skill tree shows “locked” messaging and the patent route can no-op.
 * Detection is name-based so Quest Builder titles stay aligned with this file.
 */

import type { TileRow } from '../types/tile'
  const skill = tile.skill_name?.trim().toLowerCase()
  const guild = tile.guild?.trim().toLowerCase()
  return guild === 'folded path' && skill === 'design your personal sticker'
}

export function isStickerQuestLocked(tile: TileRow): boolean {
  return isStickerTile(tile) && STICKER_QUEST_COMING_SOON
}
