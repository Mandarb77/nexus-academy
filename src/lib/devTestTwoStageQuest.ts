import type { TileRow } from '../types/tile'

/** Matches migration `041_dev_test_two_stage_quest.sql` (stable local dev id). */
export const DEV_TEST_TWO_STAGE_TILE_ID = 'f0000001-0001-4001-8001-000000000001'

export const DEV_TEST_TWO_STAGE_SKILL_NAME = 'Test Quest — Two Stage'

function norm(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Hide this tile from the skill tree on production builds (Vercel). */
export function shouldHideTestQuestTileOnProd(tile: Pick<TileRow, 'id' | 'skill_name'>): boolean {
  if (import.meta.env.DEV) return false
  if (String(tile.id) === DEV_TEST_TWO_STAGE_TILE_ID) return true
  return norm(tile.skill_name ?? '') === norm(DEV_TEST_TWO_STAGE_SKILL_NAME)
}

/** Local Vite dev only — two-step test quest tile (hidden from prod skill tree). */
export function isDevTestTwoStageTile(tile: Pick<TileRow, 'id' | 'skill_name'>): boolean {
  if (!import.meta.env.DEV) return false
  if (String(tile.id) === DEV_TEST_TWO_STAGE_TILE_ID) return true
  return norm(tile.skill_name ?? '') === norm(DEV_TEST_TWO_STAGE_SKILL_NAME)
}

/** Teacher panel copy: match by Forge + skill title (works even when tile is not dev-gated in DB). */
export function isTestQuestTwoStageTileDisplay(tile: {
  skill_name?: string | null
  guild?: string | null
}): boolean {
  const g = (tile.guild ?? '').trim().toLowerCase()
  if (g !== 'forge') return false
  return norm(tile.skill_name ?? '') === norm(DEV_TEST_TWO_STAGE_SKILL_NAME)
}
