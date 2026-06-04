/*
 * Custom / patent tiles — step resolution from DB
 *
 * Checklist lines and counts live on `tiles.steps` (migration 047). Routing helpers
 * (`isPersonalGamePieceTile`, etc.) remain for URL paths only.
 */

import type { StepConfig, TileRow } from '../types/tile'

function normalizeSkillTitle(s: string): string {
  return s
    .trim()
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/** Folded Path T-shirt — fuzzy name match for legacy title variants. */
export function isTShirtPatentQuestTile(tile: TileRow): boolean {
  const name = (tile.skill_name ?? '').trim()
  if (!name) return false
  const canonical = 'Design a T-Shirt for Someone In the Room'
  if (normalizeSkillTitle(name) === normalizeSkillTitle(canonical)) return true
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

/** Checklist steps from `tiles.steps` only (byte-stable for checklist_state indexing). */
export function resolvedTileSteps(tile: TileRow): StepConfig[] {
  const s = tile.steps
  if (Array.isArray(s) && s.length > 0) return s as StepConfig[]
  return []
}

/** True when this tile uses the stepped patent flow (plan → checklist → record). */
export function isCustomTile(tile: TileRow): boolean {
  return resolvedTileSteps(tile).length > 0
}
