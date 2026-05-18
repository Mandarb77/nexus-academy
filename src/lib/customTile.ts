/*
 * Custom / Quest Builder tiles — step resolution and T-shirt heuristics
 *
 * Most maker-defined quests store `steps` JSON on `tiles`. A few legacy tiles (ids 25/26)
 * shipped before steps existed in the DB; we embed the T-shirt checklist so patent gating
 * still works. `isTShirtPatentQuestTile` fuzzy-matches because teachers sometimes tweak
 * capitalization or punctuation in `skill_name`. `isCustomTile` drives `/patent-custom` routing.
 */

import type { StepConfig, TileRow } from '../types/tile'
import { isPopUpCardTile } from './popUpCardQuest'
import { isVoidTile1Tile, VOID_TILE1_STEPS } from './voidTile1Proto'
import { T_SHIRT_QUEST_SKILL_NAME, T_SHIRT_QUEST_STEPS } from './tShirtQuestSteps'

/**
 * Stepped patent UX (plan gate, checklist, closing, uploads): tile **5** uses
 * `/patent-game-piece` via `isPersonalGamePieceTile`; **25** and **26** use
 * `/patent-custom` with `GenericPatentContent`. When the DB has no `steps`,
 * 25/26 get the embedded T-shirt checklist (IDs are authoritative).
 */
const FULL_PATENT_QUEST_TEMPLATE_TILE_IDS = new Set(['5', '25', '26'])

function normalizeSkillTitle(s: string): string {
  return s
    .trim()
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/**
 * True when this row is the Folded Path T-shirt patent quest, even if `skill_name`
 * differs slightly from the migration string (casing, "in"/"In", hyphen spacing).
 */
export function isTShirtPatentQuestTile(tile: TileRow): boolean {
  const name = (tile.skill_name ?? '').trim()
  if (!name) return false
  if (normalizeSkillTitle(name) === normalizeSkillTitle(T_SHIRT_QUEST_SKILL_NAME)) return true
  const g = (tile.guild ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (g !== 'folded path') return false
  const n = name.toLowerCase()
  return (
    (n.includes('t-shirt') || n.includes('tshirt') || n.includes('t shirt')) &&
    n.includes('design') &&
    n.includes('someone') &&
    (n.includes('room') || n.includes('in the'))
  )
}

/**
 * Returns true for tiles created via the Quest Builder (steps stored in the DB),
 * and for known embedded quests (e.g. T-shirt) when DB `steps` is missing.
 * Hardcoded tiles (Game Piece, Sticker) have steps = null and use dedicated components.
 */
export function resolvedTileSteps(tile: TileRow): StepConfig[] {
  if (isPopUpCardTile(tile)) return []
  if (isVoidTile1Tile(tile)) return VOID_TILE1_STEPS
  const s = tile.steps
  if (Array.isArray(s) && s.length > 0) return s as StepConfig[]
  if (isTShirtPatentQuestTile(tile)) return T_SHIRT_QUEST_STEPS
  const id = String(tile.id)
  if (FULL_PATENT_QUEST_TEMPLATE_TILE_IDS.has(id) && id !== '5') {
    return T_SHIRT_QUEST_STEPS
  }
  return []
}

export function isCustomTile(tile: TileRow): boolean {
  if (isPopUpCardTile(tile)) return false
  if (isVoidTile1Tile(tile)) return true
  return resolvedTileSteps(tile).length > 0
}
