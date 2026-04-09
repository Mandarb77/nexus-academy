import type { TileRow } from '../types/tile'
import { isPersonalGamePieceTile } from './gamePieceTile'
import { isPopUpCardTile } from './popUpCardQuest'
import { isStickerTile } from './stickerTile'
import { isCustomTile } from './customTile'

/** Patent quest detail URL for a tile, or null if this tile is not a patent flow. */
export function getPatentRoute(tile: TileRow): string | null {
  if (isPersonalGamePieceTile(tile)) return `/patent-game-piece/${encodeURIComponent(tile.id)}`
  if (isPopUpCardTile(tile)) return `/patent-game-piece/${encodeURIComponent(tile.id)}`
  if (isStickerTile(tile)) return `/patent-sticker/${encodeURIComponent(tile.id)}`
  if (isCustomTile(tile)) return `/patent-custom/${encodeURIComponent(tile.id)}`
  return null
}
