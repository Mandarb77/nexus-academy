import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PatentFlowBanner } from './PatentFlowBanner'
import { EmpathyForm } from './EmpathyForm'
import { FinalApprovalBanner } from './FinalApprovalBanner'
import { ApprovedQuestView } from './ApprovedQuestView'
import { queueApprovalCelebration } from '../lib/approvalCelebration'
import { skillTreeGuildModifier } from '../lib/guildTree'
import { PERSONAL_GAME_PIECE_STEPS } from '../lib/personalGamePieceSteps'
import {
  isPopUpCardTile,
  POP_UP_CARD_ORIGINAL_BONUS_NOTE,
  POP_UP_CARD_RECIPIENT_GUIDANCE,
  POP_UP_CARD_STEP2_RESOURCE_LINKS,
  POP_UP_CARD_STEPS,
  usesGamePieceStylePatentPage,
} from '../lib/popUpCardQuest'
import { supabase } from '../lib/supabase'
import { pickPrimaryPlanPatentRow } from '../lib/patentPlanRow'
import { fileForPatentStorage } from '../lib/patentFileUpload'
import { EMPTY_EMPATHY, parseEmpathy, serializeEmpathy, isEmpathyValid } from '../lib/empathy'
import type { EmpathyDraft } from '../lib/empathy'
import type { TileRow } from '../types/tile'
import type { SkillCompletionStatus } from '../types/skillCompletion'

