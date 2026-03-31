import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { TileRow } from '../types/tile'
import type { TileCompletionState } from '../hooks/useSkillTree'

type Props = {
  tiles: TileRow[]
  completionByTileId: Map<string, TileCompletionState>
  submittingTileId: string | null
  markComplete: (tile: TileRow) => Promise<boolean>
  canUseDb: boolean
  refresh?: () => Promise<void> | void
}

const DESIGN_3D_PRINTING_STEPS = [
  "Step 1 — Sketch your design on paper first. What is your Maker's Mark? What symbol represents you as a Remembrancer?",
  'Step 2 — Open TinkerCAD and create a new design. Your piece must fit within a 1 inch by 1 inch by 1 inch cube.',
  'Step 3 — Import the teacher-supplied clip base file and lock it. Build your design around it.',
  'Step 4 — Check your dimensions. Select your whole model and confirm it does not exceed 25.4mm in any direction.',
  'Step 5 — Export your file as an STL and show the teacher before printing.',
  'Step 6 — Print your piece. If it fails document what went wrong and what you changed for version 2.',
] as const

type PatentDraft = {
  field1: string
  field2: string
  field3: string
  field4: string
}

type PlanStatus = 'none' | 'pending' | 'approved' | 'returned'

export function SkillTilesList({
  tiles,
  completionByTileId,
  submittingTileId,
  markComplete,
  canUseDb,
  refresh,
}: Props) {
  const { user } = useAuth()
  const studentId = user?.id ?? 'anonymous'
  const [openTileId, setOpenTileId] = useState<string | null>(null)
  const [openMode, setOpenMode] = useState<'checklist' | null>(null)
  const [checksByTileId, setChecksByTileId] = useState<Map<string, boolean[]>>(
    () => new Map(),
  )
  const [patentByTileId, setPatentByTileId] = useState<Map<string, PatentDraft>>(
    () => new Map(),
  )
  const [submittingPatentTileId, setSubmittingPatentTileId] = useState<string | null>(null)
  const [planByTileId, setPlanByTileId] = useState<
    Map<string, { id: string; status: PlanStatus }>
  >(() => new Map())

  useEffect(() => {
    if (openTileId) return
    // Load saved progress for any tile that has it.
    const next = new Map<string, boolean[]>()
    const nextPatent = new Map<string, PatentDraft>()
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

      const pKey = `nexus:tile-patent:${studentId}:${tile.id}`
      const pRaw = localStorage.getItem(pKey)
      if (pRaw) {
        try {
          const d = JSON.parse(pRaw) as Partial<PatentDraft>
          if (
            typeof d?.field1 === 'string' &&
            typeof d?.field2 === 'string' &&
            typeof d?.field3 === 'string' &&
            typeof d?.field4 === 'string'
          ) {
            nextPatent.set(tile.id, {
              field1: d.field1,
              field2: d.field2,
              field3: d.field3,
              field4: d.field4,
            })
          }
        } catch {
          // ignore bad data
        }
      }
    }
    setChecksByTileId(next)
    setPatentByTileId(nextPatent)
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

  const openPatent =
    openTile ? patentByTileId.get(openTile.id) ?? { field1: '', field2: '', field3: '', field4: '' } : null

  const isDesignFor3DPrinting = (tile: TileRow) => {
    const skill = tile.skill_name?.trim().toLowerCase()
    const guild = tile.guild?.trim().toLowerCase()
    return guild === 'forge' && skill === 'design for 3d printing'
  }

  const persistChecks = (tileId: string, checks: boolean[]) => {
    const key = `nexus:tile-checklist:${studentId}:${tileId}`
    localStorage.setItem(key, JSON.stringify(checks))
  }

  const persistPatent = (tileId: string, draft: PatentDraft) => {
    const key = `nexus:tile-patent:${studentId}:${tileId}`
    localStorage.setItem(key, JSON.stringify(draft))
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

  const clearPatent = (tileId: string) => {
    const key = `nexus:tile-patent:${studentId}:${tileId}`
    localStorage.removeItem(key)
    setPatentByTileId((prev) => {
      const next = new Map(prev)
      next.delete(tileId)
      return next
    })
  }

  const openChecklist = (tileId: string) => {
    setOpenTileId(tileId)
    setOpenMode('checklist')
    void loadPlan(tileId)
  }

  const closeModal = () => {
    setOpenTileId(null)
    setOpenMode(null)
  }

  const loadPlan = async (tileId: string) => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('patents')
      .select('id, status, stage, created_at')
      .eq('student_id', user.id)
      .eq('tile_id', tileId)
      .eq('stage', 'plan')
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) {
      console.error('load plan:', error.message)
      return
    }
    const row = (data ?? [])[0] as any
    setPlanByTileId((prev) => {
      const next = new Map(prev)
      if (!row) next.set(tileId, { id: '', status: 'none' })
      else next.set(tileId, { id: row.id as string, status: (row.status as PlanStatus) ?? 'pending' })
      return next
    })
  }

  const canStartChecklist = (tileId: string) => {
    const plan = planByTileId.get(tileId)
    return plan?.status === 'approved'
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
          const gateReady = isChecklistTile ? canStartChecklist(tile.id) : false

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
                      onClick={() => openChecklist(tile.id)}
                    >
                      {gateReady ? 'Open tile' : 'Open patent application'}
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
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="tile-modal-title">
            <div className="modal-head">
              <h2 id="tile-modal-title" className="modal-title">
                {openTile.skill_name}
              </h2>
              <button type="button" className="btn-secondary" onClick={() => closeModal()}>
                Close
              </button>
            </div>

            {openMode === 'checklist' ? (
              <>
                <p className="muted modal-subtitle">
                  {openDoneCount} of {DESIGN_3D_PRINTING_STEPS.length} steps complete
                </p>

                <div className="design3d-two-col">
                  <div className="design3d-patent-col">
                    <h3 className="design3d-col-title">Patent packet</h3>

                    <label className="patent-field">
                      <span className="patent-label">
                        What are you going to make <span className="patent-required">*</span>
                      </span>
                      <input
                        type="text"
                        value={openPatent?.field1 ?? ''}
                        placeholder="One or two sentences maximum…"
                        disabled={(planByTileId.get(openTile.id)?.status ?? 'none') === 'pending'}
                        onChange={(e) => {
                          const next = {
                            ...(openPatent ?? { field1: '', field2: '', field3: '', field4: '' }),
                            field1: e.target.value,
                          }
                          setPatentByTileId((prev) => {
                            const m = new Map(prev)
                            m.set(openTile.id, next)
                            return m
                          })
                          persistPatent(openTile.id, next)
                        }}
                      />
                    </label>

                    <label className="patent-field">
                      <span className="patent-label">Who is it for, and why does it matter?</span>
                      <textarea
                        value={openPatent?.field2 ?? ''}
                        rows={4}
                        disabled={!canStartChecklist(openTile.id)}
                        onChange={(e) => {
                          const next = { ...(openPatent as PatentDraft), field2: e.target.value }
                          setPatentByTileId((prev) => {
                            const m = new Map(prev)
                            m.set(openTile.id, next)
                            return m
                          })
                          persistPatent(openTile.id, next)
                        }}
                      />
                    </label>

                    <label className="patent-field">
                      <span className="patent-label">How did you make it an original work?</span>
                      <textarea
                        value={openPatent?.field3 ?? ''}
                        rows={5}
                        disabled={!canStartChecklist(openTile.id)}
                        onChange={(e) => {
                          const next = { ...(openPatent as PatentDraft), field3: e.target.value }
                          setPatentByTileId((prev) => {
                            const m = new Map(prev)
                            m.set(openTile.id, next)
                            return m
                          })
                          persistPatent(openTile.id, next)
                        }}
                      />
                    </label>

                    <label className="patent-field">
                      <span className="patent-label">What do you have to iterate?</span>
                      <input
                        type="text"
                        value={openPatent?.field4 ?? ''}
                        disabled={!canStartChecklist(openTile.id)}
                        onChange={(e) => {
                          const next = { ...(openPatent as PatentDraft), field4: e.target.value }
                          setPatentByTileId((prev) => {
                            const m = new Map(prev)
                            m.set(openTile.id, next)
                            return m
                          })
                          persistPatent(openTile.id, next)
                        }}
                      />
                    </label>

                    <div className="design3d-plan-actions">
                      {(planByTileId.get(openTile.id)?.status ?? 'none') === 'pending' ? (
                        <p className="muted" style={{ margin: 0 }}>
                          Plan submitted — waiting for teacher approval.
                        </p>
                      ) : (
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={!canUseDb || !user?.id || !(openPatent?.field1 ?? '').trim()}
                          onClick={async () => {
                            try {
                              if (!user?.id) throw new Error('Not signed in')
                              const { error } = await supabase.from('patents').insert({
                                student_id: user.id,
                                tile_id: openTile.id,
                                field_1: openPatent?.field1 ?? '',
                                stage: 'plan',
                                status: 'pending',
                              })
                              if (error) throw error
                              await loadPlan(openTile.id)
                            } catch (e: any) {
                              console.error('open patent application:', e)
                            }
                          }}
                        >
                          Open patent application
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="design3d-checklist-col">
                    <h3 className="design3d-col-title">Checklist</h3>
                    <ol className="checklist">
                      {DESIGN_3D_PRINTING_STEPS.map((label, idx) => (
                        <li key={label} className="checklist-item">
                          <label className="checklist-label">
                            <input
                              type="checkbox"
                              checked={openChecks[idx] ?? false}
                              disabled={!canStartChecklist(openTile.id)}
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
                    {!canStartChecklist(openTile.id) ? (
                      <p className="muted" style={{ margin: '0.75rem 0 0' }}>
                        Checklist locked until the plan is approved.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => closeModal()}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={
                      !canUseDb ||
                      !user?.id ||
                      submittingPatentTileId === openTile.id ||
                      !canStartChecklist(openTile.id) ||
                      !openAllDone ||
                      !(openPatent?.field1 ?? '').trim() ||
                      !(openPatent?.field2 ?? '').trim() ||
                      !(openPatent?.field3 ?? '').trim() ||
                      !(openPatent?.field4 ?? '').trim()
                    }
                    onClick={async () => {
                      setSubmittingPatentTileId(openTile.id)
                      try {
                        if (!user?.id) throw new Error('Not signed in')
                        const planId = planByTileId.get(openTile.id)?.id
                        if (!planId) throw new Error('Missing plan id')

                        const { error: updErr } = await supabase
                          .from('patents')
                          .update({
                            stage: 'packet',
                            field_2: openPatent?.field2 ?? '',
                            field_3: openPatent?.field3 ?? '',
                            field_4: openPatent?.field4 ?? '',
                          })
                          .eq('id', planId)
                        if (updErr) throw updErr

                        const { error: scErr } = await supabase.from('skill_completions').insert({
                          student_id: user.id,
                          tile_id: openTile.id,
                          skill_key: openTile.id,
                          status: 'pending',
                          patent_id: planId,
                        })
                        if (scErr) throw scErr

                        clearChecks(openTile.id)
                        clearPatent(openTile.id)
                        await refresh?.()
                        closeModal()
                      } catch (e: any) {
                        console.error('submit for approval:', e)
                      } finally {
                        setSubmittingPatentTileId(null)
                      }
                    }}
                  >
                    {submittingPatentTileId === openTile.id ? 'Submitting…' : 'Submit for approval'}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
