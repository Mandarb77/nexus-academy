/*
 * URL builder — maps a skill tile to its patent experience route
 *
 * Different patent types (game piece, sticker, custom fabrication) use different pages
 * and components; this keeps `JourneyPage`, skill tree links, and notifications consistent.
 * Returns null for non-patent tiles so callers can fall back to generic quest UI.
 */

import type { TileRow } from '../types/tile'
import { isPersonalGamePieceTile } from './gamePieceTile'
import { isPopUpCardTile } from './popUpCardQuest'
import { isStickerTile } from './stickerTile'
import { isCustomTile } from './customTile'

// =============================================================================
// `getPatentRoute` — skill tile → patent wizard URL (or null)
// =============================================================================

export function getPatentRoute(tile: TileRow): string | null {
  /* All patent routes render the unified `PatentLedger`; the page shell differs by guild/back-link. */
  if (isPersonalGamePieceTile(tile)) return `/patent-game-piece/${encodeURIComponent(tile.id)}`
  /* Intentionally the same URL as game piece: one React page branches on tile id for Prism pop-up vs Forge piece. */
  if (isPopUpCardTile(tile)) return `/patent-game-piece/${encodeURIComponent(tile.id)}`
  if (isStickerTile(tile)) return `/patent-sticker/${encodeURIComponent(tile.id)}`
  /* Quest Builder rows and embedded templates (e.g. T-shirt) share the generic patent component. */
  if (isCustomTile(tile)) return `/patent-custom/${encodeURIComponent(tile.id)}`
  return null
}
