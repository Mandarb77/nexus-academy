import type { StepConfig, TileRow } from '../types/tile'
import { T_SHIRT_QUEST_SKILL_NAME, T_SHIRT_QUEST_STEPS } from './tShirtQuestSteps'

/**
 * Returns true for tiles created via the Quest Builder (steps stored in the DB),
 * and for known embedded quests (e.g. T-shirt) when DB `steps` is missing.
 * Hardcoded tiles (Game Piece, Sticker) have steps = null and use dedicated components.
 */
export function resolvedTileSteps(tile: TileRow): StepConfig[] {
  const s = tile.steps
  if (Array.isArray(s) && s.length > 0) return s as StepConfig[]
  if ((tile.skill_name ?? '').trim() === T_SHIRT_QUEST_SKILL_NAME) return T_SHIRT_QUEST_STEPS
  return []
}

export function isCustomTile(tile: TileRow): boolean {
  return resolvedTileSteps(tile).length > 0
}
