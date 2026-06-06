/*
 * Quest tile unlock — prerequisite slugs on `tiles.unlock_after_slugs`.
 * A tile opens when every listed slug has an approved skill_completion.
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
  return { locked: false }
}
