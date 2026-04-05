import type { TileRow } from '../types/tile'

/**
 * Returns true for tiles created via the Quest Builder (steps stored in the DB).
 * Hardcoded tiles (Game Piece, Sticker) have steps = null and are handled by their
 * own dedicated components.
 */
export function isCustomTile(tile: TileRow): boolean {
  return Array.isArray(tile.steps) && tile.steps.length > 0
}
