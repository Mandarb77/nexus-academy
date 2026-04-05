import { useNavigate } from 'react-router-dom'
import type { TileRow } from '../types/tile'
import type { TileCompletionState, PatentProgress } from '../hooks/useSkillTree'
import { isPersonalGamePieceTile } from '../lib/gamePieceTile'
import { isStickerTile } from '../lib/stickerTile'
import { isCustomTile } from '../lib/customTile'
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
  if (isCustomTile(tile)) return `/patent-custom/${encodeURIComponent(tile.id)}`
  return null
}

function stepCount(tile: TileRow): number {
  if (isPersonalGamePieceTile(tile)) return PERSONAL_GAME_PIECE_STEPS.length
  if (isStickerTile(tile)) return STICKER_STEPS.length
  if (isCustomTile(tile)) return (tile.steps ?? []).length
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

  // Game piece goes first in any list that contains it
  const sortedTiles = [...tiles].sort((a, b) => {
    if (isPersonalGamePieceTile(a)) return -1
    if (isPersonalGamePieceTile(b)) return 1
    return 0
  })

  const gamePieceTile = sortedTiles.find(isPersonalGamePieceTile)
  const gamePieceApproved =
    gamePieceTile !== undefined &&
    completionByTileId.get(gamePieceTile.id)?.status === 'approved'

  return (
    <>
      <ul className="skill-tile-list">
        {sortedTiles.map((tile) => {
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

          // Lock non-game-piece Forge tiles until game piece is approved
          const isForge = tile.guild?.trim().toLowerCase() === 'forge'
          const isLocked = isForge && !isPersonalGamePieceTile(tile) && !gamePieceApproved

          return (
            <li key={tile.id} className={`skill-tile card${isLocked ? ' skill-tile--locked' : ''}`}>
              <div className="skill-tile-row">
                <div className="skill-tile-main">
                  <h3 className="skill-tile-name">{tile.skill_name}</h3>
                  <p className="skill-tile-wp">{tile.wp_value} WP</p>
                  {isPatentTile && !isApproved && !isPending && !isLocked ? (
                    <p className="muted skill-tile-checklist-progress">
                      {doneCount} of {totalSteps} steps complete
                    </p>
                  ) : null}
                  {isLocked ? (
                    <p className="skill-tile-locked-hint muted">
                      🔒 Complete <em>Design Your Personal Game Piece</em> first
                    </p>
                  ) : null}
                </div>
                <div className="skill-tile-action">
                  {isLocked ? (
                    <span className="skill-tile-badge skill-tile-badge--locked">Locked</span>
                  ) : isApproved ? (
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
              {isReturned && !isLocked ? (
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
