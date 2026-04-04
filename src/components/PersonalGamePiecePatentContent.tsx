import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isPersonalGamePieceTile } from '../lib/gamePieceTile'
import { PERSONAL_GAME_PIECE_STEPS } from '../lib/personalGamePieceSteps'
import { supabase } from '../lib/supabase'
import type { TileRow } from '../types/tile'
import type { SkillCompletionStatus } from '../types/skillCompletion'

type PatentDraft = {
  field1: string
  field2: string
  field3: string
  field4: string
}

type PlanStatus = 'none' | 'pending' | 'approved' | 'returned'

type Props = {
  tile: TileRow
  refresh: () => Promise<void>
  completionStatus: SkillCompletionStatus | undefined
}

const TINKERCAD_TEMPLATE_URL =
  'https://www.tinkercad.com/things/1v3brIkBiqu/edit?returnTo=%2Fclassrooms%2F7CUhdwU3tyT%2Factivities%2FkSIm4lUkPQI&sharecode=DX6LI_t08XwEVWpoDJ2Puk_CeJgr5t7fhARIwRkhF2Q'

export function PersonalGamePiecePatentContent({ tile, refresh, completionStatus }: Props) {
  const { user } = useAuth()
  const studentId = user?.id ?? 'anonymous'

  const [checks, setChecks] = useState<boolean[]>(() =>
    Array(PERSONAL_GAME_PIECE_STEPS.length).fill(false),
  )
  const [patent, setPatent] = useState<PatentDraft>({
    field1: '',
    field2: '',
    field3: '',
    field4: '',
  })
  const [submittingPatent, setSubmittingPatent] = useState(false)
  const [planSubmitError, setPlanSubmitError] = useState<string | null>(null)
  const [submitApprovalError, setSubmitApprovalError] = useState<string | null>(null)
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null)
  const [showImportNote, setShowImportNote] = useState(false)
  const [planByTileId, setPlanByTileId] = useState<
    Map<string, { id: string; status: PlanStatus }>
  >(() => new Map())

  const canUseDb = Boolean(user?.id)

  const loadPlan = useCallback(async () => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('patents')
      .select('id, status, stage, created_at')
      .eq('student_id', user.id)
      .eq('tile_id', tile.id)
      .eq('stage', 'plan')
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) {
      console.error('load plan:', error.message)
      return
    }
    const row = (data ?? [])[0] as { id: string; status: string } | undefined
    setPlanByTileId((prev) => {
      const next = new Map(prev)
      if (!row) next.set(tile.id, { id: '', status: 'none' })
      else next.set(tile.id, { id: row.id, status: (row.status as PlanStatus) ?? 'pending' })
      return next
    })
  }, [user?.id, tile.id])

  useEffect(() => {
    void loadPlan()
  }, [loadPlan])

  useEffect(() => {
    const key = `nexus:tile-checklist:${studentId}:${tile.id}`
    const raw = localStorage.getItem(key)
    if (raw) {
      try {
        const arr = JSON.parse(raw) as unknown
        if (
          Array.isArray(arr) &&
          arr.length === PERSONAL_GAME_PIECE_STEPS.length &&
          arr.every((v) => typeof v === 'boolean')
        ) {
          setChecks(arr)
        }
      } catch {
        // ignore
      }
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
          setPatent({ field1: d.field1, field2: d.field2, field3: d.field3, field4: d.field4 })
        }
      } catch {
        // ignore
      }
    }
  }, [studentId, tile.id])

  const persistChecks = (next: boolean[]) => {
    localStorage.setItem(`nexus:tile-checklist:${studentId}:${tile.id}`, JSON.stringify(next))
  }

  const persistPatent = (draft: PatentDraft) => {
    localStorage.setItem(`nexus:tile-patent:${studentId}:${tile.id}`, JSON.stringify(draft))
  }

  const clearChecks = () => {
    localStorage.removeItem(`nexus:tile-checklist:${studentId}:${tile.id}`)
    setChecks(Array(PERSONAL_GAME_PIECE_STEPS.length).fill(false))
  }

  const clearPatent = () => {
    localStorage.removeItem(`nexus:tile-patent:${studentId}:${tile.id}`)
    setPatent({ field1: '', field2: '', field3: '', field4: '' })
  }

  const canStartChecklist = planByTileId.get(tile.id)?.status === 'approved'

  const doneCount = checks.filter(Boolean).length
  const allDone = doneCount === PERSONAL_GAME_PIECE_STEPS.length

  const planState = planByTileId.get(tile.id)?.status ?? 'none'
  const planId = planByTileId.get(tile.id)?.id ?? ''

  const onSubmitPlan = async () => {
    setPlanSubmitError(null)
    if (!user?.id) {
      setPlanSubmitError('Not signed in.')
      return
    }
    if (!patent.field1.trim()) {
      setPlanSubmitError('Fill in what you are going to make first.')
      return
    }
    try {
      const { error } = await supabase.from('patents').insert({
        student_id: user.id,
        tile_id: tile.id,
        field_1: patent.field1,
        stage: 'plan',
        status: 'pending',
      })
      if (error) {
        if (error.code === '23505') {
          setPlanSubmitError('A plan is already on file. Refresh the page or wait for your teacher.')
        } else {
          throw error
        }
        return
      }
      await loadPlan()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not submit plan.'
      console.error('submit plan:', e)
      setPlanSubmitError(msg)
    }
  }

  const onSubmitForApproval = async () => {
    setSubmitApprovalError(null)
    setSubmitSuccessMessage(null)
    if (!user?.id) {
      setSubmitApprovalError('Not signed in.')
      return
    }

    let pid = planId
    if (!pid) {
      const { data: rows, error: fetchErr } = await supabase
        .from('patents')
        .select('id')
        .eq('student_id', user.id)
        .eq('tile_id', tile.id)
        .eq('stage', 'plan')
        .order('created_at', { ascending: false })
        .limit(1)
      if (fetchErr) {
        setSubmitApprovalError(fetchErr.message)
        return
      }
      const row = (rows ?? [])[0] as { id: string } | undefined
      pid = row?.id ?? ''
    }

    if (!pid) {
      setSubmitApprovalError('No approved plan found. Submit your plan first and wait for teacher approval.')
      return
    }

    if (!patent.field1.trim() || !patent.field2.trim() || !patent.field3.trim() || !patent.field4.trim()) {
      setSubmitApprovalError('Fill in all patent fields before submitting.')
      return
    }

    if (!canStartChecklist || !allDone) {
      setSubmitApprovalError('Complete the checklist and wait for plan approval first.')
      return
    }

    setSubmittingPatent(true)
    try {
      const { error: updErr } = await supabase
        .from('patents')
        .update({
          stage: 'packet',
          field_2: patent.field2,
          field_3: patent.field3,
          field_4: patent.field4,
        })
        .eq('id', pid)
      if (updErr) throw updErr

      const { error: scErr } = await supabase.from('skill_completions').insert({
        student_id: user.id,
        tile_id: tile.id,
        skill_key: tile.id,
        status: 'pending',
        patent_id: pid,
      })
      if (scErr) throw scErr

      clearChecks()
      clearPatent()
      await refresh()
      setSubmitSuccessMessage('Submitted for approval. Refreshing…')

      try {
        if (window.opener && !window.opener.closed) {
          window.opener.location.reload()
        }
      } catch {
        // cross-origin opener — ignore
      }

      window.setTimeout(() => {
        window.location.reload()
      }, 600)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Submit failed.'
      console.error('submit for approval:', e)
      setSubmitApprovalError(msg)
    } finally {
      setSubmittingPatent(false)
    }
  }

  if (!isPersonalGamePieceTile(tile)) {
    return <p className="error">This page is only for the Design Your Personal Game Piece tile.</p>
  }

  if (completionStatus === 'approved') {
    return (
      <p className="muted" role="status">
        This skill is already approved. You can complete the quest again for bonus WP — talk to your teacher if you
        need the checklist reset.
      </p>
    )
  }

  if (completionStatus === 'pending') {
    return (
      <p className="muted" role="status">
        Your completion is pending teacher approval. You’ll see updates here after your teacher reviews it.
      </p>
    )
  }

  return (
    <form
      className="patent-game-piece-form"
      onSubmit={(e) => {
        e.preventDefault()
      }}
    >
      <p className="muted modal-subtitle">
        {doneCount} of {PERSONAL_GAME_PIECE_STEPS.length} checklist steps complete
      </p>

      <div className="design3d-two-col">
        <div className="design3d-patent-col">
          <h3 className="design3d-col-title">Patent packet</h3>
          <p className="muted" style={{ marginTop: 0, marginBottom: '0.85rem' }}>
            Use <strong>inches</strong> only for sizes in this packet. Maximum footprint:{' '}
            <strong>1 inch wide, 1 inch deep, 2 inches tall</strong>.
          </p>

          <label className="patent-field">
            <span className="patent-label">
              What are you going to make <span className="patent-required">*</span>
            </span>
            <input
              type="text"
              value={patent.field1}
              placeholder="One or two sentences — if you give size, use inches (max 1×1×2 inches)."
              disabled={planState === 'pending'}
              onChange={(e) => {
                const next = { ...patent, field1: e.target.value }
                setPatent(next)
                persistPatent(next)
              }}
            />
          </label>

          <label className="patent-field">
            <span className="patent-label">Who is it for, and why does it matter?</span>
            <textarea
              value={patent.field2}
              rows={4}
              disabled={!canStartChecklist}
              onChange={(e) => {
                const next = { ...patent, field2: e.target.value }
                setPatent(next)
                persistPatent(next)
              }}
            />
          </label>

          <label className="patent-field">
            <span className="patent-label">How did you make it an original work?</span>
            <textarea
              value={patent.field3}
              rows={5}
              disabled={!canStartChecklist}
              onChange={(e) => {
                const next = { ...patent, field3: e.target.value }
                setPatent(next)
                persistPatent(next)
              }}
            />
          </label>

          <label className="patent-field">
            <span className="patent-label">What do you have to iterate?</span>
            <input
              type="text"
              value={patent.field4}
              disabled={!canStartChecklist}
              onChange={(e) => {
                const next = { ...patent, field4: e.target.value }
                setPatent(next)
                persistPatent(next)
              }}
            />
          </label>

          <div className="design3d-plan-actions">
            {planState === 'pending' ? (
              <p className="muted" style={{ margin: 0 }}>
                Plan submitted — waiting for teacher approval.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!canUseDb || !user?.id || !patent.field1.trim()}
                  onClick={() => void onSubmitPlan()}
                >
                  Submit plan for teacher approval
                </button>
                <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
                  This sends your plan to your teacher only. It is not your final skill submission.
                </p>
              </>
            )}
            {planSubmitError ? (
              <p className="error" role="alert" style={{ margin: '0.5rem 0 0' }}>
                {planSubmitError}
              </p>
            ) : null}
          </div>
        </div>

        <div className="design3d-checklist-col">
          <h3 className="design3d-col-title">Checklist</h3>
          <ol className="checklist">
            {PERSONAL_GAME_PIECE_STEPS.map((label, idx) => (
              <li key={`${label}-${idx}`} className="checklist-item">
                <label className="checklist-label">
                  <input
                    type="checkbox"
                    checked={checks[idx] ?? false}
                    disabled={!canStartChecklist}
                    onChange={(e) => {
                      const nextArr = [...checks]
                      nextArr[idx] = e.target.checked
                      setChecks(nextArr)
                      persistChecks(nextArr)
                    }}
                  />
                  <span>{label}</span>
                </label>
                {idx === 2 ? (
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={!canStartChecklist}
                      onClick={() => {
                        const w = window.open(TINKERCAD_TEMPLATE_URL, '_blank', 'noopener,noreferrer')
                        if (w) w.opener = null
                      }}
                    >
                      Open TinkerCAD Template
                    </button>
                  </div>
                ) : null}
                {idx === 3 ? (
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={!canStartChecklist}
                      onClick={() => setShowImportNote(true)}
                    >
                      Read import note
                    </button>
                    {showImportNote ? (
                      <div
                        className="card"
                        role="note"
                        style={{ marginTop: '0.5rem', padding: '0.75rem' }}
                      >
                        <p style={{ margin: 0 }}>
                          You may import a starting shape from <strong>thingiverse.com</strong> or{' '}
                          <strong>printables.com</strong> and modify it to make it your own. Imported designs must be
                          meaningfully changed — not just printed as-is.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
          <div
            className="card"
            style={{
              marginTop: '1rem',
              padding: '0.85rem',
              border: '1px solid rgba(250, 204, 21, 0.35)',
              background: 'rgba(250, 204, 21, 0.08)',
            }}
          >
            <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Bonus completion available</strong>
            <p style={{ margin: 0 }}>
              This quest can be completed again for bonus WP as you improve your TinkerCAD skills. Each version must
              show clear improvement over the last. Document the differences in your patent packet.
            </p>
          </div>
          {!canStartChecklist ? (
            <p className="muted" style={{ margin: '0.75rem 0 0' }}>
              Checklist unlocks after your teacher approves your plan.
            </p>
          ) : null}
        </div>
      </div>

      <div className="modal-actions patent-game-piece-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={
            !canUseDb ||
            !user?.id ||
            submittingPatent ||
            !canStartChecklist ||
            !allDone ||
            !patent.field1.trim() ||
            !patent.field2.trim() ||
            !patent.field3.trim() ||
            !patent.field4.trim()
          }
          onClick={() => void onSubmitForApproval()}
        >
          {submittingPatent ? 'Submitting…' : 'Submit for approval'}
        </button>
      </div>

      {submitApprovalError ? (
        <p className="error" role="alert">
          {submitApprovalError}
        </p>
      ) : null}
      {submitSuccessMessage ? (
        <p className="muted" role="status">
          {submitSuccessMessage}
        </p>
      ) : null}
    </form>
  )
}
