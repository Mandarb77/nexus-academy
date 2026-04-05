import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PatentFlowBanner } from './PatentFlowBanner'
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

function readStoredPhase(key: string): 1 | 2 | 3 {
  const raw = sessionStorage.getItem(key)
  if (raw === '2') return 2
  if (raw === '3') return 3
  return 1
}

export function PersonalGamePiecePatentContent({ tile, refresh, completionStatus }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const studentId = user?.id ?? 'anonymous'

  const field1DraftKey = `nexus:tile-patent-f1:${studentId}:${tile.id}`
  const phaseKey = `nexus:patent-phase:${studentId}:${tile.id}`

  const [initialised, setInitialised] = useState(false)
  const [plan, setPlan] = useState<PlanState>({ id: '', status: 'none' })
  const [checks, setChecks] = useState<boolean[]>(EMPTY_CHECKS())
  const [patent, setPatent] = useState<PatentDraft>(EMPTY_DRAFT)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [phase, setPhase] = useState<1 | 2 | 3>(1)
  const [submittingPatent, setSubmittingPatent] = useState(false)
  const [submittingStep1, setSubmittingStep1] = useState(false)
  const [planSubmitError, setPlanSubmitError] = useState<string | null>(null)
  const [submitApprovalError, setSubmitApprovalError] = useState<string | null>(null)
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null)
  const [flowBanner, setFlowBanner] = useState<string | null>(null)
  const [showImportNote, setShowImportNote] = useState(false)
  const [checklistSubmitted, setChecklistSubmitted] = useState(false)
  const [submittingChecklist, setSubmittingChecklist] = useState(false)

  /** Pick initial phase once per tile+user after load; avoid resetting from sessionStorage every render. */
  const bootstrappedForTileRef = useRef<string | null>(null)

  const canUseDb = Boolean(user?.id)

  const loadFromDatabase = useCallback(async () => {
    if (!user?.id) return

    const { data, error } = await supabase
      .from('patents')
      .select(
        'id, status, stage, field_1, field_2, field_3, field_4, checklist_state, checklist_submitted, upload_url, created_at',
      )
      .eq('student_id', user.id)
      .eq('tile_id', tile.id)
      .eq('stage', 'plan')
      .order('created_at', { ascending: false })
      .limit(1)

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
      checklist_submitted?: boolean | null
      upload_url?: string | null
    } | undefined

    if (!row) {
      localStorage.removeItem(field1DraftKey)
      localStorage.removeItem(`nexus:tile-checklist:${studentId}:${tile.id}`)
      localStorage.removeItem(`nexus:tile-patent:${studentId}:${tile.id}`)
      setChecks(EMPTY_CHECKS())
      setPatent(EMPTY_DRAFT)
      setPlan({ id: '', status: 'none' })
      setUploadUrl(null)
      setChecklistSubmitted(false)
      setInitialised(true)
      return
    }

    const planStatus = (row.status as PlanStatus) ?? 'pending'
    setPlan({ id: row.id, status: planStatus })

    // Only reset checklist when the teacher explicitly returns the plan — not while it is pending.
    const rawSubmitted = Boolean(row.checklist_submitted)
    if (planStatus === 'returned') {
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

    // Migration-safe: extend shorter stored arrays with false for any newly added steps.
    const rawCs = row.checklist_state
    const rawCsArr = Array.isArray(rawCs) ? (rawCs as boolean[]) : []
    const cs: boolean[] = [
      ...rawCsArr.slice(0, PERSONAL_GAME_PIECE_STEPS.length),
      ...Array(Math.max(0, PERSONAL_GAME_PIECE_STEPS.length - rawCsArr.length)).fill(false),
    ]
    setChecks(cs)
    setUploadUrl(row.upload_url ?? null)

    const draftField1 = planStatus !== 'approved' ? (localStorage.getItem(field1DraftKey) ?? null) : null
    if (planStatus === 'approved') localStorage.removeItem(field1DraftKey)
    setPatent({
      field1: draftField1 ?? row.field_1 ?? '',
      field2: row.field_2 ?? '',
      field3: row.field_3 ?? '',
      field4: row.field_4 ?? '',
    })

    setInitialised(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tile.id, studentId])

  useEffect(() => {
    void loadFromDatabase()
  }, [loadFromDatabase])

  const canStartChecklist = Boolean(plan.id)
  const doneCount = checks.filter(Boolean).length
  const allDone = doneCount === PERSONAL_GAME_PIECE_STEPS.length

  const planSubmitted = Boolean(plan.id)

  /** Step 2 exists only after plan is submitted; step 3 only after checklist is submitted. */
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

  const handleFileUpload = async (file: File) => {
    if (!user?.id || !plan.id) return
    setUploading(true)
    setUploadError(null)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
      const path = `${user.id}/${plan.id}/submission.${ext}`
      const { error: upErr } = await supabase.storage
        .from('patent-uploads')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage.from('patent-uploads').getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      const { error: dbErr } = await supabase.from('patents').update({ upload_url: publicUrl }).eq('id', plan.id)
      if (dbErr) throw dbErr

      setUploadUrl(publicUrl)
      // Auto-check the upload step checkbox
      const nextArr = [...checks]
      nextArr[PERSONAL_GAME_PIECE_STEPS.length - 1] = true
      setChecks(nextArr)
      void saveChecklistToDb(nextArr, plan.id)
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed.')
      console.error('[PatentContent] upload:', e)
    } finally {
      setUploading(false)
    }
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
          'Plan sent for teacher approval. Step 2 (checklist) is unlocked — checkboxes turn on after your teacher approves.',
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
        const { error } = await supabase
          .from('patents')
          .update({ field_2: patent.field2 })
          .eq('id', plan.id)
        if (error) throw error
        setFlowBanner('Your answers are saved. Continue to the checklist when you are ready.')
      }

      await loadFromDatabase()
      goPhase(2)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save.'
      console.error('[PatentContent] step 1:', e)
      setPlanSubmitError(msg)
    } finally {
      setSubmittingStep1(false)
    }
  }

  const onSubmitChecklist = async () => {
    if (!plan.id || !allDone || checklistSubmitted) return
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
      console.error('[PatentContent] submit checklist:', e)
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
    if (!allDone) {
      setSubmitApprovalError('Complete all checklist steps first.')
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
      setSubmitSuccessMessage('Quest submitted for teacher approval! Returning to Forge…')
      setFlowBanner('Patent packet submitted successfully.')
      window.setTimeout(() => navigate('/tree/forge'), 1400)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Submit failed.'
      console.error('[PatentContent] submit for approval:', e)
      setSubmitApprovalError(msg)
    } finally {
      setSubmittingPatent(false)
    }
  }

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
      <PatentFlowBanner
        message={flowBanner}
        tone="success"
        onClear={() => setFlowBanner(null)}
      />

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

      {/* ── Step 1: first two questions only (only this step is mounted while active) ── */}
      {phase === 1 ? (
        <div className="card patent-phase-panel">
          <section aria-labelledby="patent-phase-1-title">
        <h2 id="patent-phase-1-title" className="patent-phase-title">
          Step 1 — What you&apos;re making
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Answer both questions, then continue. Your text is kept when you move to the next steps.
        </p>

        <div className="design3d-patent-col" style={{ maxWidth: '40rem' }}>
          <p className="muted" style={{ marginTop: 0, marginBottom: '0.85rem' }}>
            Use <strong>inches</strong> only for sizes. Maximum footprint:{' '}
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
                !canUseDb ||
                !user?.id ||
                submittingStep1 ||
                !patent.field1.trim() ||
                !patent.field2.trim()
              }
              onClick={() => void onStep1Continue()}
            >
              {submittingStep1
                ? 'Saving…'
                : plan.status === 'returned'
                  ? 'Resubmit plan to teacher'
                  : plan.id
                    ? 'Save answers'
                    : 'Save and start checklist'}
            </button>
            {plan.status === 'pending' && plan.id ? (
              <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                Plan saved. You can still update your answers here. Your teacher will also see them.
              </p>
            ) : !plan.id ? (
              <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                Saves your plan and immediately unlocks the checklist. Also visible to your teacher.
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
          <section aria-labelledby="patent-phase-2-title">
        <h2 id="patent-phase-2-title" className="patent-phase-title">
          Step 2 — Workshop checklist
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {doneCount} of {PERSONAL_GAME_PIECE_STEPS.length} steps complete. Checkboxes save as you go.
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
                {PERSONAL_GAME_PIECE_STEPS.map((label, idx) => (
                  <li key={`${label}-${idx}`} className="checklist-item">
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

                    {idx === 1 ? (
                      <div
                        style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                      >
                        <a
                          href="https://www.tinkercad.com/joinclass/2XTJEL26G"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`btn-secondary${!canStartChecklist || checklistSubmitted ? ' btn-disabled' : ''}`}
                          aria-disabled={!canStartChecklist || checklistSubmitted}
                          onClick={
                            !canStartChecklist || checklistSubmitted ? (e) => e.preventDefault() : undefined
                          }
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
                          className={`btn-secondary${!canStartChecklist || checklistSubmitted ? ' btn-disabled' : ''}`}
                          aria-disabled={!canStartChecklist || checklistSubmitted}
                          onClick={
                            !canStartChecklist || checklistSubmitted ? (e) => e.preventDefault() : undefined
                          }
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
                          className={`btn-secondary${!canStartChecklist || checklistSubmitted ? ' btn-disabled' : ''}`}
                          aria-disabled={!canStartChecklist || checklistSubmitted}
                          onClick={
                            !canStartChecklist || checklistSubmitted ? (e) => e.preventDefault() : undefined
                          }
                          style={{ display: 'inline-block', textDecoration: 'none' }}
                        >
                          Open locked base in TinkerCAD
                        </a>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={!canStartChecklist || checklistSubmitted}
                          onClick={() => setShowImportNote((prev) => !prev)}
                        >
                          {showImportNote ? 'Hide import note' : 'Read import note'}
                        </button>
                        {showImportNote ? (
                          <div className="card" role="note" style={{ padding: '0.75rem' }}>
                            <p style={{ margin: 0 }}>
                              Use the <strong>locked base</strong> link above to open the game piece clip in TinkerCAD —
                              copy it into your own design. You can also import a starting shape from{' '}
                              <strong>thingiverse.com</strong> or <strong>printables.com</strong> and modify it to make
                              it your own. Imported designs must be meaningfully changed — not just printed as-is.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Step 8 — upload photo/video */}
                    {idx === PERSONAL_GAME_PIECE_STEPS.length - 1 ? (
                      <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {uploadUrl ? (
                          <div>
                            {/\.(mp4|webm|mov|avi|m4v)$/i.test(uploadUrl) ? (
                              <video
                                src={uploadUrl}
                                controls
                                style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', display: 'block' }}
                              />
                            ) : (
                              <img
                                src={uploadUrl}
                                alt="Uploaded work"
                                style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', objectFit: 'contain', display: 'block' }}
                              />
                            )}
                            <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>
                              File uploaded — choose a new file to replace it.
                            </p>
                          </div>
                        ) : null}
                        <label style={{ display: 'inline-flex', cursor: !canStartChecklist || checklistSubmitted ? 'not-allowed' : 'pointer' }}>
                          <span
                            className={`btn-secondary${!canStartChecklist || checklistSubmitted || uploading ? ' btn-disabled' : ''}`}
                            style={{ pointerEvents: 'none' }}
                          >
                            {uploading ? 'Uploading…' : uploadUrl ? 'Replace file' : 'Choose photo or video'}
                          </span>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            disabled={!canStartChecklist || checklistSubmitted || uploading}
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) void handleFileUpload(file)
                              e.target.value = ''
                            }}
                          />
                        </label>
                        {uploadError ? (
                          <p className="error" role="alert" style={{ margin: 0, fontSize: '0.85rem' }}>{uploadError}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
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
                  Answer both questions in step 1 and save to unlock the checklist.
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
          <section aria-labelledby="patent-phase-3-title">
        <h2 id="patent-phase-3-title" className="patent-phase-title">
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
                <span className="patent-label">How did you make it an original work? <span className="patent-required">*</span></span>
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
                <span className="patent-label">What do you have to iterate? <span className="patent-required">*</span></span>
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
