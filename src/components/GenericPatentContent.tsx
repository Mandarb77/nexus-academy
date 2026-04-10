/**
 * GenericPatentContent — patent packet flow for Quest Builder tiles.
 *
 * Fixed opening questions (field_1 / field_2 labels):
 *   Q1  "Describe what you are going to make."
 *   Q2  "Who are you making this for and why does it matter?"
 *
 * Checklist steps from `resolvedTileSteps(tile)` (DB Quest Builder steps, or embedded e.g. T-shirt).
 * Steps marked requiresApproval show a visual checkpoint badge.
 *
 * Fixed closing questions (field_3 / field_4 labels):
 *   Q3  "What makes this work yours — where did you go beyond the example?"
 *   Q4  "What failed and what did you change?"
 *
 * Three teacher-approval gates (same as Game Piece / Sticker):
 *   Gate 1 — Teacher approves plan (Q1+Q2) → checklist unlocks.
 *   Gate 2 — Teacher approves submitted checklist → closing Qs unlock.
 *   Gate 3 — Teacher approves final submission → WP + gold awarded.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PatentFlowBanner } from './PatentFlowBanner'
import { EmpathyForm } from './EmpathyForm'
import { FinalApprovalBanner } from './FinalApprovalBanner'
import { ApprovedQuestView } from './ApprovedQuestView'
import { queueApprovalCelebration } from '../lib/approvalCelebration'
import { supabase } from '../lib/supabase'
import { EMPTY_EMPATHY, parseEmpathy, serializeEmpathy, isEmpathyValid } from '../lib/empathy'
import type { EmpathyDraft } from '../lib/empathy'
import type { TileRow, StepConfig } from '../types/tile'
import type { SkillCompletionStatus } from '../types/skillCompletion'
import { isTShirtPatentQuestTile, resolvedTileSteps } from '../lib/customTile'
import { fillPatentPlanFieldsFromRows, type LoadedPlanPatentRow } from '../lib/patentFormMerge'
import { serverSuggestedPatentPhase } from '../lib/patentPhaseBootstrap'
import { selectStudentPatentPrimary } from '../lib/patentPlanRow'
import { normalizePatentPlanStatus, type UiPatentPlanStatus } from '../lib/patentPlanStatus'
import { patentRowMatchesTile, patentTileIdCandidates } from '../lib/patentTileQuery'
import { skillTreeGuildModifier } from '../lib/guildTree'
import { fileForPatentStorage } from '../lib/patentFileUpload'
import { T_SHIRT_QUEST_CHECKLIST_FOOTER } from '../lib/tShirtQuestSteps'

type Props = {
  tile: TileRow
  refresh: () => Promise<void>
  completionStatus: SkillCompletionStatus | undefined
}

type PatentDraft = { field1: string; field3: string; field4: string }
type PlanStatus = UiPatentPlanStatus
type PlanState = { id: string; status: PlanStatus }

const EMPTY_DRAFT: PatentDraft = { field1: '', field3: '', field4: '' }

function emptyChecks(steps: StepConfig[]): boolean[] {
  return Array(steps.length).fill(false)
}

function guildBackRoute(guild: string): string {
  const mod = skillTreeGuildModifier(guild)
  if (mod === 'forge') return '/tree/forge'
  if (mod === 'prism') return '/tree/prism'
  if (mod === 'folded') return '/tree/folded'
  return '/tree'
}

function checklistFooterNoteForTile(tile: TileRow): string | null {
  const fromDb = tile.checklist_footer_note?.trim()
  if (fromDb) return fromDb
  if (isTShirtPatentQuestTile(tile)) return T_SHIRT_QUEST_CHECKLIST_FOOTER
  return null
}

export function GenericPatentContent({ tile, refresh, completionStatus }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const studentId = user?.id ?? 'anonymous'

  const steps: StepConfig[] = resolvedTileSteps(tile)
  const checklistFooterNote = checklistFooterNoteForTile(tile)
  const backRoute = guildBackRoute(tile.guild)
  const field1DraftKey = `nexus:tile-patent-f1:${studentId}:${tile.id}`
  const empathyDraftKey = `nexus:tile-patent-empathy:${studentId}:${tile.id}`
  const phaseKey = `nexus:patent-phase:${studentId}:${tile.id}`

  const [initialised, setInitialised] = useState(false)
  const [plan, setPlan] = useState<PlanState>({ id: '', status: 'none' })
  const [checks, setChecks] = useState<boolean[]>(() => emptyChecks(steps))
  const [patent, setPatent] = useState<PatentDraft>(EMPTY_DRAFT)
  const [empathy, setEmpathy] = useState<EmpathyDraft>(EMPTY_EMPATHY)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [processUploadUrl, setProcessUploadUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processUploading, setProcessUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [phase, setPhase] = useState<1 | 2 | 3>(1)
  const [submittingPatent, setSubmittingPatent] = useState(false)
  const [submittingStep1, setSubmittingStep1] = useState(false)
  const [planSubmitError, setPlanSubmitError] = useState<string | null>(null)
  const [submitApprovalError, setSubmitApprovalError] = useState<string | null>(null)
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null)
  const [flowBanner, setFlowBanner] = useState<string | null>(null)
  const [checklistSubmitted, setChecklistSubmitted] = useState(false)
  const [checklistApproved, setChecklistApproved] = useState(false)
  const [submittingChecklist, setSubmittingChecklist] = useState(false)
  const [checklistSaveError, setChecklistSaveError] = useState<string | null>(null)
  const [approvalNotice, setApprovalNotice] = useState<{ message: string; tone: 'success' | 'returned' } | null>(null)
  const [finalApproval, setFinalApproval] = useState<{ wp: number; gold: number } | null>(null)
  const bannerFiredRef = useRef(false)
  const approvalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** When this changes vs last load, re-apply tab from DB (refresh / realtime). */
  const phaseHydrateSigRef = useRef<string>('')

  const showApprovalNotice = (message: string, tone: 'success' | 'returned') => {
    setApprovalNotice({ message, tone })
    if (approvalTimerRef.current) clearTimeout(approvalTimerRef.current)
    approvalTimerRef.current = setTimeout(() => setApprovalNotice(null), 8000)
  }

  const dismissApprovalBanner = useCallback(() => {
    const id = String(tile.id)
    localStorage.setItem(`nexus:approval-seen:${id}`, '1')
    localStorage.removeItem(`nexus:approval-wp:${id}`)
    localStorage.removeItem(`nexus:approval-gold:${id}`)
    setFinalApproval(null)
  }, [tile.id])

  const canUseDb = Boolean(user?.id)
  /** Same source as read-only plan fields: teacher must have approved this plan row in the DB. */
  const planApprovedForChecklist = plan.status === 'approved'
  const canStartChecklist = planApprovedForChecklist && !(checklistSubmitted && !checklistApproved)
  const planStep1FieldsLocked = plan.status === 'pending' || plan.status === 'approved'

  const loadFromDatabase = useCallback(async () => {
    if (!user?.id) {
      console.log('[PatentLoad] GenericPatent step:skip-no-user', { tileId: tile.id })
      setInitialised(true)
      return
    }

    const tileCandidates = patentTileIdCandidates(tile.id)
    console.log('[PatentLoad] GenericPatent step:1-query', {
      studentId: user.id,
      tileId: tile.id,
      tileIdType: typeof tile.id,
      tileCandidates,
      stages: ['plan', 'packet'],
    })

    const { data, error } = await supabase
      .from('patents')
      .select(
        'id, status, stage, field_1, field_2, field_3, field_4, checklist_state, checklist_submitted, checklist_approved, upload_url, process_upload_url, created_at',
      )
      .eq('student_id', user.id)
      .in('tile_id', tileCandidates)
      .in('stage', ['plan', 'packet'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[PatentLoad] GenericPatent step:error', error.message)
      setInitialised(true)
      return
    }

    const allRows = (data ?? []) as LoadedPlanPatentRow[]
    console.log('[PatentLoad] GenericPatent step:2-raw-rows', { count: allRows.length, rows: allRows })

    const { primary: row, canUnlockChecklist, source } = selectStudentPatentPrimary(
      allRows,
      normalizePatentPlanStatus,
    )

    if (!row) {
      console.log('[PatentLoad] GenericPatent step:3-no-primary', { pickSource: source })
      phaseHydrateSigRef.current = ''
      setPhase(1)
      try {
        sessionStorage.setItem(phaseKey, '1')
      } catch {
        /* ignore */
      }
      setPlan({ id: '', status: 'none' })
      setChecks(emptyChecks(steps))
      setPatent(EMPTY_DRAFT)
      setUploadUrl(null)
      setProcessUploadUrl(null)
      setChecklistSubmitted(false)
      setChecklistApproved(false)
      const draftF1 = localStorage.getItem(field1DraftKey) ?? ''
      const draftEmpathy = localStorage.getItem(empathyDraftKey) ?? null
      setPatent((p) => ({ ...p, field1: draftF1 }))
      setEmpathy(draftEmpathy ? parseEmpathy(draftEmpathy) : EMPTY_EMPATHY)
      console.log('[PatentLoad] GenericPatent step:4-state-empty', {
        patentField1: draftF1,
        empathyFromDraft: Boolean(draftEmpathy),
      })
      setInitialised(true)
      return
    }

    const primaryStage = String(row.stage ?? '').trim().toLowerCase() === 'packet' ? 'packet' : 'plan'
    console.log('[PatentLoad] GenericPatent step:3-primary-row', {
      id: row.id,
      stage: row.stage,
      primaryStage,
      status: row.status,
      pickSource: source,
      pickCanUnlockChecklist: canUnlockChecklist,
    })

    const planStatus = normalizePatentPlanStatus(row.status ?? 'none')
    setPlan({ id: row.id, status: planStatus })

    const rawSubmitted = Boolean(row.checklist_submitted)
    let checklistAppr = false
    let checklistSub = false
    if (planStatus === 'returned') {
      setChecklistSubmitted(false)
      setChecklistApproved(false)
      if (rawSubmitted) {
        void supabase.from('patents').update({ checklist_submitted: false, checklist_approved: false }).eq('id', row.id)
      }
    } else {
      checklistSub = rawSubmitted
      checklistAppr = Boolean(row.checklist_approved)
      setChecklistSubmitted(checklistSub)
      setChecklistApproved(checklistAppr)
    }

    const rawCs = row.checklist_state
    const rawCsArr = Array.isArray(rawCs) ? (rawCs as boolean[]) : []
    const csFromDb: boolean[] = [
      ...rawCsArr.slice(0, steps.length),
      ...Array(Math.max(0, steps.length - rawCsArr.length)).fill(false),
    ]
    const checksForUi =
      primaryStage === 'packet' ? Array(steps.length).fill(true) : csFromDb
    setChecks(checksForUi)
    console.log('[PatentLoad] GenericPatent step:4-checklist_state', {
      checklist_state_raw: rawCs,
      normalizedFromDb: csFromDb,
      checksAppliedToState: checksForUi,
      packetStageAllComplete: primaryStage === 'packet',
    })

    setUploadUrl(row.upload_url ?? null)
    setProcessUploadUrl(row.process_upload_url ?? null)

    const draftField1 = planStatus !== 'approved' ? (localStorage.getItem(field1DraftKey) ?? null) : null
    const draftEmpathy = planStatus !== 'approved' ? (localStorage.getItem(empathyDraftKey) ?? null) : null
    if (planStatus === 'approved') {
      localStorage.removeItem(field1DraftKey)
      localStorage.removeItem(empathyDraftKey)
    }

    const merged = fillPatentPlanFieldsFromRows(row, allRows)
    const field1 = draftField1 ?? merged.field_1
    const field3 = merged.field_3
    const field4 = merged.field_4
    const empathyVal = draftEmpathy ? parseEmpathy(draftEmpathy) : parseEmpathy(merged.field_2 || null)

    setPatent({ field1, field3, field4 })
    setEmpathy(empathyVal)

    console.log('[PatentLoad] GenericPatent step:5-form-state', {
      field1,
      field2_json: merged.field_2,
      field3,
      field4,
      empathyParsed: empathyVal,
    })

    const planSubmittedBool = Boolean(row.id)
    const maxPh: 1 | 2 | 3 = !planSubmittedBool ? 1 : !checklistAppr ? 2 : 3
    const serverPh = serverSuggestedPatentPhase({
      primaryStage,
      planStatus,
      checklistApproved: checklistAppr,
    })
    const nextPhase = Math.min(Math.max(serverPh, 1), maxPh) as 1 | 2 | 3
    const sig = `${row.id}|${primaryStage}|${planStatus}|${checklistAppr}|${checklistSub}`
    if (phaseHydrateSigRef.current !== sig) {
      phaseHydrateSigRef.current = sig
      setPhase(nextPhase)
      try {
        sessionStorage.setItem(phaseKey, String(nextPhase))
      } catch {
        /* ignore */
      }
    }
    console.log('[PatentLoad] GenericPatent step:6-phase', {
      serverPh,
      maxPh,
      nextPhase,
      hydrateSig: sig,
    })

    setInitialised(true)
    console.log('[PatentLoad] GenericPatent step:7-initialised')
  }, [user?.id, tile.id, steps.length, field1DraftKey, empathyDraftKey, phaseKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void loadFromDatabase()
  }, [loadFromDatabase])

  useEffect(() => {
    if (!user?.id) return
    const uid = user.id
    const tid = String(tile.id)

    const channel = supabase
      .channel(`patent-watch-custom-${tid}-${uid}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patents', filter: `student_id=eq.${uid}` }, (payload) => {
        const prev = payload.old as Record<string, unknown>
        const next = payload.new as Record<string, unknown>
        if (!patentRowMatchesTile(tile.id, next.tile_id)) return
        void loadFromDatabase()
        if (prev.status !== 'approved' && next.status === 'approved') showApprovalNotice('✓ Plan approved — your checklist is now unlocked!', 'success')
        else if (!prev.checklist_approved && next.checklist_approved) showApprovalNotice('✓ Checklist approved — final questions are now unlocked!', 'success')
        else if (next.status === 'returned') showApprovalNotice('↩ Step returned — check with your teacher and try again.', 'returned')
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'skill_completions', filter: `student_id=eq.${uid}` }, (payload) => {
        const prev = payload.old as Record<string, unknown>
        const next = payload.new as Record<string, unknown>
        if (!patentRowMatchesTile(tile.id, next.tile_id)) return
        void loadFromDatabase()
        void refresh()
        if (prev.status !== 'approved' && next.status === 'approved') {
          if (next.wp_awarded != null && next.gold_awarded != null) {
            const wp = typeof next.wp_awarded === 'number' ? next.wp_awarded : 0
            const gold = typeof next.gold_awarded === 'number' ? next.gold_awarded : 0
            localStorage.setItem(`nexus:approval-wp:${tid}`, String(wp))
            localStorage.setItem(`nexus:approval-gold:${tid}`, String(gold))
            const cid = next.id != null ? String(next.id) : ''
            if (cid) queueApprovalCelebration({ wp, gold, completionId: cid })
            bannerFiredRef.current = true
            setFinalApproval({ wp, gold })
          }
        }
        else if (next.status === 'returned') showApprovalNotice('↩ Final application returned — check with your teacher and resubmit.', 'returned')
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
      if (approvalTimerRef.current) clearTimeout(approvalTimerRef.current)
    }
  }, [user?.id, tile.id, loadFromDatabase, refresh])

  /** On mount: if this quest was approved while the student was away, show the banner once. */
  useEffect(() => {
    if (!initialised || !user?.id) return
    if (completionStatus !== 'approved') return
    const id = String(tile.id)
    if (localStorage.getItem(`nexus:approval-seen:${id}`)) return
    if (bannerFiredRef.current) return
    bannerFiredRef.current = true
    const cachedWp = Number(localStorage.getItem(`nexus:approval-wp:${id}`) ?? '')
    const cachedGold = Number(localStorage.getItem(`nexus:approval-gold:${id}`) ?? '')
    if (cachedWp > 0 || cachedGold > 0) {
      setFinalApproval({ wp: cachedWp, gold: cachedGold })
      return
    }
    void supabase
      .from('skill_completions')
      .select('wp_awarded, gold_awarded')
      .eq('student_id', user.id)
      .eq('tile_id', tile.id)
      .eq('status', 'approved')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setFinalApproval({ wp: data.wp_awarded ?? 0, gold: data.gold_awarded ?? 0 })
      })
  }, [initialised, completionStatus, tile.id, user?.id])

  const doneCount = checks.filter(Boolean).length
  const allDone = doneCount === steps.length

  const planSubmitted = Boolean(plan.id)

  const maxPhase = useMemo((): 1 | 2 | 3 => {
    if (!planSubmitted) return 1
    if (!checklistApproved) return 2
    return 3
  }, [planSubmitted, checklistApproved])

  useEffect(() => {
    if (!initialised) return
    setPhase((p) => (p > maxPhase ? maxPhase : p))
  }, [initialised, maxPhase])

  const goPhase = (p: 1 | 2 | 3) => {
    const next = Math.min(Math.max(p, 1), maxPhase) as 1 | 2 | 3
    setPhase(next)
    sessionStorage.setItem(phaseKey, String(next))
  }

  // Auto-advance the student UI when teacher approvals arrive via realtime.
  useEffect(() => {
    if (!initialised) return
    if (planApprovedForChecklist && phase === 1 && maxPhase >= 2) {
      goPhase(2)
    }
    if (checklistApproved && phase === 2 && maxPhase >= 3) {
      goPhase(3)
    }
  }, [initialised, planApprovedForChecklist, checklistApproved, phase, maxPhase]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveChecklistToDb = async (nextArr: boolean[], pid: string) => {
    // While awaiting checklist review, prevent edits that would desync what the teacher is reviewing.
    // If a teacher has already approved the checklist, allow edits again (final submission is still gated by allDone).
    if (!pid || (checklistSubmitted && !checklistApproved)) return
    const { error } = await supabase.from('patents').update({ checklist_state: nextArr }).eq('id', pid)
    if (error) {
      console.error('[GenericPatent] checklist save:', error.message)
      setChecklistSaveError(`Could not save checklist: ${error.message}`)
      return
    }
    setChecklistSaveError(null)
  }

  const saveFieldToDb = async (fieldName: 'field_2' | 'field_3' | 'field_4', value: string, pid: string) => {
    if (!pid) return
    const { error } = await supabase.from('patents').update({ [fieldName]: value }).eq('id', pid)
    if (error) console.error(`[GenericPatent] ${fieldName} save:`, error.message)
  }

  const handleFileUpload = async (file: File) => {
    if (!user?.id || !plan.id) return
    setUploading(true)
    setUploadError(null)
    try {
      const uploadFile = await fileForPatentStorage(file)
      const ext = uploadFile.type.startsWith('image/') ? 'jpg' : (file.name.split('.').pop()?.toLowerCase() ?? 'bin')
      const path = `${user.id}/${plan.id}/submission.${ext}`
      const { error: upErr } = await supabase.storage.from('patent-uploads').upload(path, uploadFile, { upsert: true })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('patent-uploads').getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      const { error: dbErr } = await supabase.from('patents').update({ upload_url: publicUrl }).eq('id', plan.id)
      if (dbErr) throw dbErr
      setUploadUrl(publicUrl)
      const nextArr = [...checks]
      nextArr[steps.length - 1] = true
      setChecks(nextArr)
      void saveChecklistToDb(nextArr, plan.id)
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleProcessFileUpload = async (file: File) => {
    if (!user?.id || !plan.id || !file.type.startsWith('image/')) return
    setProcessUploading(true)
    setUploadError(null)
    try {
      const uploadFile = await fileForPatentStorage(file)
      const path = `${user.id}/${plan.id}/process.jpg`
      const { error: upErr } = await supabase.storage.from('patent-uploads').upload(path, uploadFile, { upsert: true })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('patent-uploads').getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      const { error: dbErr } = await supabase.from('patents').update({ process_upload_url: publicUrl }).eq('id', plan.id)
      if (dbErr) throw dbErr
      setProcessUploadUrl(publicUrl)
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Process photo upload failed.')
    } finally {
      setProcessUploading(false)
    }
  }

  const onStep1Continue = async () => {
    if (plan.status === 'pending' || plan.status === 'approved') return
    if (!patent.field1.trim()) {
      setPlanSubmitError('Fill in both opening questions before continuing.')
      return
    }
    if (!isEmpathyValid(empathy)) {
      setPlanSubmitError('Fill in "What is one thing you know about this person…" before continuing.')
      return
    }
    if (!user?.id) return
    setPlanSubmitError(null)
    setSubmittingStep1(true)
    const empathyJson = serializeEmpathy(empathy)
    try {
      if (plan.id && plan.status !== 'none') {
        const { error } = await supabase.from('patents').update({ field_1: patent.field1, field_2: empathyJson }).eq('id', plan.id)
        if (error) throw error
        if (plan.status === 'returned') localStorage.setItem(field1DraftKey, patent.field1)
      } else {
        const { data, error } = await supabase
          .from('patents')
          .insert({ student_id: user.id, tile_id: tile.id, field_1: patent.field1, field_2: empathyJson, stage: 'plan', status: 'pending' })
          .select('id')
          .single()
        if (error) throw error
        localStorage.setItem(field1DraftKey, patent.field1)
        setPlan({ id: (data as { id: string }).id, status: 'pending' })
      }
      await loadFromDatabase()
    } catch (e: unknown) {
      setPlanSubmitError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSubmittingStep1(false)
    }
  }

  const onSubmitChecklist = async () => {
    if (!plan.id || !allDone || checklistSubmitted) return
    setSubmittingChecklist(true)
    setFlowBanner(null)
    try {
      const { error } = await supabase.from('patents').update({ checklist_submitted: true }).eq('id', plan.id)
      if (error) throw error
      setChecklistSubmitted(true)
      setFlowBanner('Checklist submitted for teacher review. Step 3 unlocks once your teacher approves.')
      await loadFromDatabase()
    } catch (e: unknown) {
      console.error('[GenericPatent] submit checklist:', e)
    } finally {
      setSubmittingChecklist(false)
    }
  }

  const onSubmitForApproval = async () => {
    setSubmitApprovalError(null)
    setSubmitSuccessMessage(null)
    if (!user?.id || !plan.id) {
      setSubmitApprovalError('Save your opening answers before submitting.')
      return
    }
    const pid = plan.id
    if (!patent.field3.trim() || !patent.field4.trim()) {
      setSubmitApprovalError('Fill in both closing questions before submitting.')
      return
    }
    if (!isEmpathyValid(empathy)) {
      setSubmitApprovalError('Fill in "What is one thing you know about this person…" before submitting.')
      return
    }
    if (!allDone) {
      setSubmitApprovalError('Complete all checklist steps first.')
      return
    }
    if (!checklistApproved) {
      setSubmitApprovalError('Wait for your teacher to approve the checklist before submitting.')
      return
    }

    setSubmittingPatent(true)
    try {
      const { error: updErr } = await supabase.from('patents').update({
        stage: 'packet',
        field_2: serializeEmpathy(empathy),
        field_3: patent.field3,
        field_4: patent.field4,
      }).eq('id', pid)
      if (updErr) throw updErr

      const { data: existing } = await supabase
        .from('skill_completions')
        .select('id, status')
        .eq('student_id', user.id)
        .eq('tile_id', tile.id)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase.from('skill_completions').update({ status: 'pending', patent_id: pid, wp_awarded: null, gold_awarded: null }).eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('skill_completions').insert({ student_id: user.id, tile_id: tile.id, skill_key: tile.id, status: 'pending', patent_id: pid })
        if (error) throw error
      }

      await refresh()
      setSubmitSuccessMessage('Final application submitted! Returning to skill tree…')
      setFlowBanner('Final application submitted — awaiting teacher approval.')
      window.setTimeout(() => navigate(backRoute), 1400)
    } catch (e: unknown) {
      setSubmitApprovalError(e instanceof Error ? e.message : 'Submit failed.')
    } finally {
      setSubmittingPatent(false)
    }
  }

  if (!initialised) {
    return (
      <p className="muted" role="status">
        Loading patent from the database…
      </p>
    )
  }

  if (completionStatus === 'approved') {
    return (
      <>
        {finalApproval ? (
          <FinalApprovalBanner wp={finalApproval.wp} gold={finalApproval.gold} onDismiss={dismissApprovalBanner} />
        ) : null}
        <ApprovedQuestView
          steps={steps.map((s) => s.description)}
          checks={checks}
          empathy={empathy}
          answers={[
            { label: 'What are you going to make?', value: patent.field1 },
            { label: '__empathy__', value: '' },
            { label: 'What makes this work yours — where did you go beyond the example?', value: patent.field3 },
            { label: 'What failed and what did you change?', value: patent.field4 },
          ]}
          uploadUrl={uploadUrl}
          repeatNote="Talk to your teacher to reset the checklist if you'd like to complete this quest again."
        />
      </>
    )
  }

  const isFinalPending = completionStatus === 'pending'

  return (
    <form className="patent-game-piece-form" data-patent-flow="generic-checklist-gate" onSubmit={(e) => e.preventDefault()}>
      {finalApproval ? (
        <FinalApprovalBanner
          wp={finalApproval.wp}
          gold={finalApproval.gold}
          onDismiss={dismissApprovalBanner}
        />
      ) : null}

      <PatentFlowBanner message={flowBanner} tone="success" onClear={() => setFlowBanner(null)} />

      {approvalNotice ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
            padding: '0.65rem 1rem', marginBottom: '1rem', borderRadius: '8px', fontWeight: 600, fontSize: '1rem',
            background: approvalNotice.tone === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
            border: `2px solid ${approvalNotice.tone === 'success' ? '#16a34a' : '#ca8a04'}`,
            color: approvalNotice.tone === 'success' ? '#15803d' : '#92400e',
          }}
        >
          <span>{approvalNotice.message}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setApprovalNotice(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '0 0.25rem', color: 'inherit', opacity: 0.7 }}>×</button>
        </div>
      ) : null}

      {/* ── Tab bar ── */}
      <div className="patent-step-tabs" role="tablist" aria-label="Quest steps">
        {([
          { n: 1 as const, label: 'Opening questions' },
          ...(planSubmitted ? [{ n: 2 as const, label: 'Checklist' }] : []),
          ...(checklistApproved ? [{ n: 3 as const, label: 'Final questions' }] : []),
        ] as { n: 1 | 2 | 3; label: string }[]).map(({ n, label }) => (
          <button key={n} type="button" role="tab" aria-selected={phase === n}
            className={'patent-step-tabs__btn' + (phase === n ? ' patent-step-tabs__btn--active' : '')}
            onClick={() => n <= maxPhase && goPhase(n)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Phase 1: Opening questions ── */}
      {phase === 1 ? (
        <div className="card patent-phase-panel">
          <section aria-labelledby="generic-patent-phase-1">
            <h2 id="generic-patent-phase-1" className="patent-phase-title">Step 1 — Opening questions</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Answer both questions, then save. Your teacher will review before the checklist unlocks.
            </p>

            {plan.status === 'pending' && plan.id ? (
              <p style={{ fontWeight: 600, padding: '0.45rem 0.85rem', background: 'rgba(234,179,8,0.12)', borderLeft: '4px solid #ca8a04', borderRadius: '6px', marginBottom: '0.75rem' }}>
                ⏳ Plan submitted — waiting for teacher approval. The checklist unlocks once approved.
              </p>
            ) : null}
            {plan.status === 'approved' && plan.id ? (
              <p style={{ fontWeight: 600, padding: '0.45rem 0.85rem', background: 'rgba(34,197,94,0.12)', borderLeft: '4px solid #16a34a', borderRadius: '6px', marginBottom: '0.75rem' }}>
                ✓ Plan approved — opening answers are saved below (read-only). Use the Checklist tab to continue.
              </p>
            ) : null}

            <div className="design3d-patent-col" style={{ maxWidth: '40rem' }}>
              <label className="patent-field">
                <span className="patent-label">Describe what you are going to make. <span className="patent-required">*</span></span>
                <textarea rows={3} value={patent.field1}
                  placeholder="Your answer here"
                  disabled={planStep1FieldsLocked}
                  onChange={(e) => {
                    const val = e.target.value
                    setPatent((p) => ({ ...p, field1: val }))
                    localStorage.setItem(field1DraftKey, val)
                  }}
                />
              </label>

              <EmpathyForm
                value={empathy}
                disabled={!canUseDb || planStep1FieldsLocked}
                onChange={(next) => {
                  setEmpathy(next)
                  localStorage.setItem(empathyDraftKey, serializeEmpathy(next))
                  if (plan.id) void saveFieldToDb('field_2', serializeEmpathy(next), plan.id)
                }}
              />
            </div>

            {planSubmitError ? <p className="error" role="alert">{planSubmitError}</p> : null}

            <div className="design3d-plan-actions">
              <button type="button" className="btn-primary"
                disabled={planStep1FieldsLocked || !canUseDb || !user?.id || submittingStep1 || !patent.field1.trim() || !isEmpathyValid(empathy)}
                onClick={() => void onStep1Continue()}>
                {submittingStep1 ? 'Saving…' : plan.status === 'returned' ? 'Resubmit to teacher' : plan.id ? 'Save answers' : 'Save and submit to teacher'}
              </button>
              {!plan.id ? (
                <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                  Saves your answers to your teacher. After they approve, you can start the checklist.
                </p>
              ) : null}
            </div>

            {planSubmitted ? (
              <p className="patent-phase-back" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => goPhase(2)}>
                  Continue to checklist →
                </button>
              </p>
            ) : null}
          </section>
        </div>
      ) : null}

      {/* ── Phase 2: Checklist ── */}
      {phase === 2 ? (
        <div className="card patent-phase-panel">
          <section aria-labelledby="generic-patent-phase-2">
            <h2 id="generic-patent-phase-2" className="patent-phase-title">Step 2 — Workshop checklist</h2>

            {checklistSubmitted && !checklistApproved ? (
              <p role="status" style={{ fontWeight: 600, margin: '0 0 0.75rem', padding: '0.55rem 0.85rem', background: 'rgba(234,179,8,0.12)', borderLeft: '4px solid #ca8a04', borderRadius: '6px' }}>
                ⏳ Submitted — waiting for teacher approval
              </p>
            ) : null}

            <p className="muted" style={{ marginTop: 0 }}>
              {doneCount} of {steps.length} steps complete. Checkboxes save as you go.
            </p>

            {checklistSaveError ? (
              <p className="error" role="alert" style={{ margin: '0 0 0.75rem' }}>
                {checklistSaveError}
              </p>
            ) : null}

            {!planSubmitted ? (
              <p className="muted">Submit step 1 to your teacher first.</p>
            ) : (
              <>
                <div className="design3d-checklist-col" style={{ maxWidth: '42rem' }}>
                  <ol className="checklist">
                    {steps.map((step, idx) => {
                      const isUploadStep = idx === steps.length - 1
                      const isApprovalGate = step.requiresApproval
                      return (
                        <li key={idx} className="checklist-item">
                          <label className="checklist-label">
                            <input type="checkbox"
                              checked={checks[idx] ?? false}
                              disabled={!canStartChecklist || (checklistSubmitted && !checklistApproved)}
                              onChange={(e) => {
                                const nextArr = [...checks]
                                nextArr[idx] = e.target.checked
                                setChecks(nextArr)
                                void saveChecklistToDb(nextArr, plan.id)
                              }}
                            />
                            <span className="checklist-text">{step.description}</span>
                          </label>
                          {step.resourceUrl ? (
                            <p style={{ margin: '0.3rem 0 0 1.75rem' }}>
                              <a href={step.resourceUrl} target="_blank" rel="noopener noreferrer"
                                className="btn-secondary" style={{ fontSize: '0.85rem', display: 'inline-block', padding: '0.25rem 0.7rem' }}>
                                {step.resourceLabel?.trim() ? `${step.resourceLabel.trim()} →` : 'Open resource →'}
                              </a>
                            </p>
                          ) : null}
                          {isApprovalGate ? (
                            <p className="muted" style={{ margin: '0.25rem 0 0 1.75rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              🔒 Approval checkpoint — your teacher reviews progress here.
                            </p>
                          ) : null}
                          {isUploadStep ? (
                            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {uploadUrl ? (
                                <div>
                                  {/\.(mp4|webm|mov|avi|m4v)$/i.test(uploadUrl) ? (
                                    <video src={uploadUrl} controls style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', display: 'block' }} />
                                  ) : (
                                    <img src={uploadUrl} alt="Uploaded work" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', objectFit: 'contain', display: 'block' }} />
                                  )}
                                  <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>File uploaded — choose a new file to replace it.</p>
                                </div>
                              ) : null}
                              <label style={{ display: 'inline-flex', cursor: !canStartChecklist || checklistSubmitted ? 'not-allowed' : 'pointer' }}>
                                <span className={`btn-secondary${!canStartChecklist || checklistSubmitted || uploading ? ' btn-disabled' : ''}`} style={{ pointerEvents: 'none' }}>
                                  {uploading ? 'Uploading…' : uploadUrl ? 'Replace file' : 'Choose photo or video'}
                                </span>
                                <input type="file" accept="image/*,video/*"
                                  disabled={!canStartChecklist || checklistSubmitted || uploading}
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) void handleFileUpload(file)
                                    e.target.value = ''
                                  }}
                                />
                              </label>
                              {uploadError ? <p className="error" role="alert" style={{ margin: 0, fontSize: '0.85rem' }}>{uploadError}</p> : null}
                              {uploadUrl && !/\.(mp4|webm|mov|avi|m4v)$/i.test(uploadUrl) ? (
                                <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border)' }}>
                                  <p className="muted" style={{ margin: '0 0 0.35rem', fontSize: '0.85rem' }}>
                                    Optional: add a <strong>process</strong> photo (work in progress). Shown under your
                                    finished shot with your patent answers.
                                  </p>
                                  {processUploadUrl ? (
                                    <img
                                      src={processUploadUrl}
                                      alt="Process work"
                                      style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '8px', objectFit: 'contain', display: 'block', marginBottom: '0.35rem' }}
                                    />
                                  ) : null}
                                  <label style={{ display: 'inline-flex', cursor: !canStartChecklist || checklistSubmitted ? 'not-allowed' : 'pointer' }}>
                                    <span className={`btn-secondary${!canStartChecklist || checklistSubmitted || processUploading ? ' btn-disabled' : ''}`} style={{ pointerEvents: 'none' }}>
                                      {processUploading ? 'Uploading…' : processUploadUrl ? 'Replace process photo' : 'Add process photo'}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      disabled={!canStartChecklist || checklistSubmitted || processUploading}
                                      style={{ display: 'none' }}
                                      onChange={(e) => {
                                        const f = e.target.files?.[0]
                                        if (f) void handleProcessFileUpload(f)
                                        e.target.value = ''
                                      }}
                                    />
                                  </label>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </li>
                      )
                    })}
                  </ol>

                  {checklistFooterNote ? (
                    <div
                      className="card"
                      role="note"
                      aria-label="Quest note"
                      style={{
                        marginTop: '1.1rem',
                        padding: '0.9rem 1rem',
                        border: '1px solid rgba(109, 40, 217, 0.35)',
                        background: 'rgba(109, 40, 217, 0.06)',
                        maxWidth: '42rem',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.5, color: 'var(--text)' }}>
                        {checklistFooterNote}
                      </p>
                    </div>
                  ) : null}

                  {!canStartChecklist ? (
                    <p className="muted" style={{ margin: '0.75rem 0 0' }}>Checklist unlocks after your teacher approves your plan.</p>
                  ) : null}
                </div>

                <div className="design3d-plan-actions">
                  <button type="button" className="btn-primary"
                    disabled={checklistSubmitted || !canStartChecklist || !allDone || submittingChecklist}
                    onClick={() => void onSubmitChecklist()}>
                    {submittingChecklist ? 'Submitting…' : 'Submit checklist for teacher review'}
                  </button>
                  <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                    After you submit, your teacher reviews your checklist. Step 3 unlocks when they approve.
                  </p>
                </div>
              </>
            )}

            <p className="patent-phase-back">
              <button type="button" className="btn-secondary" onClick={() => goPhase(1)}>← Back to step 1</button>
            </p>
          </section>
        </div>
      ) : null}

      {/* ── Phase 3: Closing questions ── */}
      {phase === 3 ? (
        <div className="card patent-phase-panel">
          <section aria-labelledby="generic-patent-phase-3">
            <h2 id="generic-patent-phase-3" className="patent-phase-title">Step 3 — Closing questions</h2>

            {isFinalPending ? (
              <p role="status" style={{ fontWeight: 600, margin: '0 0 0.75rem', padding: '0.55rem 0.85rem', background: 'rgba(234,179,8,0.12)', borderLeft: '4px solid #ca8a04', borderRadius: '6px' }}>
                ⏳ Final application submitted — waiting for teacher approval
              </p>
            ) : null}

            <p className="muted" style={{ marginTop: 0 }}>
              Your answers save as you type. Submit when both are complete.
            </p>

            {!checklistApproved ? (
              <p className="muted">Your teacher must approve the checklist in step 2 before this section unlocks.</p>
            ) : (
              <>
                <div className="design3d-patent-col" style={{ maxWidth: '40rem' }}>
                  <label className="patent-field">
                    <span className="patent-label">What makes this work yours — where did you go beyond the example? <span className="patent-required">*</span></span>
                    <textarea rows={5} value={patent.field3}
                      placeholder="Your answer here"
                      onChange={(e) => {
                        const val = e.target.value
                        setPatent((p) => ({ ...p, field3: val }))
                        void saveFieldToDb('field_3', val, plan.id)
                      }}
                    />
                  </label>

                  <label className="patent-field">
                    <span className="patent-label">What failed and what did you change? <span className="patent-required">*</span></span>
                    <textarea rows={5} value={patent.field4}
                      placeholder="Your answer here"
                      onChange={(e) => {
                        const val = e.target.value
                        setPatent((p) => ({ ...p, field4: val }))
                        void saveFieldToDb('field_4', val, plan.id)
                      }}
                    />
                  </label>
                </div>

                {submitApprovalError ? <p className="error" role="alert">{submitApprovalError}</p> : null}
                {submitSuccessMessage ? <p className="muted" role="status">{submitSuccessMessage}</p> : null}

                <div className="design3d-plan-actions">
                  <button type="button" className="btn-primary"
                    disabled={!canUseDb || !user?.id || submittingPatent || isFinalPending || !patent.field3.trim() || !patent.field4.trim()}
                    onClick={() => void onSubmitForApproval()}>
                    {submittingPatent ? 'Submitting…' : 'Submit for approval'}
                  </button>
                </div>
              </>
            )}

            <p className="patent-phase-back">
              <button type="button" className="btn-secondary" onClick={() => goPhase(2)}>← Back to checklist</button>
            </p>
          </section>
        </div>
      ) : null}

      {approvalNotice ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.65rem 1rem',
            marginTop: '1.25rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '1rem',
            background: approvalNotice.tone === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
            border: `2px solid ${approvalNotice.tone === 'success' ? '#16a34a' : '#ca8a04'}`,
            color: approvalNotice.tone === 'success' ? '#15803d' : '#92400e',
          }}
        >
          <span>{approvalNotice.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setApprovalNotice(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '0 0.25rem', color: 'inherit', opacity: 0.7 }}
          >
            ×
          </button>
        </div>
      ) : null}
    </form>
  )
}
