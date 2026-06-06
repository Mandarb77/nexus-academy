/*
 * Quest tile unlock — prerequisite slugs on `tiles`.
 *
 * - `unlock_after_slugs` — ALL listed slugs need teacher-approved `skill_completions` (Forge/Silicon linear + boss).
 * - `unlock_after_any_slugs` — ANY ONE listed slug is enough (Prism boss after 7A or 7B).
 *
 * Seeds: migrations 053 (column + Forge/Silicon), 054 (any + Prism boss).
 * Consumers: SkillTilesList, QuestLockedGate.
 */

import type { TileCompletionState } from '../hooks/useSkillTree'
import type { TileRow } from '../types/tile'

export type TileUnlockStatus = {
  locked: boolean
  /** First prerequisite not yet approved (for student copy). */
  blockedBy?: { slug: string; skill_name: string }
}

function isApproved(
  completionByTileId: Map<string, TileCompletionState>,
  tileId: string,
): boolean {
  return completionByTileId.get(tileId)?.status === 'approved'
}

export function buildTileBySlug(tiles: TileRow[]): Map<string, TileRow> {
  const map = new Map<string, TileRow>()
  for (const t of tiles) {
    const slug = t.slug?.trim()
    if (slug) map.set(slug, t)
  }
  return map
}

export function tileUnlockStatus(
  tile: TileRow,
  tileBySlug: Map<string, TileRow>,
  completionByTileId: Map<string, TileCompletionState>,
): TileUnlockStatus {
  const slugs = tile.unlock_after_slugs ?? []
  if (!slugs.length) return { locked: false }

  for (const raw of slugs) {
    const slug = raw.trim()
    if (!slug) continue
    const prereq = tileBySlug.get(slug)
    if (!prereq) continue
    if (!isApproved(completionByTileId, prereq.id)) {
      return { locked: true, blockedBy: { slug, skill_name: prereq.skill_name } }
    }
  }

  const anySlugs = tile.unlock_after_any_slugs ?? []
  if (anySlugs.length) {
    let anyApproved = false
    for (const raw of anySlugs) {
      const slug = raw.trim()
      if (!slug) continue
      const prereq = tileBySlug.get(slug)
      if (!prereq) continue
      if (isApproved(completionByTileId, prereq.id)) {
        anyApproved = true
        break
      }
    }
    if (!anyApproved) {
      for (const raw of anySlugs) {
        const slug = raw.trim()
        if (!slug) continue
        const prereq = tileBySlug.get(slug)
        if (prereq) {
          return {
            locked: true,
            blockedBy: { slug, skill_name: 'a Tier 2 path capstone' },
          }
        }
      }
      return { locked: true }
    }
  }

  return { locked: false }
}
