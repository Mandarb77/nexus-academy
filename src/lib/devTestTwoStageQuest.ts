import type { TileRow } from '../types/tile'

/**
 * Dev two-stage test quest — identified only by this `tiles.id` (string from the API).
 * If your Supabase row uses a UUID string instead of `"30"`, change this constant to match.
 */
export const DEV_TEST_TWO_STAGE_TILE_ID = '30'

/** True when `tile.id` is exactly {@link DEV_TEST_TWO_STAGE_TILE_ID} (the only condition). */
export function isDevTestTwoStageTileId(tileId: string | null | undefined): boolean {
  return String(tileId ?? '') === DEV_TEST_TWO_STAGE_TILE_ID
}

/** Hide this tile from the skill tree on production builds (Vercel). */
export function shouldHideTestQuestTileOnProd(tile: Pick<TileRow, 'id'>): boolean {
  if (import.meta.env.DEV) return false
  return isDevTestTwoStageTileId(tile.id)
}

/** Local Vite dev only — two-step test quest for tile {@link DEV_TEST_TWO_STAGE_TILE_ID}. */
export function isDevTestTwoStageTile(tile: Pick<TileRow, 'id'>): boolean {
  return import.meta.env.DEV && isDevTestTwoStageTileId(tile.id)
}
