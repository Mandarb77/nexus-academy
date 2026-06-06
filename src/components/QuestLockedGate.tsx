/*
 * Blocks patent routes when prerequisite quests are not teacher-approved.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { TileCompletionState } from '../hooks/useSkillTree'
import { tileUnlockStatus } from '../lib/tileUnlock'
import type { TileRow } from '../types/tile'

type Props = {
  tile: TileRow
  tileBySlug: Map<string, TileRow>
  completionByTileId: Map<string, TileCompletionState>
  backPath: string
  children: ReactNode
}

export function QuestLockedGate({
  tile,
  tileBySlug,
  completionByTileId,
  backPath,
  children,
}: Props) {
  const completion = completionByTileId.get(tile.id)
  const status = completion?.status
  const unlock = tileUnlockStatus(tile, tileBySlug, completionByTileId)
  const inProgress = status === 'pending' || status === 'returned' || status === 'approved'
  const blocked = unlock.locked && !inProgress

  if (!blocked) return <>{children}</>

  const prereqName = unlock.blockedBy?.skill_name ?? 'the previous quest'

  return (
    <div className="card" style={{ maxWidth: '32rem' }}>
      <p className="skill-tile-locked-hint" style={{ margin: '0 0 0.75rem' }}>
        🔒 This quest is locked
      </p>
      <p className="muted" style={{ margin: '0 0 1rem' }}>
        Complete <strong>{prereqName}</strong> and get teacher approval before opening this patent.
      </p>
      <Link to={backPath} className="btn-secondary">
        ← Back to skill tree
      </Link>
    </div>
  )
}
