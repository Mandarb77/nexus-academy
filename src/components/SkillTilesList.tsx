import { useNavigate } from 'react-router-dom'
import type { TileRow } from '../types/tile'
import type { TileCompletionState, PatentProgress } from '../hooks/useSkillTree'
import { isPersonalGamePieceTile } from '../lib/gamePieceTile'
import { isStickerQuestLocked, isStickerTile } from '../lib/stickerTile'
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

  // Game piece first, then live sticker, then other patent/custom quests, then standard skills, locked sticker last
  const sortedTiles = [...tiles].sort((a, b) => {
    const rank = (t: TileRow) => {
      if (isPersonalGamePieceTile(t)) return 0
      if (isStickerTile(t) && !isStickerQuestLocked(t)) return 1
      if (isCustomTile(t)) return 2
      if (isStickerQuestLocked(t)) return 4
      return 3
    }
    const d = rank(a) - rank(b)
    if (d !== 0) return d
    return (a.skill_name ?? '').localeCompare(b.skill_name ?? '', undefined, { sensitivity: 'base' })
  })

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

          // Only the personal sticker quest is UI-locked when STICKER_QUEST_COMING_SOON; all other tiles use Mark complete or patent flow
          const isComingSoon = isStickerQuestLocked(tile)

          return (
            <li key={tile.id} className={`skill-tile card${isComingSoon ? ' skill-tile--locked' : ''}`}>
              <div className="skill-tile-row">
                <div className="skill-tile-main">
                  <h3 className="skill-tile-name">{tile.skill_name}</h3>
                  <p className="skill-tile-wp">{tile.wp_value} WP</p>
                  {isPatentTile && !isApproved && !isPending && !isComingSoon ? (
                    <p className="muted skill-tile-checklist-progress">
                      {doneCount} of {totalSteps} steps complete
                    </p>
                  ) : null}
                  {isComingSoon ? (
                    <p className="skill-tile-locked-hint muted">
                      🔒 Coming soon
                    </p>
                  ) : null}
                </div>
                <div className="skill-tile-action">
                  {isComingSoon ? (
                    <span className="skill-tile-badge skill-tile-badge--locked">Coming soon</span>
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
              {isReturned && !isComingSoon ? (
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
