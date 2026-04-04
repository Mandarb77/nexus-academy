import { useNavigate } from 'react-router-dom'
import type { TileRow } from '../types/tile'
import type { TileCompletionState, PatentProgress } from '../hooks/useSkillTree'
import { isPersonalGamePieceTile } from '../lib/gamePieceTile'
import { PERSONAL_GAME_PIECE_STEPS } from '../lib/personalGamePieceSteps'

type Props = {
  tiles: TileRow[]
  completionByTileId: Map<string, TileCompletionState>
  patentProgressByTileId: Map<string, PatentProgress>
  submittingTileId: string | null
  markComplete: (tile: TileRow) => Promise<boolean>
  canUseDb: boolean
}

export function SkillTilesList({
  tiles,
  completionByTileId,
  patentProgressByTileId,
  submittingTileId,
  markComplete,
  canUseDb,
}: Props) {
  const navigate = useNavigate()

  const openPatentPage = (tileId: string) => {
    console.log('[SkillTilesList] Opening patent application for tile:', tileId)
    navigate(`/patent-game-piece/${encodeURIComponent(tileId)}`)
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
          const patentProgress = isChecklistTile ? patentProgressByTileId.get(tile.id) : undefined
          const doneCount = patentProgress?.checklistState.filter(Boolean).length ?? 0

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
                      onClick={() => openPatentPage(tile.id)}
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
