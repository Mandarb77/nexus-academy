import { useNavigate } from 'react-router-dom'
import type { TileRow } from '../types/tile'
import type { TileCompletionState, PatentProgress } from '../hooks/useSkillTree'
import { isPersonalGamePieceTile } from '../lib/gamePieceTile'
import { isStickerTile } from '../lib/stickerTile'
import { PERSONAL_GAME_PIECE_STEPS } from '../lib/personalGamePieceSteps'
import { STICKER_STEPS } from '../lib/stickerSteps'

type Props = {
  tiles: TileRow[]
  completionByTileId: Map<string, TileCompletionState>
  patentProgressByTileId: Map<string, PatentProgress>
  submittingTileId: string | null
  markComplete: (tile: TileRow) => Promise<boolean>
  canUseDb: boolean
}

function getPatentRoute(tile: TileRow): string | null {
  if (isPersonalGamePieceTile(tile)) return `/patent-game-piece/${encodeURIComponent(tile.id)}`
  if (isStickerTile(tile)) return `/patent-sticker/${encodeURIComponent(tile.id)}`
  return null
}

function stepCount(tile: TileRow): number {
  if (isPersonalGamePieceTile(tile)) return PERSONAL_GAME_PIECE_STEPS.length
  if (isStickerTile(tile)) return STICKER_STEPS.length
  return 0
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

          const patentRoute = getPatentRoute(tile)
          const isPatentTile = patentRoute !== null
          const totalSteps = stepCount(tile)
          const patentProgress = isPatentTile ? patentProgressByTileId.get(tile.id) : undefined
          const doneCount = patentProgress?.checklistState.filter(Boolean).length ?? 0

          return (
            <li key={tile.id} className="skill-tile card">
              <div className="skill-tile-row">
                <div className="skill-tile-main">
                  <h3 className="skill-tile-name">{tile.skill_name}</h3>
                  <p className="skill-tile-wp">{tile.wp_value} WP</p>
                  {isPatentTile && !isApproved && !isPending ? (
                    <p className="muted skill-tile-checklist-progress">
                      {doneCount} of {totalSteps} steps complete
                    </p>
                  ) : null}
                </div>
                <div className="skill-tile-action">
                  {isApproved ? (
                    <span className="skill-tile-badge skill-tile-badge--approved">Approved</span>
                  ) : isPending ? (
                    <button type="button" className="btn-skill btn-skill--pending" disabled aria-disabled="true">
                      Pending
                    </button>
                  ) : isReturned ? (
                    <button type="button" className="btn-skill btn-skill--complete"
                      disabled={!canUseDb || busy}
                      onClick={() => void markComplete(tile)}>
                      {busy ? 'Saving…' : 'Submit again'}
                    </button>
                  ) : isPatentTile ? (
                    <button type="button" className="btn-skill btn-skill--complete"
                      disabled={!canUseDb}
                      onClick={() => {
                        console.log('[SkillTilesList] Opening patent application for tile:', tile.id)
                        navigate(patentRoute!)
                      }}>
                      Open patent application
                    </button>
                  ) : (
                    <button type="button" className="btn-skill btn-skill--complete"
                      disabled={!canUseDb || busy}
                      onClick={() => void markComplete(tile)}>
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