type PatentDraft = {
  field1: string
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

const EMPTY_DRAFT: PatentDraft = { field1: '', field3: '', field4: '' }

function normalizePlanStatus(input: unknown): PlanStatus {
  const s = String(input ?? '').trim().toLowerCase()
  if (s === 'none' || s === 'pending' || s === 'approved' || s === 'returned') return s
  return 'pending'
}

function patentTreePathForGuild(guild: string): string {
  return skillTreeGuildModifier(guild) === 'prism' ? '/tree/prism' : '/tree/forge'
}

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
  const isPopUp = isPopUpCardTile(tile)
  const stepLabels = isPopUp ? POP_UP_CARD_STEPS : PERSONAL_GAME_PIECE_STEPS
  const checklistLen = stepLabels.length

  const field1DraftKey = `nexus:tile-patent-f1:${studentId}:${tile.id}`
  const empathyDraftKey = `nexus:tile-patent-empathy:${studentId}:${tile.id}`
  const phaseKey = `nexus:patent-phase:${studentId}:${tile.id}`

  const [initialised, setInitialised] = useState(false)
  const [plan, setPlan] = useState<PlanState>({ id: '', status: 'none' })
  const [checks, setChecks] = useState<boolean[]>(() =>
    Array(isPopUpCardTile(tile) ? POP_UP_CARD_STEPS.length : PERSONAL_GAME_PIECE_STEPS.length).fill(false),
  )
  const [patent, setPatent] = useState<PatentDraft>(EMPTY_DRAFT)
  const [empathy, setEmpathy] = useState<EmpathyDraft>(EMPTY_EMPATHY)
  const [finalApproval, setFinalApproval] = useState<{ wp: number; gold: number } | null>(null)
  const bannerFiredRef = useRef(false)
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
  const [approvalNotice, setApprovalNotice] = useState<{ message: string; tone: 'success' | 'returned' } | null>(null)
  const approvalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  const [showImportNote, setShowImportNote] = useState(false)
  const [checklistSubmitted, setChecklistSubmitted] = useState(false)
  const [checklistApproved, setChecklistApproved] = useState(false)
  const [submittingChecklist, setSubmittingChecklist] = useState(false)

  /** Pick initial phase once per tile+user after load; avoid resetting from sessionStorage every render. */
  const bootstrappedForTileRef = useRef<string | null>(null)

  const canUseDb = Boolean(user?.id)

  const loadFromDatabase = useCallback(async () => {
    if (!user?.id) return
    const clen = isPopUpCardTile(tile) ? POP_UP_CARD_STEPS.length : PERSONAL_GAME_PIECE_STEPS.length

    const { data, error } = await supabase
      .from('patents')
      .select(
        'id, status, stage, field_1, field_2, field_3, field_4, checklist_state, checklist_submitted, checklist_approved, upload_url, process_upload_url, created_at',
      )
      .eq('student_id', user.id)
      .eq('tile_id', tile.id)
      .eq('stage', 'plan')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[PatentContent] load from db:', error.message)
      setInitialised(true)
      return
    }

    const row = pickPrimaryPlanPatentRow(
      (data ?? []) as { id: string; status: string; created_at: string }[],
      (s) => normalizePlanStatus(s),
    ) as {
      id: string
      status: string
      field_1: string
      field_2: string | null
      field_3: string | null
      field_4: string | null
      checklist_state: unknown
      checklist_submitted?: boolean | null
      checklist_approved?: boolean | null
      upload_url?: string | null
      process_upload_url?: string | null
    } | undefined

    if (!row) {
      localStorage.removeItem(field1DraftKey)
      localStorage.removeItem(`nexus:tile-checklist:${studentId}:${tile.id}`)
      localStorage.removeItem(`nexus:tile-patent:${studentId}:${tile.id}`)
      setChecks(Array(clen).fill(false))
      setPatent(EMPTY_DRAFT)
      setPlan({ id: '', status: 'none' })
      setUploadUrl(null)
      setProcessUploadUrl(null)
      setChecklistSubmitted(false)
      setChecklistApproved(false)
      const draftF1 = localStorage.getItem(field1DraftKey) ?? ''
      const draftEmpathy = localStorage.getItem(empathyDraftKey) ?? null
      setPatent((p) => ({ ...p, field1: draftF1 }))
      setEmpathy(draftEmpathy ? parseEmpathy(draftEmpathy) : EMPTY_EMPATHY)
      setInitialised(true)
      return
    }

    const planStatus = normalizePlanStatus(row.status)
    setPlan({ id: row.id, status: planStatus })

    // Only reset checklist when the teacher explicitly returns the plan — not while it is pending.
    const rawSubmitted = Boolean(row.checklist_submitted)
    if (planStatus === 'returned') {
      setChecklistSubmitted(false)
      setChecklistApproved(false)
      if (rawSubmitted) {
        void supabase
          .from('patents')
          .update({ checklist_submitted: false, checklist_approved: false })
          .eq('id', row.id)
      }
    } else {
      setChecklistSubmitted(rawSubmitted)
      setChecklistApproved(row.checklist_approved ?? false)
    }

    // Migration-safe: extend shorter stored arrays with false for any newly added steps.
    const rawCs = row.checklist_state
    const rawCsArr = Array.isArray(rawCs) ? (rawCs as boolean[]) : []
    const cs: boolean[] = [
      ...rawCsArr.slice(0, clen),
      ...Array(Math.max(0, clen - rawCsArr.length)).fill(false),
    ]
    setChecks(cs)
    setUploadUrl(row.upload_url ?? null)
    setProcessUploadUrl(row.process_upload_url ?? null)

    const draftField1 = planStatus !== 'approved' ? (localStorage.getItem(field1DraftKey) ?? null) : null
    const draftEmpathy = planStatus !== 'approved' ? (localStorage.getItem(empathyDraftKey) ?? null) : null
    if (planStatus === 'approved') {
      localStorage.removeItem(field1DraftKey)
      localStorage.removeItem(empathyDraftKey)
    }
    setPatent({
      field1: draftField1 ?? row.field_1 ?? '',
      field3: row.field_3 ?? '',
      field4: row.field_4 ?? '',
    })
    setEmpathy(draftEmpathy ? parseEmpathy(draftEmpathy) : parseEmpathy(row.field_2 ?? null))

    setInitialised(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tile, studentId, field1DraftKey, empathyDraftKey])

  useEffect(() => {
    void loadFromDatabase()
  }, [loadFromDatabase])

  /** Realtime: auto-refresh when teacher approves/returns this student's patent or completion. */
  useEffect(() => {
    if (!user?.id) return
    const uid = user.id
    const tid = String(tile.id)

    const channel = supabase
      .channel(`patent-watch-gp-${tid}-${uid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'patents', filter: `student_id=eq.${uid}` },
        (payload) => {
          const prev = payload.old as Record<string, unknown>
          const next = payload.new as Record<string, unknown>
          if (String(next.tile_id) !== tid) return
          void loadFromDatabase()
          if (prev.status !== 'approved' && next.status === 'approved') {
            showApprovalNotice('✓ Plan approved — your checklist is now unlocked!', 'success')
          } else if (!prev.checklist_approved && next.checklist_approved) {
            showApprovalNotice('✓ Checklist approved — final questions are now unlocked!', 'success')
          } else if (next.status === 'returned') {
            showApprovalNotice('↩ Step returned — check with your teacher and try again.', 'returned')
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'skill_completions', filter: `student_id=eq.${uid}` },
        (payload) => {
          const prev = payload.old as Record<string, unknown>
          const next = payload.new as Record<string, unknown>
          if (String(next.tile_id) !== tid) return
          void loadFromDatabase()
          void refresh()
          if (prev.status !== 'approved' && next.status === 'approved') {
            const wp = typeof next.wp_awarded === 'number' ? next.wp_awarded : 0
            const gold = typeof next.gold_awarded === 'number' ? next.gold_awarded : 0
            localStorage.setItem(`nexus:approval-wp:${tid}`, String(wp))
            localStorage.setItem(`nexus:approval-gold:${tid}`, String(gold))
            const cid = next.id != null ? String(next.id) : ''
            if (cid) queueApprovalCelebration({ wp, gold, completionId: cid })
            bannerFiredRef.current = true
            setFinalApproval({ wp, gold })
          } else if (next.status === 'returned') {
            showApprovalNotice('↩ Final application returned — check with your teacher and resubmit.', 'returned')
          }
        },
      )
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

  const canStartChecklist = plan.status === 'approved'
  const doneCount = checks.filter(Boolean).length
  const allDone = doneCount === checklistLen

  const planSubmitted = Boolean(plan.id)

  /** Phase 2 unlocks when plan exists; phase 3 only when teacher approves the checklist. */
  const maxPhase = useMemo((): 1 | 2 | 3 => {
    if (!planSubmitted) return 1
    if (!checklistApproved) return 2
    return 3
  }, [planSubmitted, checklistApproved])

  useEffect(() => {
    if (!initialised) return
    const marker = `${tile.id}:${user?.id ?? ''}`
    if (bootstrappedForTileRef.current !== marker) {
      bootstrappedForTileRef.current = marker
      const suggested: 1 | 2 | 3 = !planSubmitted ? 1 : !checklistApproved ? 2 : 3
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
    checklistApproved,
    phaseKey,
  ])

  const goPhase = (p: 1 | 2 | 3) => {
    const next = Math.min(Math.max(p, 1), maxPhase) as 1 | 2 | 3
    setPhase(next)
    sessionStorage.setItem(phaseKey, String(next))
  }

  // Auto-advance the student UI when teacher approvals arrive via realtime.
  useEffect(() => {
    if (!initialised) return
    if (plan.status === 'approved' && phase === 1 && maxPhase >= 2) {
      goPhase(2)
    }
    if (checklistApproved && phase === 2 && maxPhase >= 3) {
      goPhase(3)
    }
  }, [initialised, plan.status, checklistApproved, phase, maxPhase]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveChecklistToDb = async (nextArr: boolean[], pid: string) => {
    if (!pid || (checklistSubmitted && !checklistApproved)) return
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
    if (isPopUp && !file.type.startsWith('image/')) {
      setUploadError('This quest requires a photo (image file) for the delivery step.')
      return
    }
    setUploading(true)
    setUploadError(null)
    try {
      const uploadFile = await fileForPatentStorage(file)
      const ext = uploadFile.type.startsWith('image/') ? 'jpg' : (file.name.split('.').pop()?.toLowerCase() ?? 'bin')
      const path = `${user.id}/${plan.id}/submission.${ext}`
      const { error: upErr } = await supabase.storage
        .from('patent-uploads')
        .upload(path, uploadFile, { upsert: true })
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage.from('patent-uploads').getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      const { error: dbErr } = await supabase.from('patents').update({ upload_url: publicUrl }).eq('id', plan.id)
      if (dbErr) throw dbErr

      setUploadUrl(publicUrl)
      // Auto-check the upload step checkbox
      const nextArr = [...checks]
      nextArr[checklistLen - 1] = true
      setChecks(nextArr)
      void saveChecklistToDb(nextArr, plan.id)
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed.')
      console.error('[PatentContent] upload:', e)
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
      console.error('[PatentContent] process upload:', e)
    } finally {
      setProcessUploading(false)
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
    if (!patent.field1.trim()) {
      setPlanSubmitError('Answer both questions before continuing.')
      return
    }
    if (!isEmpathyValid(empathy)) {
      setPlanSubmitError('Fill in "What is one thing you know about this person…" before continuing.')
      return
    }

    setSubmittingStep1(true)
    const empathyJson = serializeEmpathy(empathy)
    try {
      if (!plan.id) {
        const { data, error } = await supabase
          .from('patents')
          .insert({
            student_id: user.id,
            tile_id: tile.id,
            field_1: patent.field1,
            field_2: empathyJson,
            stage: 'plan',
            status: 'pending',
          })
          .select('id')
          .single()
        if (error) {
          if (error.code === '23505') {
            setPlanSubmitError('A plan is already on file. Refresh the page.')
          } else {
            throw error
          }
          return
        }
        const newId = (data as { id: string } | null)?.id ?? ''
        if (newId) setPlan({ id: newId, status: 'pending' })
        localStorage.removeItem(field1DraftKey)
        setFlowBanner(
          'Plan sent for teacher approval. Step 2 (checklist) is unlocked — checkboxes turn on after your teacher approves.',
        )
      } else if (plan.status === 'returned') {
        const { error } = await supabase
          .from('patents')
          .update({
            field_1: patent.field1,
            field_2: empathyJson,
            status: 'pending',
            checklist_submitted: false,
          })
          .eq('id', plan.id)
        if (error) throw error
        setFlowBanner('Updated plan resubmitted to your teacher.')
      } else {
        const { error } = await supabase
          .from('patents')
          .update({ field_2: empathyJson })
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
    if (isPopUp && !uploadUrl) return
    setSubmittingChecklist(true)
    setFlowBanner(null)
    try {
      const { error } = await supabase
        .from('patents')
        .update({ checklist_submitted: true })
        .eq('id', plan.id)
      if (error) throw error
      setChecklistSubmitted(true)
      setFlowBanner('Checklist submitted for teacher review. Step 3 unlocks once your teacher approves.')
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
    if (!patent.field1.trim() || !patent.field3.trim() || !patent.field4.trim()) {
      setSubmitApprovalError('Fill in all patent fields before submitting.')
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
    if (isPopUp && !uploadUrl) {
      setSubmitApprovalError('Upload your delivery photo in the checklist before submitting.')
      return
    }

    setSubmittingPatent(true)
    try {
      const { error: updErr } = await supabase
        .from('patents')
        .update({
          stage: 'packet',
          field_2: serializeEmpathy(empathy),
          field_3: patent.field3,
          field_4: patent.field4,
        })
        .eq('id', pid)
      if (updErr) throw updErr

      // Handle resubmission: update existing returned row rather than inserting a duplicate.
      const { data: existing } = await supabase
        .from('skill_completions')
        .select('id, status')
        .eq('student_id', user.id)
        .eq('tile_id', tile.id)
        .maybeSingle()

      if (existing) {
        const { error: scErr } = await supabase
          .from('skill_completions')
          .update({ status: 'pending', patent_id: pid, wp_awarded: null, gold_awarded: null })
          .eq('id', existing.id)
        if (scErr) throw scErr
      } else {
        const { error: scErr } = await supabase.from('skill_completions').insert({
          student_id: user.id,
          tile_id: tile.id,
          skill_key: tile.id,
          status: 'pending',
          patent_id: pid,
        })
        if (scErr) throw scErr
      }

      await refresh()
      setSubmitSuccessMessage(
        `Final application submitted! Returning to ${skillTreeGuildModifier(tile.guild) === 'prism' ? 'Prism' : 'Forge'}…`,
      )
      setFlowBanner('Final application submitted — awaiting teacher approval.')
      window.setTimeout(() => navigate(patentTreePathForGuild(tile.guild)), 1400)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Submit failed.'
      console.error('[PatentContent] submit for approval:', e)
      setSubmitApprovalError(msg)
    } finally {
      setSubmittingPatent(false)
    }
  }

  if (!usesGamePieceStylePatentPage(tile)) {
    return <p className="error">This page is only for stepped patent quests (game piece or pop-up card).</p>
  }

  if (!initialised) {
    return <p className="muted">Loading…</p>
  }

  if (completionStatus === 'approved') {
    return (
      <>
        {finalApproval ? (
          <FinalApprovalBanner wp={finalApproval.wp} gold={finalApproval.gold} onDismiss={dismissApprovalBanner} />
        ) : null}
        <ApprovedQuestView
          steps={stepLabels as unknown as string[]}
          checks={checks}
          empathy={empathy}
          answers={[
            { label: 'What are you making?', value: patent.field1 },
            { label: '__empathy__', value: '' },
            { label: 'How did you make it an original work?', value: patent.field3 },
            { label: 'What do you have to iterate?', value: patent.field4 },
          ]}
          uploadUrl={uploadUrl}
          repeatNote="This quest can be completed again for bonus WP — talk to your teacher to reset the checklist."
        />
      </>
    )
  }

  // 'pending' no longer causes an early return — the form stays visible with a waiting notice
  // so realtime updates push through and the approval banner fires in-place.
  const isFinalPending = completionStatus === 'pending'

  return (
    <form
      className="patent-game-piece-form"
      data-patent-flow="stepped-checklist-gate"
      onSubmit={(e) => e.preventDefault()}
    >
      {finalApproval ? (
        <FinalApprovalBanner
          wp={finalApproval.wp}
          gold={finalApproval.gold}
          onDismiss={dismissApprovalBanner}
        />
      ) : null}

      <PatentFlowBanner
        message={flowBanner}
        tone="success"
        onClear={() => setFlowBanner(null)}
      />

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
            marginBottom: '1rem',
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

      <div className="patent-step-tabs" role="tablist" aria-label="Patent steps">
        {(
          [
            { n: 1 as const, label: 'Plan questions' },
            ...(planSubmitted ? [{ n: 2 as const, label: 'Checklist' }] : []),
            ...(checklistApproved ? [{ n: 3 as const, label: 'Final questions' }] : []),
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
          {!isPopUp ? (
            <p className="muted" style={{ marginTop: 0, marginBottom: '0.85rem' }}>
              Use <strong>inches</strong> only for sizes. Maximum footprint:{' '}
              <strong>1 inch wide, 1 inch deep, 2 inches tall</strong>.
            </p>
          ) : null}

          <label className="patent-field">
            <span className="patent-label">
              What are you going to make <span className="patent-required">*</span>
            </span>
            <input
              type="text"
              value={patent.field1}
              placeholder={
                isPopUp
                  ? 'Describe the pop-up card you will design — who it is for and the idea in one or two sentences.'
                  : 'One or two sentences — if you give size, use inches (max 1×1×2 inches).'
              }
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

          <EmpathyForm
            value={empathy}
            disabled={!user?.id}
            onChange={(next) => {
              setEmpathy(next)
              localStorage.setItem(empathyDraftKey, serializeEmpathy(next))
              if (plan.id && plan.status === 'pending') {
                void saveFieldToDb('field_2', serializeEmpathy(next), plan.id)
              }
            }}
          />

          {isPopUp ? (
            <div
              className="card"
              role="note"
              aria-label="Recipient guidance"
              style={{
                marginTop: '1rem',
                padding: '0.9rem 1rem',
                border: '1px solid rgba(109, 40, 217, 0.35)',
                background: 'rgba(109, 40, 217, 0.06)',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.55, color: 'var(--text)' }}>
                {POP_UP_CARD_RECIPIENT_GUIDANCE}
              </p>
            </div>
          ) : null}

          <div className="design3d-plan-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={
                !canUseDb ||
                !user?.id ||
                submittingStep1 ||
                !patent.field1.trim() ||
                !isEmpathyValid(empathy)
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
                Plan submitted — waiting for teacher approval. The checklist unlocks after your teacher approves.
              </p>
            ) : !plan.id ? (
              <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                Saves your plan to your teacher. After they approve, you can start the checklist.
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

        {checklistSubmitted && !checklistApproved ? (
          <p
            className="patent-waiting-note"
            role="status"
            style={{ fontWeight: 600, margin: '0 0 0.75rem', padding: '0.55rem 0.85rem', background: 'rgba(234,179,8,0.12)', borderLeft: '4px solid #ca8a04', borderRadius: '6px' }}
          >
            ⏳ Submitted — waiting for teacher approval
          </p>
        ) : null}

        <p className="muted" style={{ marginTop: 0 }}>
          {doneCount} of {checklistLen} steps complete. Checkboxes save as you go.
        </p>

        {!planSubmitted ? (
          <p className="muted">Submit step 1 to your teacher first.</p>
        ) : (
          <>
            <div className="design3d-two-col">
              <div className="design3d-checklist-col" style={{ maxWidth: 'none' }}>
                {isPopUp && !canStartChecklist ? (
                  <div
                    className="card"
                    role="note"
                    style={{
                      marginBottom: '1rem',
                      padding: '0.9rem 1rem',
                      border: '1px solid rgba(109, 40, 217, 0.35)',
                      background: 'rgba(109, 40, 217, 0.06)',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.55 }}>{POP_UP_CARD_RECIPIENT_GUIDANCE}</p>
                  </div>
                ) : null}
              <ol className="checklist">
                {stepLabels.map((label, idx) => (
                  <li key={`${label}-${idx}`} className="checklist-item">
                    <label className="checklist-label">
                      <input
                        type="checkbox"
                        checked={checks[idx] ?? false}
                        disabled={!canStartChecklist || (checklistSubmitted && !checklistApproved)}
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

                    {!isPopUp && idx === 1 ? (
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

                    {isPopUp && idx === 1 ? (
                      <div
                        style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}
                      >
                        {POP_UP_CARD_STEP2_RESOURCE_LINKS.map((link) => (
                          <a
                            key={link.url}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`btn-secondary${!canStartChecklist || checklistSubmitted ? ' btn-disabled' : ''}`}
                            aria-disabled={!canStartChecklist || checklistSubmitted}
                            onClick={
                              !canStartChecklist || checklistSubmitted ? (e) => e.preventDefault() : undefined
                            }
                            style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}
                          >
                            {link.label} →
                          </a>
                        ))}
                        <div
                          className="card"
                          role="note"
                          style={{
                            marginTop: '0.35rem',
                            padding: '0.75rem 0.85rem',
                            border: '2px solid rgba(34, 197, 94, 0.45)',
                            background: 'rgba(34, 197, 94, 0.08)',
                          }}
                        >
                          <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5, fontWeight: 600 }}>
                            {POP_UP_CARD_ORIGINAL_BONUS_NOTE}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {!isPopUp && idx === 2 ? (
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

                    {!isPopUp && idx === 3 ? (
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

                    {/* Last step — upload photo (or photo/video for game piece) */}
                    {idx === checklistLen - 1 ? (
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
                            {uploading
                              ? 'Uploading…'
                              : uploadUrl
                                ? 'Replace file'
                                : isPopUp
                                  ? 'Choose delivery photo'
                                  : 'Choose photo or video'}
                          </span>
                          <input
                            type="file"
                            accept={isPopUp ? 'image/*' : 'image/*,video/*'}
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
                        {!isPopUp &&
                        uploadUrl &&
                        !/\.(mp4|webm|mov|avi|m4v)$/i.test(uploadUrl) ? (
                          <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border)' }}>
                            <p className="muted" style={{ margin: '0 0 0.35rem', fontSize: '0.85rem' }}>
                              Optional process photo (4:3) documenting your work in progress.
                            </p>
                            {processUploadUrl ? (
                              <img
                                src={processUploadUrl}
                                alt="Process work"
                                style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '8px', objectFit: 'contain', display: 'block', marginBottom: '0.35rem' }}
                              />
                            ) : null}
                            <label style={{ display: 'inline-flex', cursor: !canStartChecklist || checklistSubmitted ? 'not-allowed' : 'pointer' }}>
                              <span
                                className={`btn-secondary${!canStartChecklist || checklistSubmitted || processUploading ? ' btn-disabled' : ''}`}
                                style={{ pointerEvents: 'none' }}
                              >
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
                ))}
              </ol>

              {!isPopUp ? (
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
              ) : null}

              {!canStartChecklist ? (
                <p className="muted" style={{ margin: '0.75rem 0 0' }}>
                  Checklist unlocks after your teacher approves your plan.
                </p>
              ) : null}
              </div>

              <div className="design3d-patent-col" style={{ maxWidth: 'none' }}>
                <h3 className="design3d-col-title">Your plan</h3>
                <p className="muted" style={{ marginTop: 0, fontSize: '0.88rem' }}>
                  Opening answers from step 1. Your teacher reviews them before the checklist unlocks.
                </p>
                <label className="patent-field">
                  <span className="patent-label">What are you going to make</span>
                  <textarea
                    readOnly
                    rows={3}
                    value={patent.field1}
                    style={{ resize: 'vertical' as const, opacity: 0.95 }}
                  />
                </label>
                <EmpathyForm value={empathy} disabled onChange={() => {}} />
              </div>
            </div>

            <div className="design3d-plan-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={
                  checklistSubmitted ||
                  !canStartChecklist ||
                  !allDone ||
                  submittingChecklist ||
                  (isPopUp && !uploadUrl)
                }
                onClick={() => void onSubmitChecklist()}
              >
                {submittingChecklist
                  ? 'Submitting…'
                  : isPopUp
                    ? 'Submit for approval'
                    : 'Submit checklist for teacher review'}
              </button>
              <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                After you submit, your teacher reviews your checklist and uploaded photo/video. Step 3 unlocks when they approve.
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

        {isFinalPending ? (
          <p
            className="patent-waiting-note"
            role="status"
            style={{ fontWeight: 600, margin: '0 0 0.75rem', padding: '0.55rem 0.85rem', background: 'rgba(234,179,8,0.12)', borderLeft: '4px solid #ca8a04', borderRadius: '6px' }}
          >
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
                <span className="patent-label">How did you make it an original work? <span className="patent-required">*</span></span>
                <textarea
                  value={patent.field3}
                  rows={5}
                  placeholder="Your answer here"
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
                  placeholder="Your answer here"
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
                    isFinalPending ||
                    !patent.field3.trim() ||
                    !patent.field4.trim() ||
                    (isPopUp && !uploadUrl)
                  }
                  onClick={() => void onSubmitForApproval()}
                >
                  {submittingPatent
                    ? 'Submitting…'
                    : isPopUp
                      ? 'Submit for approval'
                      : 'Submit final application'}
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
