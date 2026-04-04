import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { TileRow } from '../types/tile'
import type { TileCompletionState } from '../hooks/useSkillTree'
import { isPersonalGamePieceTile } from '../lib/gamePieceTile'
import { PERSONAL_GAME_PIECE_STEPS } from '../lib/personalGamePieceSteps'

type Props = {
  tiles: TileRow[]
  completionByTileId: Map<string, TileCompletionState>
  submittingTileId: string | null
  markComplete: (tile: TileRow) => Promise<boolean>
  canUseDb: boolean
}

export function SkillTilesList({
  tiles,
  completionByTileId,
  submittingTileId,
  markComplete,
  canUseDb,
}: Props) {
  const { user } = useAuth()
  const studentId = user?.id ?? 'anonymous'
  const [checksByTileId, setChecksByTileId] = useState<Map<string, boolean[]>>(
    () => new Map(),
  )

  const loadChecklistProgress = useCallback(() => {
    const next = new Map<string, boolean[]>()
    for (const tile of tiles) {
      if (!isPersonalGamePieceTile(tile)) continue
      const key = `nexus:tile-checklist:${studentId}:${tile.id}`
      const raw = localStorage.getItem(key)
      if (!raw) continue
      try {
        const arr = JSON.parse(raw) as unknown
        if (
          Array.isArray(arr) &&
          arr.length === PERSONAL_GAME_PIECE_STEPS.length &&
          arr.every((v) => typeof v === 'boolean')
        ) {
          next.set(tile.id, arr)
        }
      } catch {
        // ignore
      }
    }
    setChecksByTileId(next)
  }, [tiles, studentId])

  useEffect(() => {
    loadChecklistProgress()
  }, [loadChecklistProgress])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key?.includes(`:${studentId}:`) || !e.key.startsWith('nexus:tile-checklist:')) return
      loadChecklistProgress()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [loadChecklistProgress, studentId])

  const openPatentWindow = (tileId: string) => {
    const path = `/patent-game-piece/${encodeURIComponent(tileId)}`
    const url = `${window.location.origin}${path}`
    const w = window.open(url, '_blank', 'noopener,noreferrer')
    if (w) w.opener = null
  }

  return (
    <>
      <ul className="skill-tile-list">
        {tiles.map((tile) => {
          const completion = completionByTileId.get(tile.id)
          const status = completion?.status
          const isPending = status === 'pending'
          const isApproved = status === 'approved'
          const isReturned = status === 'returned'
          const busy = submittingTileId === tile.id

          const isChecklistTile = isPersonalGamePieceTile(tile)
          const savedChecks =
            checksByTileId.get(tile.id) ?? Array(PERSONAL_GAME_PIECE_STEPS.length).fill(false)
          const doneCount = isChecklistTile ? savedChecks.filter(Boolean).length : 0

          return (
            <li key={tile.id} className="skill-tile card">
              <div className="skill-tile-row">
                <div className="skill-tile-main">
                  <h3 className="skill-tile-name">{tile.skill_name}</h3>
                  <p className="skill-tile-wp">{tile.wp_value} WP</p>
                  {isChecklistTile && !isApproved && !isPending ? (
                    <p className="muted skill-tile-checklist-progress">
                      {doneCount} of {PERSONAL_GAME_PIECE_STEPS.length} steps complete
                    </p>
                  ) : null}
                </div>
                <div className="skill-tile-action">
                  {isApproved ? (
                    <span className="skill-tile-badge skill-tile-badge--approved">Approved</span>
                  ) : isPending ? (
                    <button
                      type="button"
                      className="btn-skill btn-skill--pending"
                      disabled
                      aria-disabled="true"
                    >
                      Pending
                    </button>
                  ) : isReturned ? (
                    <button
                      type="button"
                      className="btn-skill btn-skill--complete"
                      disabled={!canUseDb || busy}
                      onClick={() => void markComplete(tile)}
                    >
                      {busy ? 'Saving…' : 'Submit again'}
                    </button>
                  ) : isChecklistTile ? (
                    <button
                      type="button"
                      className="btn-skill btn-skill--complete"
                      disabled={!canUseDb}
                      onClick={() => openPatentWindow(tile.id)}
                    >
                      Open patent application
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-skill btn-skill--complete"
                      disabled={!canUseDb || busy}
                      onClick={() => void markComplete(tile)}
                    >
                      {busy ? 'Saving…' : 'Mark complete'}
                    </button>
                  )}
                </div>
              </div>
              {isReturned ? (
                <p className="skill-tile-returned-hint muted">
                  Returned by your teacher — submit again when you are ready.
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </>
  )
}
