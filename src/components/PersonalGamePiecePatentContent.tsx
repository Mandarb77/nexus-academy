import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
type PlanState = { id: string; status: PlanStatus }

type Props = {
  tile: TileRow
  refresh: () => Promise<void>
  completionStatus: SkillCompletionStatus | undefined
}

const TINKERCAD_TEMPLATE_URL =
  'https://www.tinkercad.com/things/1v3brIkBiqu/edit?returnTo=%2Fclassrooms%2F7CUhdwU3tyT%2Factivities%2FkSIm4lUkPQI&sharecode=DX6LI_t08XwEVWpoDJ2Puk_CeJgr5t7fhARIwRkhF2Q'

const EMPTY_CHECKS = (): boolean[] => Array(PERSONAL_GAME_PIECE_STEPS.length).fill(false)
const EMPTY_DRAFT: PatentDraft = { field1: '', field2: '', field3: '', field4: '' }

export function PersonalGamePiecePatentContent({ tile, refresh, completionStatus }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const studentId = user?.id ?? 'anonymous'

  // field1 draft localStorage key (only used before plan row exists in DB)
  const field1DraftKey = `nexus:tile-patent-f1:${studentId}:${tile.id}`

  // ── component state ────────────────────────────────────────────────────────
  const [initialised, setInitialised] = useState(false)
  const [plan, setPlan] = useState<PlanState>({ id: '', status: 'none' })
  const [checks, setChecks] = useState<boolean[]>(EMPTY_CHECKS())
  const [patent, setPatent] = useState<PatentDraft>(EMPTY_DRAFT)
  const [submittingPatent, setSubmittingPatent] = useState(false)
  const [planSubmitError, setPlanSubmitError] = useState<string | null>(null)
  const [submitApprovalError, setSubmitApprovalError] = useState<string | null>(null)
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null)
  const [showImportNote, setShowImportNote] = useState(false)

  const canUseDb = Boolean(user?.id)

  // ── DB fetch — single source of truth ─────────────────────────────────────
  // Rules:
  //  • No DB row (post-reset or brand new) → clear stale localStorage, show blank form.
  //  • Plan pending/returned → field_1 from DB (or localStorage draft); no checklist.
  //  • Plan approved → field_1/2/3/4 and checklist_state all from DB.
  const loadFromDatabase = useCallback(async () => {
    if (!user?.id) return

    const { data, error } = await supabase
      .from('patents')
      .select('id, status, stage, field_1, field_2, field_3, field_4, checklist_state, created_at')
      .eq('student_id', user.id)
      .eq('tile_id', tile.id)
      .eq('stage', 'plan')
      .order('created_at', { ascending: false })
      .limit(1)

    console.log('[PatentContent] DB fetch for tile', tile.id, '— rows:', data?.length ?? 0, error ? 'ERR:' + error.message : '')
    if (error) {
      console.error('[PatentContent] load from db:', error.message)
      setInitialised(true)
      return
    }

    const row = (data ?? [])[0] as {
      id: string
      status: string
      field_1: string
      field_2: string | null
      field_3: string | null
      field_4: string | null
      checklist_state: unknown
    } | undefined

    if (!row) {
      // No patent row → wipe any stale localStorage and show blank form.
      localStorage.removeItem(field1DraftKey)
      // Also clean up old-style keys from previous implementation.
      localStorage.removeItem(`nexus:tile-checklist:${studentId}:${tile.id}`)
      localStorage.removeItem(`nexus:tile-patent:${studentId}:${tile.id}`)
      setChecks(EMPTY_CHECKS())
      setPatent(EMPTY_DRAFT)
      setPlan({ id: '', status: 'none' })
      setInitialised(true)
      return
    }

    const planStatus = (row.status as PlanStatus) ?? 'pending'
    setPlan({ id: row.id, status: planStatus })

    if (planStatus === 'approved') {
      // Restore checklist state from DB
      const rawCs = row.checklist_state
      const cs =
        Array.isArray(rawCs) && rawCs.length === PERSONAL_GAME_PIECE_STEPS.length
          ? (rawCs as boolean[])
          : EMPTY_CHECKS()
      setChecks(cs)
      setPatent({
        field1: row.field_1 ?? '',
        field2: row.field_2 ?? '',
        field3: row.field_3 ?? '',
        field4: row.field_4 ?? '',
      })
    } else {
      // Plan pending or returned — checklist is locked, only field1 visible.
      setChecks(EMPTY_CHECKS())
      // Prefer any newer draft the student typed before plan was created.
      const draftField1 = localStorage.getItem(field1DraftKey)
      setPatent({
        field1: draftField1 ?? row.field_1 ?? '',
        field2: '',
        field3: '',
        field4: '',
      })
    }

    setInitialised(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tile.id, studentId])

  useEffect(() => {
    void loadFromDatabase()
  }, [loadFromDatabase])

  // ── DB write helpers ───────────────────────────────────────────────────────
  const saveChecklistToDb = async (nextArr: boolean[], pid: string) => {
    if (!pid) return
    const { error } = await supabase
      .from('patents')
      .update({ checklist_state: nextArr })
      .eq('id', pid)
    if (error) console.error('[PatentContent] checklist save:', error.message)
  }

  const saveFieldToDb = async (
    fieldName: 'field_2' | 'field_3' | 'field_4',
    value: string,
    pid: string,
  ) => {
    if (!pid) return
    const { error } = await supabase
      .from('patents')
      .update({ [fieldName]: value })
      .eq('id', pid)
    if (error) console.error(`[PatentContent] ${fieldName} save:`, error.message)
  }

  // ── derived state ─────────────────────────────────────────────────────────
  const canStartChecklist = plan.status === 'approved'
  const doneCount = checks.filter(Boolean).length
  const allDone = doneCount === PERSONAL_GAME_PIECE_STEPS.length

  // ── submit plan ────────────────────────────────────────────────────────────
  const onSubmitPlan = async () => {
    setPlanSubmitError(null)
    if (!user?.id) { setPlanSubmitError('Not signed in.'); return }
    if (!patent.field1.trim()) { setPlanSubmitError('Fill in what you are going to make first.'); return }

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
      // Plan submitted — clear the localStorage draft and reload from DB.
      localStorage.removeItem(field1DraftKey)
      await loadFromDatabase()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not submit plan.'
      console.error('[PatentContent] submit plan:', e)
      setPlanSubmitError(msg)
    }
  }

  // ── submit for approval ────────────────────────────────────────────────────
  const onSubmitForApproval = async () => {
    setSubmitApprovalError(null)
    setSubmitSuccessMessage(null)
    if (!user?.id) { setSubmitApprovalError('Not signed in.'); return }

    // Re-fetch plan id in case state hasn't resolved yet.
    let pid = plan.id
    if (!pid) {
      const { data: rows, error: fetchErr } = await supabase
        .from('patents')
        .select('id')
        .eq('student_id', user.id)
        .eq('tile_id', tile.id)
        .eq('stage', 'plan')
        .order('created_at', { ascending: false })
        .limit(1)
      if (fetchErr) { setSubmitApprovalError(fetchErr.message); return }
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
      // Save all fields + advance stage to 'packet' in one update.
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

      await refresh()
      setSubmitSuccessMessage('Submitted for approval! Returning to Forge skill tree…')
      window.setTimeout(() => navigate('/tree/forge'), 1200)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Submit failed.'
      console.error('[PatentContent] submit for approval:', e)
      setSubmitApprovalError(msg)
    } finally {
      setSubmittingPatent(false)
    }
  }

  // ── guard renders ─────────────────────────────────────────────────────────
  if (!isPersonalGamePieceTile(tile)) {
    return <p className="error">This page is only for the Design Your Personal Game Piece tile.</p>
  }

  if (!initialised) {
    return <p className="muted">Loading…</p>
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
        Your completion is pending teacher approval. You'll see updates here after your teacher reviews it.
      </p>
    )
  }

  // ── main form ─────────────────────────────────────────────────────────────
  return (
    <form className="patent-game-piece-form" onSubmit={(e) => e.preventDefault()}>
      <p className="muted modal-subtitle">
        {doneCount} of {PERSONAL_GAME_PIECE_STEPS.length} checklist steps complete
      </p>

      <div className="design3d-two-col">
        {/* ── Patent packet column ── */}
        <div className="design3d-patent-col">
          <h3 className="design3d-col-title">Patent packet</h3>
          <p className="muted" style={{ marginTop: 0, marginBottom: '0.85rem' }}>
            Use <strong>inches</strong> only for sizes in this packet. Maximum footprint:{' '}
            <strong>1 inch wide, 1 inch deep, 2 inches tall</strong>.
          </p>

          {/* Field 1 — required before submitting plan */}
          <label className="patent-field">
            <span className="patent-label">
              What are you going to make <span className="patent-required">*</span>
            </span>
            <input
              type="text"
              value={patent.field1}
              placeholder="One or two sentences — if you give size, use inches (max 1×1×2 inches)."
              disabled={plan.status === 'pending'}
              onChange={(e) => {
                const val = e.target.value
                setPatent((p) => ({ ...p, field1: val }))
                // Draft saved to localStorage until plan is submitted
                if (!plan.id) {
                  if (val.trim()) localStorage.setItem(field1DraftKey, val)
                  else localStorage.removeItem(field1DraftKey)
                }
              }}
            />
          </label>

          {/* Fields 2-4 — unlocked after plan approved; saved live to DB */}
          <label className="patent-field">
            <span className="patent-label">Who is it for, and why does it matter?</span>
            <textarea
              value={patent.field2}
              rows={4}
              disabled={!canStartChecklist}
              onChange={(e) => {
                const val = e.target.value
                setPatent((p) => ({ ...p, field2: val }))
                void saveFieldToDb('field_2', val, plan.id)
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
                const val = e.target.value
                setPatent((p) => ({ ...p, field3: val }))
                void saveFieldToDb('field_3', val, plan.id)
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
                const val = e.target.value
                setPatent((p) => ({ ...p, field4: val }))
                void saveFieldToDb('field_4', val, plan.id)
              }}
            />
          </label>

          <div className="design3d-plan-actions">
            {plan.status === 'pending' ? (
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

        {/* ── Checklist column ── */}
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
                      // Save to DB — checklist progress is DB-backed
                      void saveChecklistToDb(nextArr, plan.id)
                    }}
                  />
                  <span>{label}</span>
                </label>

                {idx === 1 ? (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <a
                      href="https://www.tinkercad.com/joinclass/2XTJEL26G"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`btn-secondary${!canStartChecklist ? ' btn-disabled' : ''}`}
                      aria-disabled={!canStartChecklist}
                      onClick={!canStartChecklist ? (e) => e.preventDefault() : undefined}
                      style={{ display: 'inline-block', textDecoration: 'none' }}
                    >
                      Join TinkerCAD class — code: 2XTJEL26G
                    </a>
                  </div>
                ) : null}

                {idx === 2 ? (
                  <div style={{ marginTop: '0.5rem' }}>
                    <a
                      href={TINKERCAD_TEMPLATE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`btn-secondary${!canStartChecklist ? ' btn-disabled' : ''}`}
                      aria-disabled={!canStartChecklist}
                      onClick={!canStartChecklist ? (e) => e.preventDefault() : undefined}
                      style={{ display: 'inline-block', textDecoration: 'none' }}
                    >
                      Open TinkerCAD Template
                    </a>
                  </div>
                ) : null}

                {idx === 3 ? (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <a
                      href="https://www.tinkercad.com/things/1v3brIkBiqu-game-clip2"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`btn-secondary${!canStartChecklist ? ' btn-disabled' : ''}`}
                      aria-disabled={!canStartChecklist}
                      onClick={!canStartChecklist ? (e) => e.preventDefault() : undefined}
                      style={{ display: 'inline-block', textDecoration: 'none' }}
                    >
                      Open locked base in TinkerCAD
                    </a>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={!canStartChecklist}
                      onClick={() => setShowImportNote((prev) => !prev)}
                    >
                      {showImportNote ? 'Hide import note' : 'Read import note'}
                    </button>
                    {showImportNote ? (
                      <div className="card" role="note" style={{ padding: '0.75rem' }}>
                        <p style={{ margin: 0 }}>
                          Use the <strong>locked base</strong> link above to open the game piece clip in TinkerCAD — copy it into your own design.
                          You can also import a starting shape from <strong>thingiverse.com</strong> or{' '}
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

      {/* ── Submit for approval ── */}
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
        <p className="error" role="alert">{submitApprovalError}</p>
      ) : null}
      {submitSuccessMessage ? (
        <p className="muted" role="status">{submitSuccessMessage}</p>
      ) : null}
    </form>
  )
}
