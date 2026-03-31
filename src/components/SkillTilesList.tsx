import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { TileRow } from '../types/tile'
import type { TileCompletionState } from '../hooks/useSkillTree'

type Props = {
  tiles: TileRow[]
  completionByTileId: Map<string, TileCompletionState>
  submittingTileId: string | null
  markComplete: (tile: TileRow) => Promise<boolean>
  canUseDb: boolean
}

const DESIGN_3D_PRINTING_STEPS = [
  "Step 1 — Sketch your design on paper first. What is your Maker's Mark? What symbol represents you as a Remembrancer?",
  'Step 2 — Open TinkerCAD and create a new design. Your piece must fit within a 1 inch by 1 inch by 1 inch cube.',
  'Step 3 — Import the teacher-supplied clip base file and lock it. Build your design around it.',
  'Step 4 — Check your dimensions. Select your whole model and confirm it does not exceed 25.4mm in any direction.',
  'Step 5 — Export your file as an STL and show the teacher before printing.',
  'Step 6 — Print your piece. If it fails document what went wrong and what you changed for version 2.',
] as const

export function SkillTilesList({
  tiles,
  completionByTileId,
  submittingTileId,
  markComplete,
  canUseDb,
}: Props) {
  const { user } = useAuth()
  const studentId = user?.id ?? 'anonymous'
  const [openTileId, setOpenTileId] = useState<string | null>(null)
  const [checksByTileId, setChecksByTileId] = useState<Map<string, boolean[]>>(
    () => new Map(),
  )

  useEffect(() => {
    if (openTileId) return
    // Load saved progress for any tile that has it.
    const next = new Map<string, boolean[]>()
    for (const tile of tiles) {
      const key = `nexus:tile-checklist:${studentId}:${tile.id}`
      const raw = localStorage.getItem(key)
      if (!raw) continue
      try {
        const arr = JSON.parse(raw) as unknown
        if (
          Array.isArray(arr) &&
          arr.length === DESIGN_3D_PRINTING_STEPS.length &&
          arr.every((v) => typeof v === 'boolean')
        ) {
          next.set(tile.id, arr)
        }
      } catch {
        // ignore bad data
      }
    }
    setChecksByTileId(next)
  }, [tiles, studentId, openTileId])

  const openTile = useMemo(() => {
    if (!openTileId) return null
    return tiles.find((t) => t.id === openTileId) ?? null
  }, [openTileId, tiles])

  const openChecks = openTile
    ? checksByTileId.get(openTile.id) ?? Array(DESIGN_3D_PRINTING_STEPS.length).fill(false)
    : null

  const openDoneCount = openChecks ? openChecks.filter(Boolean).length : 0
  const openAllDone = openChecks ? openDoneCount === DESIGN_3D_PRINTING_STEPS.length : false

  const isDesignFor3DPrinting = (tile: TileRow) => {
    const skill = tile.skill_name?.trim().toLowerCase()
    const guild = tile.guild?.trim().toLowerCase()
    return guild === 'forge' && skill === 'design for 3d printing'
  }

  const persistChecks = (tileId: string, checks: boolean[]) => {
    const key = `nexus:tile-checklist:${studentId}:${tileId}`
    localStorage.setItem(key, JSON.stringify(checks))
  }

  const clearChecks = (tileId: string) => {
    const key = `nexus:tile-checklist:${studentId}:${tileId}`
    localStorage.removeItem(key)
    setChecksByTileId((prev) => {
      const next = new Map(prev)
      next.delete(tileId)
      return next
    })
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

          const isChecklistTile = isDesignFor3DPrinting(tile)
          const savedChecks =
            checksByTileId.get(tile.id) ??
            Array(DESIGN_3D_PRINTING_STEPS.length).fill(false)
          const doneCount = isChecklistTile ? savedChecks.filter(Boolean).length : 0

          return (
            <li key={tile.id} className="skill-tile card">
              <div className="skill-tile-row">
                <div className="skill-tile-main">
                  <h3 className="skill-tile-name">{tile.skill_name}</h3>
                  <p className="skill-tile-wp">{tile.wp_value} WP</p>
                  {isChecklistTile && !isApproved && !isPending ? (
                    <p className="muted skill-tile-checklist-progress">
                      {doneCount} of {DESIGN_3D_PRINTING_STEPS.length} steps complete
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
                      onClick={() => setOpenTileId(tile.id)}
                    >
                      Open checklist
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

      {openTile && openChecks ? (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpenTileId(null)
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="tile-modal-title">
            <div className="modal-head">
              <h2 id="tile-modal-title" className="modal-title">
                {openTile.skill_name}
              </h2>
              <button type="button" className="btn-secondary" onClick={() => setOpenTileId(null)}>
                Close
              </button>
            </div>

            <p className="muted modal-subtitle">
              {openDoneCount} of {DESIGN_3D_PRINTING_STEPS.length} steps complete
            </p>

            <ol className="checklist">
              {DESIGN_3D_PRINTING_STEPS.map((label, idx) => (
                <li key={label} className="checklist-item">
                  <label className="checklist-label">
                    <input
                      type="checkbox"
                      checked={openChecks[idx] ?? false}
                      onChange={(e) => {
                        const nextArr = [...openChecks]
                        nextArr[idx] = e.target.checked
                        setChecksByTileId((prev) => {
                          const next = new Map(prev)
                          next.set(openTile.id, nextArr)
                          return next
                        })
                        persistChecks(openTile.id, nextArr)
                      }}
                    />
                    <span>{label}</span>
                  </label>
                </li>
              ))}
            </ol>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={!canUseDb || !openAllDone}
                onClick={async () => {
                  const ok = await markComplete(openTile)
                  if (ok) {
                    clearChecks(openTile.id)
                    setOpenTileId(null)
                  }
                }}
              >
                Mark complete
              </button>
              <button type="button" className="btn-secondary" onClick={() => setOpenTileId(null)}>
                Keep working
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
