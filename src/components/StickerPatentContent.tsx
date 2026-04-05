import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PatentFlowBanner } from './PatentFlowBanner'
import { isStickerTile } from '../lib/stickerTile'
import { STICKER_STEPS } from '../lib/stickerSteps'
import { supabase } from '../lib/supabase'
import type { TileRow } from '../types/tile'
import type { SkillCompletionStatus } from '../types/skillCompletion'

type PatentDraft = { field1: string; field2: string; field3: string; field4: string }
type PlanStatus = 'none' | 'pending' | 'approved' | 'returned'
type PlanState = { id: string; status: PlanStatus }

type Props = {
  tile: TileRow
  refresh: () => Promise<void>
  completionStatus: SkillCompletionStatus | undefined
}

const EMPTY_CHECKS = (): boolean[] => Array(STICKER_STEPS.length).fill(false)
const EMPTY_DRAFT: PatentDraft = { field1: '', field2: '', field3: '', field4: '' }

function readStoredPhase(key: string): 1 | 2 | 3 {
  const raw = sessionStorage.getItem(key)
  if (raw === '2') return 2
  if (raw === '3') return 3
  return 1
}

export function StickerPatentContent({ tile, refresh, completionStatus }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const studentId = user?.id ?? 'anonymous'

  const field1DraftKey = `nexus:tile-patent-f1:${studentId}:${tile.id}`
  const phaseKey = `nexus:patent-phase:${studentId}:${tile.id}`

  const [initialised, setInitialised] = useState(false)
  const [plan, setPlan] = useState<PlanState>({ id: '', status: 'none' })
  const [checks, setChecks] = useState<boolean[]>(EMPTY_CHECKS())
  const [patent, setPatent] = useState<PatentDraft>(EMPTY_DRAFT)
  const [phase, setPhase] = useState<1 | 2 | 3>(1)
  const [submittingPatent, setSubmittingPatent] = useState(false)
  const [submittingStep1, setSubmittingStep1] = useState(false)
  const [planSubmitError, setPlanSubmitError] = useState<string | null>(null)
  const [submitApprovalError, setSubmitApprovalError] = useState<string | null>(null)
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null)
  const [flowBanner, setFlowBanner] = useState<string | null>(null)
  const [checklistSubmitted, setChecklistSubmitted] = useState(false)
  const [submittingChecklist, setSubmittingChecklist] = useState(false)

  const bootstrappedForTileRef = useRef<string | null>(null)

  const canUseDb = Boolean(user?.id)

  const loadFromDatabase = useCallback(async () => {
    if (!user?.id) return

    const { data, error } = await supabase
      .from('patents')
      .select(
        'id, status, stage, field_1, field_2, field_3, field_4, checklist_state, checklist_submitted, created_at',
      )
      .eq('student_id', user.id)
      .eq('tile_id', tile.id)
      .eq('stage', 'plan')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('[StickerPatent] load:', error.message)
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
      checklist_submitted?: boolean | null
    } | undefined

    if (!row) {
      localStorage.removeItem(field1DraftKey)
      localStorage.removeItem(`nexus:tile-checklist:${studentId}:${tile.id}`)
      localStorage.removeItem(`nexus:tile-patent:${studentId}:${tile.id}`)
      setChecks(EMPTY_CHECKS())
      setPatent(EMPTY_DRAFT)
      setPlan({ id: '', status: 'none' })
      setChecklistSubmitted(false)
      setInitialised(true)
      return
    }

    const planStatus = (row.status as PlanStatus) ?? 'pending'
    setPlan({ id: row.id, status: planStatus })

    const rawSubmitted = Boolean(row.checklist_submitted)
    if (planStatus === 'pending' || planStatus === 'returned') {
      setChecklistSubmitted(false)
      if (rawSubmitted) {
        void supabase
          .from('patents')
          .update({ checklist_submitted: false })
          .eq('id', row.id)
      }
    } else {
      setChecklistSubmitted(rawSubmitted)
    }

    if (planStatus === 'approved') {
      const rawCs = row.checklist_state
      const cs =
        Array.isArray(rawCs) && rawCs.length === STICKER_STEPS.length
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
      const draftField1 = localStorage.getItem(field1DraftKey)
      setChecks(EMPTY_CHECKS())
      setPatent({
        field1: draftField1 ?? row.field_1 ?? '',
        field2: row.field_2 ?? '',
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

  const canStartChecklist = plan.status === 'approved'
  const doneCount = checks.filter(Boolean).length
  const allDone = doneCount === STICKER_STEPS.length

  const planSubmitted = Boolean(plan.id)

  const maxPhase = useMemo((): 1 | 2 | 3 => {
    if (!planSubmitted) return 1
    if (!checklistSubmitted) return 2
    return 3
  }, [planSubmitted, checklistSubmitted])

  useEffect(() => {
    if (!initialised) return
    const marker = `${tile.id}:${user?.id ?? ''}`
    if (bootstrappedForTileRef.current !== marker) {
      bootstrappedForTileRef.current = marker
      const suggested: 1 | 2 | 3 = !planSubmitted ? 1 : !checklistSubmitted ? 2 : 3
      const stored = readStoredPhase(phaseKey)
      let next: 1 | 2 | 3
      if (stored >= 1 && stored <= maxPhase) {
        next = stored as 1 | 2 | 3
        if (next === 1 && planSubmitted && suggested >= 2) {
          next = Math.min(suggested, maxPhase) as 1 | 2 | 3
        }
      } else {
        next = suggested
      }
      next = Math.min(Math.max(next, 1), maxPhase) as 1 | 2 | 3
      setPhase(next)
      sessionStorage.setItem(phaseKey, String(next))
      return
    }
    setPhase((p) => (p > maxPhase ? maxPhase : p))
  }, [
    initialised,
    tile.id,
    user?.id,
    maxPhase,
    planSubmitted,
    checklistSubmitted,
    phaseKey,
  ])

  const goPhase = (p: 1 | 2 | 3) => {
    const next = Math.min(Math.max(p, 1), maxPhase) as 1 | 2 | 3
    setPhase(next)
    sessionStorage.setItem(phaseKey, String(next))
  }

  const saveChecklistToDb = async (nextArr: boolean[], pid: string) => {
    if (!pid || checklistSubmitted) return
    const { error } = await supabase.from('patents').update({ checklist_state: nextArr }).eq('id', pid)
    if (error) console.error('[StickerPatent] checklist save:', error.message)
  }

  const saveFieldToDb = async (fieldName: 'field_2' | 'field_3' | 'field_4', value: string, pid: string) => {
    if (!pid) return
    const { error } = await supabase.from('patents').update({ [fieldName]: value }).eq('id', pid)
    if (error) console.error(`[StickerPatent] ${fieldName} save:`, error.message)
  }

  const field1Locked = plan.status === 'pending'

  const onStep1Continue = async () => {
    setPlanSubmitError(null)
    setFlowBanner(null)
    if (!user?.id) {
      setPlanSubmitError('Not signed in.')
      return
    }
    if (!patent.field1.trim() || !patent.field2.trim()) {
      setPlanSubmitError('Answer both questions before continuing.')
      return
    }

    setSubmittingStep1(true)
    try {
      if (!plan.id) {
        const { error } = await supabase.from('patents').insert({
          student_id: user.id,
          tile_id: tile.id,
          field_1: patent.field1,
          field_2: patent.field2,
          stage: 'plan',
          status: 'pending',
        })
        if (error) {
          if (error.code === '23505') {
            setPlanSubmitError('A plan is already on file. Refresh the page.')
          } else {
            throw error
          }
          return
        }
        localStorage.removeItem(field1DraftKey)
        setFlowBanner(
          'Plan sent for teacher approval. Step 2 (checklist) appears next — checkboxes turn on after your teacher approves.',
        )
      } else if (plan.status === 'returned') {
        const { error } = await supabase
          .from('patents')
          .update({
            field_1: patent.field1,
            field_2: patent.field2,
            status: 'pending',
            checklist_submitted: false,
          })
          .eq('id', plan.id)
        if (error) throw error
        setFlowBanner('Updated plan resubmitted to your teacher.')
      } else {
        const { error } = await supabase.from('patents').update({ field_2: patent.field2 }).eq('id', plan.id)
        if (error) throw error
        setFlowBanner('Your answers are saved. Continue to the checklist when you are ready.')
      }

      await loadFromDatabase()
      goPhase(2)
    } catch (e: unknown) {
      setPlanSubmitError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSubmittingStep1(false)
    }
  }

  const onSubmitChecklist = async () => {
    if (!plan.id || !canStartChecklist || !allDone || checklistSubmitted) return
    setSubmittingChecklist(true)
    setFlowBanner(null)
    try {
      const { error } = await supabase
        .from('patents')
        .update({ checklist_submitted: true })
        .eq('id', plan.id)
      if (error) throw error
      setChecklistSubmitted(true)
      setFlowBanner('Checklist submitted. Step 3 — answer the final two questions.')
      goPhase(3)
      await loadFromDatabase()
    } catch (e: unknown) {
      console.error('[StickerPatent] submit checklist:', e)
      setFlowBanner(null)
    } finally {
      setSubmittingChecklist(false)
    }
  }

  const onSubmitForApproval = async () => {
    setSubmitApprovalError(null)
    setSubmitSuccessMessage(null)
    setFlowBanner(null)
    if (!user?.id) {
      setSubmitApprovalError('Not signed in.')
      return
    }

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
      if (fetchErr) {
        setSubmitApprovalError(fetchErr.message)
        return
      }
      pid = ((rows ?? [])[0] as { id: string } | undefined)?.id ?? ''
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
    if (!checklistSubmitted) {
      setSubmitApprovalError('Submit your checklist in step 2 before the final questions.')
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

      await refresh()
      setSubmitSuccessMessage('Quest submitted for teacher approval! Returning to Folded Path…')
      setFlowBanner('Patent packet submitted successfully.')
      window.setTimeout(() => navigate('/tree/folded'), 1400)
    } catch (e: unknown) {
      setSubmitApprovalError(e instanceof Error ? e.message : 'Submit failed.')
      console.error('[StickerPatent] submit for approval:', e)
    } finally {
      setSubmittingPatent(false)
    }
  }

  if (!isStickerTile(tile)) {
    return <p className="error">This page is only for the Design Your Personal Sticker tile.</p>
  }
  if (!initialised) return <p className="muted">Loading…</p>

  if (completionStatus === 'approved') {
    return (
      <p className="muted" role="status">
        This skill is already approved. Talk to your teacher to reset the checklist for a bonus run.
      </p>
    )
  }
  if (completionStatus === 'pending') {
    return (
      <p className="muted" role="status">
        Your completion is pending teacher approval. You&apos;ll see updates here after your teacher reviews it.
      </p>
    )
  }

  return (
    <form
      className="patent-game-piece-form"
      data-patent-flow="stepped-checklist-gate"
      onSubmit={(e) => e.preventDefault()}
    >
      <PatentFlowBanner message={flowBanner} tone="success" onClear={() => setFlowBanner(null)} />

      <div className="patent-step-tabs" role="tablist" aria-label="Patent steps">
        {(
          [
            { n: 1 as const, label: 'Plan questions' },
            ...(planSubmitted ? [{ n: 2 as const, label: 'Checklist' }] : []),
            ...(checklistSubmitted ? [{ n: 3 as const, label: 'Final questions' }] : []),
          ] as { n: 1 | 2 | 3; label: string }[]
        ).map(({ n, label }) => (
          <button
            key={n}
            type="button"
            role="tab"
            aria-selected={phase === n}
            className={
              'patent-step-tabs__btn' +
              (phase === n ? ' patent-step-tabs__btn--active' : '')
            }
            onClick={() => goPhase(n)}
          >
            {n}. {label}
          </button>
        ))}
      </div>

      {phase === 1 ? (
        <div className="card patent-phase-panel">
          <section aria-labelledby="sticker-patent-phase-1">
        <h2 id="sticker-patent-phase-1" className="patent-phase-title">
          Step 1 — What you&apos;re making
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Answer both questions, then continue. Your text is kept when you move to the next steps.
        </p>

        <div className="design3d-patent-col" style={{ maxWidth: '40rem' }}>
          <label className="patent-field">
            <span className="patent-label">
              What are you going to make <span className="patent-required">*</span>
            </span>
            <input
              type="text"
              value={patent.field1}
              placeholder="Describe your sticker design in one or two sentences."
              disabled={field1Locked}
              onChange={(e) => {
                const val = e.target.value
                setPatent((p) => ({ ...p, field1: val }))
                if (!plan.id) {
                  if (val.trim()) localStorage.setItem(field1DraftKey, val)
                  else localStorage.removeItem(field1DraftKey)
                }
              }}
            />
          </label>

          <label className="patent-field">
            <span className="patent-label">
              Who is it for, and why does it matter? <span className="patent-required">*</span>
            </span>
            <textarea
              value={patent.field2}
              rows={4}
              disabled={!user?.id}
              onChange={(e) => {
                const val = e.target.value
                setPatent((p) => ({ ...p, field2: val }))
                if (plan.id && plan.status === 'pending') {
                  void saveFieldToDb('field_2', val, plan.id)
                }
              }}
            />
          </label>

          <div className="design3d-plan-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={
                !canUseDb || !user?.id || submittingStep1 || !patent.field1.trim() || !patent.field2.trim()
              }
              onClick={() => void onStep1Continue()}
            >
              {submittingStep1
                ? 'Saving…'
                : plan.status === 'returned'
                  ? 'Resubmit plan to teacher'
                  : plan.id
                    ? 'Save answers'
                    : 'Submit plan for teacher approval'}
            </button>
            {plan.status === 'pending' && plan.id ? (
              <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                Plan is with your teacher. You can still update the second answer above. Step 2 (checklist) appears
                after you submit — open it anytime; checkboxes stay off until the plan is approved.
              </p>
            ) : !plan.id ? (
              <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                This saves your plan to your teacher. It is not your final quest submission.
              </p>
            ) : null}
            {planSubmitError ? (
              <p className="error" role="alert">
                {planSubmitError}
              </p>
            ) : null}
          </div>
        </div>

          </section>
        </div>
      ) : null}

      {phase === 2 ? (
        <div className="card patent-phase-panel">
          <section aria-labelledby="sticker-patent-phase-2">
        <h2 id="sticker-patent-phase-2" className="patent-phase-title">
          Step 2 — Workshop checklist
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {doneCount} of {STICKER_STEPS.length} steps complete. Checkboxes save as you go.
        </p>

        {!planSubmitted ? (
          <p className="muted">Submit step 1 to your teacher first.</p>
        ) : (
          <>
            {checklistSubmitted ? (
              <p className="muted" role="status">
                Checklist submitted. Use step 3 for the final questions, or go back to review (read-only).
              </p>
            ) : null}
            <div className="design3d-checklist-col" style={{ maxWidth: '42rem' }}>
              <ol className="checklist">
                {STICKER_STEPS.map((label, idx) => (
                  <li key={`${idx}`} className="checklist-item">
                    <label className="checklist-label">
                      <input
                        type="checkbox"
                        checked={checks[idx] ?? false}
                        disabled={!canStartChecklist || checklistSubmitted}
                        onChange={(e) => {
                          const nextArr = [...checks]
                          nextArr[idx] = e.target.checked
                          setChecks(nextArr)
                          void saveChecklistToDb(nextArr, plan.id)
                          if (nextArr.every(Boolean) && canStartChecklist && !checklistSubmitted) {
                            setFlowBanner(
                              'Every checklist step is done. Submit the checklist below to unlock the final questions.',
                            )
                          }
                        }}
                      />
                      <span>{label}</span>
                    </label>

                    {idx === 0 ? (
                      <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <a
                          href="https://www.piskelapp.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                      className={`btn-secondary${!canStartChecklist || checklistSubmitted ? ' btn-disabled' : ''}`}
                      aria-disabled={!canStartChecklist || checklistSubmitted}
                      onClick={
                        !canStartChecklist || checklistSubmitted ? (e) => e.preventDefault() : undefined
                      }
                      style={{ display: 'inline-block', textDecoration: 'none' }}
                    >
                      Open Piskel
                        </a>
                        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                          Watch Piskel basics video here (link coming soon)
                        </p>
                      </div>
                    ) : null}

                    {idx === 2 ? (
                      <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <a
                          href="https://design.cricut.com"
                          target="_blank"
                          rel="noopener noreferrer"
                      className={`btn-secondary${!canStartChecklist || checklistSubmitted ? ' btn-disabled' : ''}`}
                      aria-disabled={!canStartChecklist || checklistSubmitted}
                      onClick={
                        !canStartChecklist || checklistSubmitted ? (e) => e.preventDefault() : undefined
                      }
                      style={{ display: 'inline-block', textDecoration: 'none' }}
                    >
                      Go to design.cricut.com
                        </a>
                        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                          Watch Cricut Design Space setup video here (link coming soon)
                        </p>
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
                  border: '1px solid rgba(216, 90, 48, 0.35)',
                  background: 'rgba(250, 236, 231, 0.25)',
                }}
              >
                <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Bonus completion available</strong>
                <p style={{ margin: 0 }}>
                  This quest can be completed again for bonus WP with a new sticker design. Each version must show
                  clear improvement or a different design direction. Document the differences in your patent packet.
                </p>
              </div>

              {!canStartChecklist ? (
                <p className="muted" style={{ margin: '0.75rem 0 0' }}>
                  Checklist unlocks after your teacher approves your plan.
                </p>
              ) : null}
            </div>

            <div className="design3d-plan-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={
                  checklistSubmitted || !canStartChecklist || !allDone || submittingChecklist
                }
                onClick={() => void onSubmitChecklist()}
              >
                {submittingChecklist ? 'Submitting…' : 'Submit checklist'}
              </button>
              <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                After you submit, the checklist locks and step 3 (final two questions) unlocks.
              </p>
            </div>
          </>
        )}

        <p className="patent-phase-back">
          <button type="button" className="btn-secondary" onClick={() => goPhase(1)}>
            ← Back to step 1
          </button>
        </p>
          </section>
        </div>
      ) : null}

      {phase === 3 ? (
        <div className="card patent-phase-panel">
          <section aria-labelledby="sticker-patent-phase-3">
        <h2 id="sticker-patent-phase-3" className="patent-phase-title">
          Step 3 — Final patent questions
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Your answers save as you type. Submit when both are complete.
        </p>

        {!checklistSubmitted ? (
          <p className="muted">Submit your checklist in step 2 to unlock this section.</p>
        ) : (
          <>
            <div className="design3d-patent-col" style={{ maxWidth: '40rem' }}>
              <label className="patent-field">
                <span className="patent-label">How did you make it an original work?</span>
                <textarea
                  value={patent.field3}
                  rows={5}
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
                  onChange={(e) => {
                    const val = e.target.value
                    setPatent((p) => ({ ...p, field4: val }))
                    void saveFieldToDb('field_4', val, plan.id)
                  }}
                />
              </label>
            </div>

            <div className="modal-actions patent-game-piece-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={
                  !canUseDb ||
                  !user?.id ||
                  submittingPatent ||
                  !patent.field3.trim() ||
                  !patent.field4.trim()
                }
                onClick={() => void onSubmitForApproval()}
              >
                {submittingPatent ? 'Submitting…' : 'Submit quest for approval'}
              </button>
            </div>
          </>
        )}

        <p className="patent-phase-back">
          <button type="button" className="btn-secondary" onClick={() => goPhase(2)}>
            ← Back to checklist
          </button>
        </p>
          </section>
        </div>
      ) : null}

      {submitApprovalError ? <p className="error" role="alert">{submitApprovalError}</p> : null}
      {submitSuccessMessage ? (
        <p className="muted" role="status" style={{ marginTop: '0.75rem' }}>
          {submitSuccessMessage}
        </p>
      ) : null}
    </form>
  )
}
