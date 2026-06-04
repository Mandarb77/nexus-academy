/*
 * PatentLedger — unified "maker's patent" ledger form (replaces Generic/GamePiece/Sticker UI)
 *
 * One component, tile-specific content from the DB. Three tab-switched panels:
 *   i  — The Plan    (field_1 + empathy field_2: who / why / what_changed)
 *   ii — The Work    (checklist from tile.steps[].description + artifact upload)
 *   iii— The Record  (field_3, field_4, field_5 "Maine connection" + signature + teacher signoff)
 *
 * Wires the three priorities from the design spec:
 *   1. Autopopulate maker name (session/profile) + date (first plan submit) + entry number.
 *   2. Checklist steps pulled from `resolvedTileSteps(tile)` (DB `steps[].description`).
 *   3. Tab gating from plan status + checklist status (Void proto bypass preserved).
 *
 * Data layer (plan/checklist/final gates, uploads, Realtime, award banner) is ported from the
 * previous `GenericPatentContent` so backend behavior and the `patents` schema are unchanged.
 * `field_5` and `maker_signature_url` (migration 043) are best-effort: the form tolerates their
 * absence so it keeps working before that migration is applied.
 *
 * Visual system: patentLedger.css only — not bench-chrome. Recent work map:
 * docs/developer-handoff-recent-work.md
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { EMPTY_EMPATHY, parseEmpathy, serializeEmpathy, isEmpathyValid } from '../lib/empathy'
import type { EmpathyDraft } from '../lib/empathy'
import type { TileRow } from '../types/tile'
import type { SkillCompletionStatus } from '../types/skillCompletion'
import { ledgerContentForTile } from '../lib/patentLedgerContent'
import { canAccessVoidTile1Proto } from '../lib/voidProtoAccess'
import { fillPatentPlanFieldsFromRows, type LoadedPlanPatentRow } from '../lib/patentFormMerge'
import { serverSuggestedPatentPhase } from '../lib/patentPhaseBootstrap'
import { selectStudentPatentPrimary } from '../lib/patentPlanRow'
import { normalizePatentPlanStatus, type UiPatentPlanStatus } from '../lib/patentPlanStatus'
import { patentRowMatchesTile, patentTileIdCandidates } from '../lib/patentTileQuery'
import { skillTreeGuildModifier, guildHeading } from '../lib/guildTree'
import { fileForPatentStorage } from '../lib/patentFileUpload'
import '../patentLedger.css'

type Props = {
  tile: TileRow
  refresh: () => Promise<void>
  completionStatus: SkillCompletionStatus | undefined
}

type PatentDraft = { field1: string; field3: string; field4: string; field5: string; field6: string }
type PlanStatus = UiPatentPlanStatus
type PlanState = { id: string; status: PlanStatus }

const EMPTY_DRAFT: PatentDraft = { field1: '', field3: '', field4: '', field5: '', field6: '' }
const VIDEO_RE = /\.(mp4|webm|mov|avi|m4v)$/i

function guildBackRoute(guild: string): string {
  const mod = skillTreeGuildModifier(guild)
  if (mod === 'forge') return '/tree/forge'
  if (mod === 'prism') return '/tree/prism'
  if (mod === 'folded') return '/tree/folded'
  if (mod === 'void') return '/tree/void'
  return '/tree'
}

function formatLedgerDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

// -----------------------------------------------------------------------------
// SignaturePad — transparent canvas, draw with pointer/touch, or upload an image
// -----------------------------------------------------------------------------

function SignaturePad({
  value,
  disabled,
  onChange,
}: {
  value: string | null
  disabled: boolean
  onChange: (dataUrl: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const hasInkRef = useRef(false)
  const [showPrompt, setShowPrompt] = useState(!value)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.parentElement?.offsetWidth || 220
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#1E1A12'
    ctx.lineWidth = 1.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const down = (e: PointerEvent) => {
      if (disabled) return
      drawingRef.current = true
      const p = pos(e)
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      setShowPrompt(false)
    }
    const move = (e: PointerEvent) => {
      if (!drawingRef.current) return
      const p = pos(e)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      hasInkRef.current = true
    }
    const up = () => {
      if (!drawingRef.current) return
      drawingRef.current = false
      if (hasInkRef.current) onChange(canvas.toDataURL('image/png'))
    }

    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [disabled, onChange])

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasInkRef.current = false
    setShowPrompt(true)
    onChange(null)
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result
      if (typeof result === 'string') {
        setShowPrompt(false)
        onChange(result)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  /* Uploaded image (data URL or stored URL) preview replaces the live canvas. */
  const isImagePreview = Boolean(value && !value.startsWith('data:image/png'))

  return (
    <>
      {isImagePreview ? (
        <img className="sig-preview" src={value ?? ''} alt="Maker signature" />
      ) : (
        <div className="sig-wrap">
          <canvas ref={canvasRef} className="sig-canvas" height={64} />
          {showPrompt ? <div className="sig-prompt">Sign here</div> : null}
        </div>
      )}
      {!disabled ? (
        <div className="sig-actions">
          <button className="sig-act-btn" type="button" onClick={clear}>
            Clear
          </button>
          <span style={{ color: 'var(--pl-border)', fontSize: '10px' }}>·</span>
          <label className="sig-act-btn" style={{ cursor: 'pointer' }}>
            Upload image
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
          </label>
        </div>
      ) : null}
    </>
  )
}

// -----------------------------------------------------------------------------
// PatentLedger
// -----------------------------------------------------------------------------

export function PatentLedger({ tile, refresh, completionStatus }: Props) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const studentId = user?.id ?? 'anonymous'

  const content = useMemo(() => ledgerContentForTile(tile), [tile])
  const steps = content.steps
  const checklistFooterNote = content.footerNote
  const backRoute = guildBackRoute(tile.guild)
  const guildLabel = guildHeading(tile.guild).toUpperCase()
  const guildMod = skillTreeGuildModifier(tile.guild)

  const field1DraftKey = `nexus:tile-patent-f1:${studentId}:${tile.id}`
  const empathyDraftKey = `nexus:tile-patent-empathy:${studentId}:${tile.id}`
  const phaseKey = `nexus:patent-phase:${studentId}:${tile.id}`

  const [initialised, setInitialised] = useState(false)
  const [plan, setPlan] = useState<PlanState>({ id: '', status: 'none' })
  const [checks, setChecks] = useState<boolean[]>(() => Array(steps.length).fill(false))
  const [patent, setPatent] = useState<PatentDraft>(EMPTY_DRAFT)
  const [empathy, setEmpathy] = useState<EmpathyDraft>(EMPTY_EMPATHY)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deliveryUrl, setDeliveryUrl] = useState<string | null>(null)
  const [deliveryUploading, setDeliveryUploading] = useState(false)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const [signatureDraft, setSignatureDraft] = useState<string | null>(null)
  const [phase, setPhase] = useState<1 | 2 | 3>(1)
  const [planCreatedAt, setPlanCreatedAt] = useState<string | null>(null)
  const [entryNumber, setEntryNumber] = useState<number | null>(null)
  const [submittingStep1, setSubmittingStep1] = useState(false)
  const [submittingChecklist, setSubmittingChecklist] = useState(false)
  const [submittingPatent, setSubmittingPatent] = useState(false)
  const [planSubmitError, setPlanSubmitError] = useState<string | null>(null)
  const [submitApprovalError, setSubmitApprovalError] = useState<string | null>(null)
  const [checklistSubmitted, setChecklistSubmitted] = useState(false)
  const [checklistApproved, setChecklistApproved] = useState(false)
  const [banner, setBanner] = useState<{ text: string; tone: 'success' | 'returned' } | null>(null)
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phaseHydrateSigRef = useRef<string>('')

  const makerName = useMemo(() => {
    const fromProfile = profile?.display_name?.trim()
    if (fromProfile) return fromProfile
    const meta = user?.user_metadata
    const fromMeta =
      (typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
      (typeof meta?.name === 'string' && meta.name.trim())
    if (fromMeta) return fromMeta
    const local = user?.email?.split('@')[0]
    return local && local.length > 0 ? local : 'Unnamed maker'
  }, [profile?.display_name, user?.email, user?.user_metadata])

  const showBanner = (text: string, tone: 'success' | 'returned') => {
    setBanner({ text, tone })
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
    bannerTimerRef.current = setTimeout(() => setBanner(null), 9000)
  }

  // --- Gates ---
  const canUseDb = Boolean(user?.id)
  const bypassApprovals =
    canAccessVoidTile1Proto(user) && (tile.guild ?? '').trim().toLowerCase() === 'void navigators'
  const planApprovedForChecklist = bypassApprovals
    ? plan.status === 'pending' || plan.status === 'approved'
    : plan.status === 'approved'
  const canStartChecklist =
    planApprovedForChecklist && !(checklistSubmitted && !(checklistApproved || bypassApprovals))
  const planStep1FieldsLocked = plan.status === 'pending' || plan.status === 'approved'

  // --- Entry number: sequential position of this quest among the student's plans ---
  const loadEntryNumber = useCallback(async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('patents')
      .select('tile_id, created_at')
      .eq('student_id', user.id)
      .eq('stage', 'plan')
      .order('created_at', { ascending: true })
    const rows = (data ?? []) as { tile_id: unknown; created_at: string }[]
    const idx = rows.findIndex((r) => patentRowMatchesTile(tile.id, r.tile_id))
    setEntryNumber(idx >= 0 ? idx + 1 : rows.length + 1)
  }, [user?.id, tile.id])

  // --- Load patent row + hydrate form/phase (ported from GenericPatentContent) ---
  const loadFromDatabase = useCallback(async () => {
    if (!user?.id) {
      setInitialised(true)
      return
    }
    const tileCandidates = patentTileIdCandidates(tile.id)
    const { data, error } = await supabase
      .from('patents')
      .select(
        'id, status, stage, field_1, field_2, field_3, field_4, checklist_state, checklist_submitted, checklist_approved, upload_url, created_at',
      )
      .eq('student_id', user.id)
      .in('tile_id', tileCandidates)
      .in('stage', ['plan', 'packet'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[PatentLedger] load:', error.message)
      setInitialised(true)
      return
    }

    const allRows = (data ?? []) as LoadedPlanPatentRow[]
    const { primary: row } = selectStudentPatentPrimary(allRows, normalizePatentPlanStatus)

    if (!row) {
      phaseHydrateSigRef.current = ''
      setPhase(1)
      try {
        sessionStorage.setItem(phaseKey, '1')
      } catch {
        /* ignore */
      }
      setPlan({ id: '', status: 'none' })
      setChecks(Array(steps.length).fill(false))
      setUploadUrl(null)
      setDeliveryUrl(null)
      setChecklistSubmitted(false)
      setChecklistApproved(false)
      setPlanCreatedAt(null)
      const draftF1 = localStorage.getItem(field1DraftKey) ?? ''
      const draftEmpathy = localStorage.getItem(empathyDraftKey) ?? null
      setPatent({ ...EMPTY_DRAFT, field1: draftF1 })
      setEmpathy(draftEmpathy ? parseEmpathy(draftEmpathy) : EMPTY_EMPATHY)
      setInitialised(true)
      return
    }

    const primaryStage = String(row.stage ?? '').trim().toLowerCase() === 'packet' ? 'packet' : 'plan'
    const planStatus = normalizePatentPlanStatus(row.status ?? 'none')
    setPlan({ id: row.id, status: planStatus })
    setPlanCreatedAt(row.created_at ?? null)

    const rawSubmitted = Boolean(row.checklist_submitted)
    let checklistAppr = false
    let checklistSub = false
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
    setChecks(primaryStage === 'packet' ? Array(steps.length).fill(true) : csFromDb)
    setUploadUrl(row.upload_url ?? null)

    const draftField1 = planStatus !== 'approved' ? localStorage.getItem(field1DraftKey) : null
    const draftEmpathy = planStatus !== 'approved' ? localStorage.getItem(empathyDraftKey) : null
    if (planStatus === 'approved') {
      localStorage.removeItem(field1DraftKey)
      localStorage.removeItem(empathyDraftKey)
    }
    const merged = fillPatentPlanFieldsFromRows(row, allRows)
    setPatent((p) => ({
      ...p,
      field1: draftField1 ?? merged.field_1,
      field3: merged.field_3,
      field4: merged.field_4,
    }))
    setEmpathy(draftEmpathy ? parseEmpathy(draftEmpathy) : parseEmpathy(merged.field_2 || null))

    /* Best-effort: field_5 + signature (043) + delivery_url (044). Ignore errors if columns absent. */
    const { data: extra, error: extraErr } = await supabase
      .from('patents')
      .select('field_5, field_6, maker_signature_url, delivery_url')
      .eq('id', row.id)
      .maybeSingle()
    if (!extraErr && extra) {
      const ex = extra as {
        field_5: string | null
        field_6: string | null
        maker_signature_url: string | null
        delivery_url: string | null
      }
      setPatent((p) => ({ ...p, field5: ex.field_5 ?? '', field6: ex.field_6 ?? '' }))
      setSignatureUrl(ex.maker_signature_url ?? null)
      setDeliveryUrl(ex.delivery_url ?? null)
    }

    const maxPh: 1 | 2 | 3 = !row.id ? 1 : !checklistAppr ? 2 : 3
    const serverPh = serverSuggestedPatentPhase({ primaryStage, planStatus, checklistApproved: checklistAppr })
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
    setInitialised(true)
  }, [user?.id, tile.id, steps.length, field1DraftKey, empathyDraftKey, phaseKey])

  useEffect(() => {
    void loadFromDatabase()
    void loadEntryNumber()
  }, [loadFromDatabase, loadEntryNumber])

  // --- Realtime: plan/checklist gates + final approval ---
  useEffect(() => {
    if (!user?.id) return
    const uid = user.id
    const channel = supabase
      .channel(`patent-ledger-${tile.id}-${uid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'patents', filter: `student_id=eq.${uid}` },
        (payload) => {
          const prev = payload.old as Record<string, unknown>
          const next = payload.new as Record<string, unknown>
          if (!patentRowMatchesTile(tile.id, next.tile_id)) return
          void loadFromDatabase()
          if (prev.status !== 'approved' && next.status === 'approved')
            showBanner('Plan approved — the Work tab is now open.', 'success')
          else if (!prev.checklist_approved && next.checklist_approved)
            showBanner('Checklist approved — the Record tab is now open.', 'success')
          else if (next.status === 'returned')
            showBanner('Returned by your teacher — review the note and try again.', 'returned')
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'skill_completions', filter: `student_id=eq.${uid}` },
        (payload) => {
          const next = payload.new as Record<string, unknown>
          if (!patentRowMatchesTile(tile.id, next.tile_id)) return
          void loadFromDatabase()
          void refresh()
          if (next.status === 'returned')
            showBanner('Final entry returned — review the note and resubmit.', 'returned')
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
    }
  }, [user?.id, tile.id, loadFromDatabase, refresh])

  // --- Derived progression ---
  const doneCount = checks.filter(Boolean).length
  const allDone = doneCount === steps.length && steps.length > 0
  const planSubmitted = Boolean(plan.id)

  /* Resources render in one `.res-row` below the steps (matches the design markup). */
  const resources = content.resources
  const uploadRequired = !bypassApprovals

  const maxPhase = useMemo((): 1 | 2 | 3 => {
    if (!planSubmitted) return 1
    if (!checklistApproved && !(bypassApprovals && checklistSubmitted)) return 2
    return 3
  }, [planSubmitted, checklistApproved, bypassApprovals, checklistSubmitted])

  useEffect(() => {
    if (!initialised) return
    setPhase((p) => (p > maxPhase ? maxPhase : p))
  }, [initialised, maxPhase])

  const goPhase = (p: 1 | 2 | 3) => {
    const next = Math.min(Math.max(p, 1), maxPhase) as 1 | 2 | 3
    setPhase(next)
    try {
      sessionStorage.setItem(phaseKey, String(next))
    } catch {
      /* ignore */
    }
  }

  // --- Persistence helpers ---
  const saveChecklistToDb = async (nextArr: boolean[], pid: string) => {
    if (!pid || (checklistSubmitted && !checklistApproved)) return
    const { error } = await supabase.from('patents').update({ checklist_state: nextArr }).eq('id', pid)
    if (error) console.error('[PatentLedger] checklist save:', error.message)
  }

  const saveFieldToDb = async (
    fieldName: 'field_2' | 'field_3' | 'field_4' | 'field_6',
    value: string,
    pid: string,
  ) => {
    if (!pid) return
    const { error } = await supabase.from('patents').update({ [fieldName]: value }).eq('id', pid)
    if (error) console.error(`[PatentLedger] ${fieldName} save:`, error.message)
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
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  /* Record-panel delivery artifact: photo/video of the finished piece (ideally with the
     recipient). Writes `delivery_url` best-effort — needs migration 044, but the storage
     upload + preview still work if the column is missing. */
  const handleDeliveryUpload = async (file: File) => {
    if (!user?.id || !plan.id) return
    setDeliveryUploading(true)
    setDeliveryError(null)
    try {
      const uploadFile = await fileForPatentStorage(file)
      const ext = uploadFile.type.startsWith('image/') ? 'jpg' : (file.name.split('.').pop()?.toLowerCase() ?? 'bin')
      const path = `${user.id}/${plan.id}/delivery.${ext}`
      const { error: upErr } = await supabase.storage.from('patent-uploads').upload(path, uploadFile, { upsert: true })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('patent-uploads').getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      const { error: dbErr } = await supabase.from('patents').update({ delivery_url: publicUrl }).eq('id', plan.id)
      if (dbErr) console.warn('[PatentLedger] delivery_url save skipped (apply migration 044):', dbErr.message)
      setDeliveryUrl(publicUrl)
    } catch (e: unknown) {
      setDeliveryError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setDeliveryUploading(false)
    }
  }

  /* Best-effort signature persist: needs migration 043. dataURL → PNG → storage → column. */
  const persistSignature = async (pid: string): Promise<void> => {
    if (!user?.id || !signatureDraft) return
    try {
      const blob = await (await fetch(signatureDraft)).blob()
      const path = `${user.id}/${pid}/signature.png`
      const { error: upErr } = await supabase.storage.from('patent-uploads').upload(path, blob, { upsert: true, contentType: 'image/png' })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('patent-uploads').getPublicUrl(path)
      await supabase.from('patents').update({ maker_signature_url: urlData.publicUrl }).eq('id', pid)
      setSignatureUrl(urlData.publicUrl)
    } catch (e) {
      console.warn('[PatentLedger] signature persist skipped:', e)
    }
  }

  // --- Student actions ---
  const onSubmitPlan = async () => {
    if (planStep1FieldsLocked) return
    if (!patent.field1.trim()) {
      setPlanSubmitError('Answer row i before submitting your plan.')
      return
    }
    if (!isEmpathyValid(empathy)) {
      setPlanSubmitError('Answer row iv (what you know that changed a decision) before submitting.')
      return
    }
    if (!user?.id) return
    setPlanSubmitError(null)
    setSubmittingStep1(true)
    const empathyJson = serializeEmpathy(empathy)
    try {
      if (plan.id && plan.status !== 'none') {
        const { error } = await supabase
          .from('patents')
          .update({ field_1: patent.field1, field_2: empathyJson, status: 'pending', checklist_submitted: false })
          .eq('id', plan.id)
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
      await loadEntryNumber()
      goPhase(2)
    } catch (e: unknown) {
      setPlanSubmitError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSubmittingStep1(false)
    }
  }

  const onSubmitChecklist = async () => {
    if (!plan.id || !allDone || checklistSubmitted) return
    if (uploadRequired && !uploadUrl) return
    setSubmittingChecklist(true)
    try {
      const { error } = await supabase.from('patents').update({ checklist_submitted: true }).eq('id', plan.id)
      if (error) throw error
      setChecklistSubmitted(true)
      showBanner(
        bypassApprovals ? 'Checklist done — proceeding to the Record.' : 'Checklist submitted. The Record opens once your teacher approves.',
        'success',
      )
      await loadFromDatabase()
    } catch (e: unknown) {
      console.error('[PatentLedger] submit checklist:', e)
    } finally {
      setSubmittingChecklist(false)
    }
  }

  const onSubmitRecord = async () => {
    setSubmitApprovalError(null)
    if (!user?.id || !plan.id) {
      setSubmitApprovalError('Submit your plan first.')
      return
    }
    const pid = plan.id
    if (!patent.field3.trim() || !patent.field4.trim()) {
      setSubmitApprovalError('Answer rows v and vi before submitting.')
      return
    }
    if (!allDone) {
      setSubmitApprovalError('Complete every checklist step first.')
      return
    }
    if (!checklistApproved && !bypassApprovals) {
      setSubmitApprovalError('Wait for your teacher to approve the checklist before submitting.')
      return
    }
    setSubmittingPatent(true)
    try {
      const { error: updErr } = await supabase
        .from('patents')
        .update({ stage: 'packet', field_2: serializeEmpathy(empathy), field_3: patent.field3, field_4: patent.field4 })
        .eq('id', pid)
      if (updErr) throw updErr

      /* Best-effort row vii (field_5) — tolerate missing column before migration 043. */
      if (patent.field5.trim()) {
        const { error: f5Err } = await supabase.from('patents').update({ field_5: patent.field5 }).eq('id', pid)
        if (f5Err) console.warn('[PatentLedger] field_5 skipped (apply migration 043):', f5Err.message)
      }
      if (patent.field6.trim()) {
        const { error: f6Err } = await supabase.from('patents').update({ field_6: patent.field6 }).eq('id', pid)
        if (f6Err) console.warn('[PatentLedger] field_6 skipped (apply migration 046):', f6Err.message)
      }
      await persistSignature(pid)

      const { data: existing } = await supabase
        .from('skill_completions')
        .select('id, status')
        .eq('student_id', user.id)
        .eq('tile_id', tile.id)
        .maybeSingle()
      const finalStatus = bypassApprovals ? 'approved' : 'pending'
      if (existing) {
        const { error } = await supabase
          .from('skill_completions')
          .update({ status: finalStatus, patent_id: pid, wp_awarded: null, gold_awarded: null })
          .eq('id', (existing as { id: string }).id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('skill_completions')
          .insert({ student_id: user.id, tile_id: tile.id, skill_key: tile.id, status: finalStatus, patent_id: pid })
        if (error) throw error
      }
      await refresh()
      showBanner(bypassApprovals ? 'Entry complete.' : 'Final entry submitted — awaiting teacher approval.', 'success')
      window.setTimeout(() => navigate(backRoute), 1500)
    } catch (e: unknown) {
      setSubmitApprovalError(e instanceof Error ? e.message : 'Submit failed.')
    } finally {
      setSubmittingPatent(false)
    }
  }

  /*
   * DEV-ONLY self-reset: clears this quest's patent data for the signed-in account in the SAME
   * browser — both the DB rows AND the localStorage draft that otherwise repopulates row i +
   * empathy after a teacher reset. Stripped from production builds via `import.meta.env.DEV`.
   */
  const devResetThisQuest = async () => {
    if (!user?.id) return
    if (!window.confirm('Dev reset: clear this quest’s patent data for your account?')) return
    try {
      await supabase.from('skill_completions').delete().eq('student_id', user.id).eq('tile_id', tile.id)
      await supabase.from('patents').delete().eq('student_id', user.id).in('tile_id', patentTileIdCandidates(tile.id))
    } catch (e) {
      console.warn('[PatentLedger] dev reset DB delete:', e)
    }
    localStorage.removeItem(field1DraftKey)
    localStorage.removeItem(empathyDraftKey)
    try {
      sessionStorage.removeItem(phaseKey)
    } catch {
      /* ignore */
    }
    phaseHydrateSigRef.current = ''
    setPatent(EMPTY_DRAFT)
    setEmpathy(EMPTY_EMPATHY)
    setChecks(Array(steps.length).fill(false))
    setPlan({ id: '', status: 'none' })
    setUploadUrl(null)
    setDeliveryUrl(null)
    setSignatureUrl(null)
    setSignatureDraft(null)
    setChecklistSubmitted(false)
    setChecklistApproved(false)
    setPlanCreatedAt(null)
    setPhase(1)
    setBanner(null)
    await loadFromDatabase()
    await loadEntryNumber()
  }

  // --- Render ---
  if (!initialised) {
    return (
      <div className="patent-ledger-root">
        <div className="patent-outer">
          <p className="pl-loading" role="status">
            Opening the ledger…
          </p>
        </div>
      </div>
    )
  }

  const isApproved = completionStatus === 'approved'
  const isFinalPending = completionStatus === 'pending'
  const readOnly = isApproved
  /* Autopopulate: the plan's submit date once it exists, otherwise today (the day it's being filled). */
  const dateText = formatLedgerDate(planCreatedAt ?? new Date().toISOString())
  const entryText = entryNumber != null ? String(entryNumber).padStart(2, '0') : '___'

  const tabs: { n: 1 | 2 | 3; numeral: string }[] = [
    { n: 1, numeral: 'i' },
    { n: 2, numeral: 'ii' },
    { n: 3, numeral: 'iii' },
  ]

  const workStatusText = !planSubmitted
    ? 'Submit the plan first'
    : !planApprovedForChecklist
      ? 'Awaiting teacher approval'
      : checklistApproved
        ? 'Checklist approved'
        : checklistSubmitted
          ? 'Submitted — awaiting approval'
          : 'In progress'

  return (
    <div className="patent-ledger-root">
      <div className="patent-outer">
        {/* Side tabs */}
        <div className="side-tabs" role="tablist" aria-label="Patent sections">
          {tabs.map(({ n, numeral }) => (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={phase === n}
              disabled={n > maxPhase}
              className={`side-tab${phase === n ? ' active' : ''}`}
              onClick={() => goPhase(n)}
            >
              <span className="tab-body" />
              <span className="tab-num">{numeral}</span>
            </button>
          ))}
        </div>

        <div className="patent-page" data-guild={guildMod}>
          <div className="page-right-border" />

          {/* Guild mark */}
          <div className="guild-mark">
            {guildMod === 'void' ? (
              /* Void Navigators — drafting compass over square + circle, with a central baluster. */
              <svg
                className="guild-svg"
                width="50"
                height="68"
                viewBox="0 0 120 172"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label={`${guildLabel} mark`}
              >
                <g stroke="#8B6914" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none">
                  <ellipse cx="60" cy="88" rx="54" ry="80" />
                  <rect x="26" y="60" width="68" height="68" />
                  <circle cx="60" cy="94" r="34" />
                  <line x1="60" y1="51" x2="33" y2="128" />
                  <line x1="60" y1="51" x2="87" y2="128" />
                  <circle cx="60" cy="40" r="11" />
                  <circle cx="60" cy="40" r="5" />
                </g>
                <polygon
                  points="60,74 66,78 62,86 69,98 62,112 64,122 60,152 56,122 58,112 51,98 58,86 54,78"
                  fill="#5C3210"
                />
              </svg>
            ) : guildMod === 'silicon' ? (
              /* Silicon Covenant — circuit-board tree: a central trace branching to nodes inside an oval die. */
              <svg
                className="guild-svg"
                width="50"
                height="68"
                viewBox="0 0 120 172"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label={`${guildLabel} mark`}
              >
                <g stroke="#8B6914" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none">
                  <ellipse cx="60" cy="86" rx="52" ry="78" />
                  <line x1="60" y1="30" x2="60" y2="152" />
                  <line x1="60" y1="64" x2="40" y2="46" />
                  <line x1="60" y1="80" x2="28" y2="62" />
                  <line x1="60" y1="104" x2="32" y2="92" />
                  <line x1="60" y1="130" x2="40" y2="116" />
                  <line x1="60" y1="64" x2="80" y2="46" />
                  <line x1="60" y1="80" x2="92" y2="62" />
                  <line x1="60" y1="104" x2="88" y2="92" />
                  <line x1="60" y1="130" x2="80" y2="116" />
                  <circle cx="60" cy="30" r="7" />
                  <circle cx="60" cy="62" r="7" />
                  <circle cx="60" cy="158" r="6" />
                  <circle cx="40" cy="44" r="5" />
                  <circle cx="28" cy="62" r="5" />
                  <circle cx="32" cy="92" r="5" />
                  <circle cx="40" cy="116" r="5" />
                  <circle cx="80" cy="44" r="5" />
                  <circle cx="92" cy="62" r="5" />
                  <circle cx="88" cy="92" r="5" />
                  <circle cx="80" cy="116" r="5" />
                </g>
              </svg>
            ) : guildMod === 'folded' ? (
              /* Folded Path — origami crane (head + beak left, wing up-right, tail + legs) inside an oval. */
              <svg
                className="guild-svg"
                width="48"
                height="68"
                viewBox="0 0 120 172"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label={`${guildLabel} mark`}
              >
                <g stroke="#8B6914" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none">
                  <ellipse cx="60" cy="86" rx="52" ry="78" />
                  <line x1="16" y1="84" x2="32" y2="79" />
                  <line x1="16" y1="84" x2="33" y2="92" />
                  <line x1="32" y1="79" x2="33" y2="92" />
                  <line x1="33" y1="92" x2="54" y2="110" />
                  <line x1="40" y1="88" x2="56" y2="108" />
                  <line x1="54" y1="110" x2="98" y2="55" />
                  <line x1="98" y1="55" x2="103" y2="113" />
                  <line x1="54" y1="110" x2="103" y2="113" />
                  <line x1="54" y1="110" x2="26" y2="112" />
                  <line x1="26" y1="112" x2="66" y2="137" />
                  <line x1="66" y1="137" x2="103" y2="113" />
                  <line x1="54" y1="110" x2="66" y2="137" />
                  <line x1="66" y1="137" x2="52" y2="141" />
                  <line x1="66" y1="137" x2="72" y2="141" />
                </g>
              </svg>
            ) : guildMod === 'prism' ? (
              /* Prism — light dispersing: rays radiating from a central point, with a doubled vertical axis. */
              <svg
                className="guild-svg"
                width="48"
                height="68"
                viewBox="0 0 120 172"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label={`${guildLabel} mark`}
              >
                <g stroke="#8B6914" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none">
                  <ellipse cx="60" cy="86" rx="52" ry="78" />
                  <line x1="68" y1="86" x2="106" y2="86" />
                  <line x1="66" y1="81" x2="100" y2="51" />
                  <line x1="63" y1="79" x2="83" y2="25" />
                  <line x1="57" y1="79" x2="37" y2="25" />
                  <line x1="54" y1="81" x2="20" y2="51" />
                  <line x1="52" y1="86" x2="14" y2="86" />
                  <line x1="54" y1="91" x2="20" y2="121" />
                  <line x1="57" y1="93" x2="37" y2="147" />
                  <line x1="63" y1="93" x2="83" y2="147" />
                  <line x1="66" y1="91" x2="100" y2="121" />
                  <line x1="58.5" y1="78" x2="58.5" y2="18" />
                  <line x1="61.5" y1="78" x2="61.5" y2="18" />
                  <line x1="58.5" y1="94" x2="58.5" y2="154" />
                  <line x1="61.5" y1="94" x2="61.5" y2="154" />
                  <circle cx="60" cy="86" r="8" />
                </g>
              </svg>
            ) : guildMod === 'forge' ? (
              /* Forge — 3D-printer extruder laying a filament onto a tiered print on the build plate. */
              <svg
                className="guild-svg"
                width="48"
                height="68"
                viewBox="0 0 120 172"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label={`${guildLabel} mark`}
              >
                <g stroke="#8B6914" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none">
                  <ellipse cx="60" cy="86" rx="52" ry="78" />
                  <line x1="44" y1="26" x2="76" y2="26" />
                  <line x1="44" y1="26" x2="50" y2="56" />
                  <line x1="76" y1="26" x2="70" y2="56" />
                  <line x1="50" y1="56" x2="70" y2="56" />
                  <line x1="50" y1="56" x2="57" y2="76" />
                  <line x1="70" y1="56" x2="63" y2="76" />
                  <line x1="57" y1="76" x2="60" y2="82" />
                  <line x1="63" y1="76" x2="60" y2="82" />
                  <line x1="60" y1="82" x2="60" y2="96" />
                  <circle cx="60" cy="96" r="2" />
                  <ellipse cx="60" cy="96" rx="20" ry="5" />
                  <line x1="40" y1="96" x2="40" y2="110" />
                  <line x1="80" y1="96" x2="80" y2="110" />
                  <path d="M40 110 A20 5 0 0 1 80 110" />
                  <ellipse cx="60" cy="114" rx="28" ry="6" />
                  <line x1="32" y1="114" x2="32" y2="128" />
                  <line x1="88" y1="114" x2="88" y2="128" />
                  <path d="M32 128 A28 6 0 0 1 88 128" />
                  <ellipse cx="60" cy="132" rx="36" ry="7" />
                  <line x1="24" y1="132" x2="24" y2="146" />
                  <line x1="96" y1="132" x2="96" y2="146" />
                  <path d="M24 146 A36 7 0 0 1 96 146" />
                  <ellipse cx="60" cy="150" rx="46" ry="8" />
                  <path d="M14 150 A46 14 0 0 1 106 150" />
                </g>
              </svg>
            ) : (
              <svg className="guild-svg" width="60" height="60" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label={`${guildLabel} mark`}>
                <polygon points="36,4 56,14 68,34 58,56 36,68 14,58 4,36 14,14" fill="none" stroke="#8B6914" strokeWidth="1.4" />
                <polygon points="36,11 51,19 61,34 52,51 36,61 20,53 11,36 20,19" fill="none" stroke="#C4A84A" strokeWidth="0.7" />
                <rect x="32" y="29" width="8" height="17" rx="1" fill="#5C3210" />
                <rect x="26" y="22" width="20" height="9" rx="1.5" fill="#5C3210" />
                <line x1="24" y1="41" x2="20" y2="45" stroke="#8B6914" strokeWidth="1" strokeLinecap="round" />
                <line x1="24" y1="36" x2="19" y2="36" stroke="#8B6914" strokeWidth="1" strokeLinecap="round" />
                <line x1="48" y1="41" x2="52" y2="45" stroke="#8B6914" strokeWidth="1" strokeLinecap="round" />
                <line x1="48" y1="36" x2="53" y2="36" stroke="#8B6914" strokeWidth="1" strokeLinecap="round" />
              </svg>
            )}
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: '8px', letterSpacing: '0.22em', color: 'var(--gold)', margin: 0 }}>
              {guildLabel}
            </p>
          </div>

          {/* Identity band — autopopulated */}
          <div className="identity-band">
            <div className="id-field">
              <span className="id-lbl">Maker</span>
              <span className="id-value">{makerName}</span>
            </div>
            <div className="id-center">·</div>
            <div className="id-field right">
              <span className="id-lbl">Date</span>
              <span className="id-value" style={{ textAlign: 'right' }}>
                {dateText}
              </span>
            </div>
          </div>

          {/* Quest band */}
          <div className="quest-band">
            <span className="quest-name">{tile.skill_name}</span>
            <span className="entry-num">Entry no. {entryText}</span>
          </div>

          {/* ── Panel i — The Plan ── */}
          <div className={`panel${phase === 1 ? ' active' : ''}`} role="tabpanel">
            {banner && phase === 1 ? (
              <div className={`status-banner ${banner.tone}`} role="status">
                {banner.text}
              </div>
            ) : null}
            {plan.status === 'pending' ? (
              <div className="status-banner" role="status">
                ⏳ Plan submitted — waiting for teacher approval.
              </div>
            ) : plan.status === 'approved' ? (
              <div className="status-banner success" role="status">
                ✓ Plan approved — your answers are recorded below. Open the Work tab.
              </div>
            ) : null}

            {tile.tile_description?.trim() ? (
              <div className="ways-hint" style={{ borderTop: 'none', marginTop: 0 }}>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Quest brief</strong>
                {tile.tile_description.trim()}
              </div>
            ) : null}

            {content.recipientGuidance ? (
              <div className="ways-hint" style={{ borderTop: 'none', marginTop: tile.tile_description?.trim() ? undefined : 0 }}>
                {content.recipientGuidance}
              </div>
            ) : null}

            <div className="ledger-row">
              <span className="row-num">i.</span>
              <div className="row-body">
                <span className="row-q">
                  What are you making?<span className="req">*</span>
                </span>
                <span className="row-hint">One sentence. Name the thing.</span>
                <textarea
                  rows={2}
                  value={patent.field1}
                  placeholder="A small game piece in the shape of a wolf, for my younger sister."
                  disabled={planStep1FieldsLocked || readOnly}
                  onChange={(e) => {
                    const v = e.target.value
                    setPatent((p) => ({ ...p, field1: v }))
                    localStorage.setItem(field1DraftKey, v)
                  }}
                />
              </div>
            </div>

            <div className="ledger-row">
              <span className="row-num">ii.</span>
              <div className="row-body">
                <span className="row-q">
                  Who is this for?<span className="req">*</span>
                </span>
                <span className="row-hint">A name, or enough detail that a stranger would know who you mean.</span>
                <input
                  type="text"
                  value={empathy.who}
                  placeholder="My younger sister Mara, age 9."
                  disabled={planStep1FieldsLocked || readOnly}
                  onChange={(e) => {
                    const next = { ...empathy, who: e.target.value }
                    setEmpathy(next)
                    localStorage.setItem(empathyDraftKey, serializeEmpathy(next))
                    if (plan.id) void saveFieldToDb('field_2', serializeEmpathy(next), plan.id)
                  }}
                />
              </div>
            </div>

            <div className="ledger-row">
              <span className="row-num">iii.</span>
              <div className="row-body">
                <span className="row-q">Why does it matter to them?</span>
                <span className="row-hint">Two or three sentences.</span>
                <textarea
                  rows={3}
                  value={empathy.why}
                  placeholder="She collects animal figures and her wolf is missing from the set…"
                  disabled={planStep1FieldsLocked || readOnly}
                  onChange={(e) => {
                    const next = { ...empathy, why: e.target.value }
                    setEmpathy(next)
                    localStorage.setItem(empathyDraftKey, serializeEmpathy(next))
                    if (plan.id) void saveFieldToDb('field_2', serializeEmpathy(next), plan.id)
                  }}
                />
              </div>
            </div>

            <div className="ledger-row" style={{ borderBottom: 'none' }}>
              <span className="row-num">iv.</span>
              <div className="row-body">
                <span className="row-q">
                  What is one thing you know about this person that changed a decision you made?<span className="req">*</span>
                </span>
                <span className="row-hint">Be specific — what did you learn, and what did you change because of it?</span>
                <textarea
                  rows={3}
                  value={empathy.what_changed}
                  disabled={planStep1FieldsLocked || readOnly}
                  placeholder="e.g. Mara is left-handed, so I moved the grip to the other side."
                  onChange={(e) => {
                    const next = { ...empathy, what_changed: e.target.value }
                    setEmpathy(next)
                    localStorage.setItem(empathyDraftKey, serializeEmpathy(next))
                    if (plan.id) void saveFieldToDb('field_2', serializeEmpathy(next), plan.id)
                  }}
                />
                <div className="ways-hint">
                  Ways to find out: observe · ask directly · ask someone who knows them · watch how they use similar things ·
                  make an earlier version and get feedback · imagine receiving it yourself
                </div>
              </div>
            </div>

            {!readOnly && !planStep1FieldsLocked ? (
              <>
                <button
                  className="submit-btn"
                  type="button"
                  disabled={!canUseDb || submittingStep1 || !patent.field1.trim() || !isEmpathyValid(empathy)}
                  onClick={() => void onSubmitPlan()}
                >
                  {submittingStep1 ? 'Saving…' : plan.status === 'returned' ? 'Resubmit plan' : 'Submit plan for approval'}
                </button>
                <div className="gate-note">
                  <span>🔒</span> The Work tab unlocks once your teacher approves.
                </div>
              </>
            ) : planSubmitted && !readOnly ? (
              <button className="submit-btn" type="button" onClick={() => goPhase(2)}>
                Continue to the Work →
              </button>
            ) : null}
            {planSubmitError ? <div className="status-banner returned" role="alert">{planSubmitError}</div> : null}
          </div>

          {/* ── Panel ii — The Work ── */}
          <div className={`panel${phase === 2 ? ' active' : ''}`} role="tabpanel">
            {banner && phase === 2 ? (
              <div className={`status-banner ${banner.tone}`} role="status">
                {banner.text}
              </div>
            ) : null}

            <div className="cl-header">
              <span className="cl-progress">
                {doneCount} of {steps.length} complete
              </span>
              <span className="cl-status">{workStatusText}</span>
            </div>

            {steps.length === 0 ? (
              <p className="row-hint">No checklist steps are defined for this quest yet.</p>
            ) : (
              <ul className="steps">
                {steps.map((step, idx) => {
                  const checked = checks[idx] ?? false
                  return (
                    <li key={idx} className={checked ? 'done' : undefined}>
                      <button
                        type="button"
                        className={`cb${checked ? ' checked' : ''}`}
                        aria-pressed={checked}
                        aria-label={`Step ${idx + 1}`}
                        disabled={!canStartChecklist || (checklistSubmitted && !checklistApproved) || readOnly}
                        onClick={() => {
                          const nextArr = [...checks]
                          nextArr[idx] = !checked
                          setChecks(nextArr)
                          void saveChecklistToDb(nextArr, plan.id)
                        }}
                      />
                      <span className="step-num">{idx + 1}</span>
                      <span className="step-main">{step.description}</span>
                    </li>
                  )
                })}
              </ul>
            )}

            {checklistFooterNote ? <div className="ways-hint">{checklistFooterNote}</div> : null}

            {resources.length > 0 ? (
              <div className="res-row">
                {resources.map((r) => (
                  <a key={r.url} className="res-btn" href={r.url} target="_blank" rel="noopener noreferrer">
                    {r.label} →
                  </a>
                ))}
              </div>
            ) : null}

            {uploadRequired ? (
              <>
                {uploadUrl ? (
                  VIDEO_RE.test(uploadUrl) ? (
                    <video className="upload-preview" src={uploadUrl} controls />
                  ) : (
                    <img className="upload-preview" src={uploadUrl} alt="Uploaded work" />
                  )
                ) : null}
                <label className="upload-block">
                  <div className="upload-label">
                    {uploading ? 'Uploading…' : uploadUrl ? 'Replace finished photo or video' : 'Upload finished photo or video'}
                  </div>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    style={{ display: 'none' }}
                    disabled={!canStartChecklist || checklistSubmitted || uploading || readOnly}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void handleFileUpload(f)
                      e.target.value = ''
                    }}
                  />
                </label>
                {uploadError ? <div className="status-banner returned" role="alert">{uploadError}</div> : null}
              </>
            ) : null}

            {!canStartChecklist && planSubmitted ? (
              <div className="gate-note">
                <span>🔒</span> The checklist unlocks after your teacher approves your plan.
              </div>
            ) : null}

            {!readOnly ? (
              <>
                <button
                  className="submit-btn"
                  type="button"
                  disabled={
                    checklistSubmitted ||
                    !canStartChecklist ||
                    !allDone ||
                    (uploadRequired && !uploadUrl) ||
                    submittingChecklist
                  }
                  onClick={() => void onSubmitChecklist()}
                >
                  {submittingChecklist ? 'Submitting…' : 'Submit checklist for approval'}
                </button>
                <div className="gate-note">
                  <span>🔒</span> The Record tab unlocks once your teacher approves.
                </div>
              </>
            ) : null}
          </div>

          {/* ── Panel iii — The Record ── */}
          <div className={`panel${phase === 3 ? ' active' : ''}`} role="tabpanel">
            {banner && phase === 3 ? (
              <div className={`status-banner ${banner.tone}`} role="status">
                {banner.text}
              </div>
            ) : null}
            {isFinalPending ? (
              <div className="status-banner" role="status">
                ⏳ Final entry submitted — waiting for teacher approval.
              </div>
            ) : null}

            <div className="ledger-row">
              <span className="row-num">v.</span>
              <div className="row-body">
                <span className="row-q">
                  What did you make, and what makes it yours?<span className="req">*</span>
                </span>
                <span className="row-hint">Where did you go beyond the example?</span>
                <textarea
                  rows={3}
                  value={patent.field3}
                  disabled={readOnly}
                  placeholder="e.g. I made a wolf figure and carved a notch so it stands on its own — that wasn't in the example."
                  onChange={(e) => {
                    const v = e.target.value
                    setPatent((p) => ({ ...p, field3: v }))
                    if (plan.id) void saveFieldToDb('field_3', v, plan.id)
                  }}
                />
              </div>
            </div>

            <div className="ledger-row">
              <span className="row-num">vi.</span>
              <div className="row-body">
                <span className="row-q">
                  What failed, and what did you change?<span className="req">*</span>
                </span>
                <textarea
                  rows={3}
                  value={patent.field4}
                  disabled={readOnly}
                  placeholder="e.g. My first print's legs snapped, so I made them thicker and printed it again."
                  onChange={(e) => {
                    const v = e.target.value
                    setPatent((p) => ({ ...p, field4: v }))
                    if (plan.id) void saveFieldToDb('field_4', v, plan.id)
                  }}
                />
              </div>
            </div>

            <div className="ledger-row">
              <span className="row-num">vii.</span>
              <div className="row-body">
                <span className="row-q">Maine connection?</span>
                <span className="row-hint">Optional — a place, a person, a tradition this connects to.</span>
                <textarea
                  rows={2}
                  value={patent.field5}
                  disabled={readOnly}
                  placeholder="e.g. It's modeled on the gray wolves at the Maine Wildlife Park in Gray."
                  onChange={(e) => setPatent((p) => ({ ...p, field5: e.target.value }))}
                />
              </div>
            </div>

            <div className="ledger-row" style={{ borderBottom: 'none' }}>
              <span className="row-num">viii.</span>
              <div className="row-body">
                <span className="row-q">Who taught you?</span>
                <span className="row-hint">Optional — a person who showed you a technique or helped you think it through.</span>
                <input
                  type="text"
                  value={patent.field6}
                  disabled={readOnly}
                  placeholder="e.g. Ms. Rivera showed me how to mirror vinyl before cutting."
                  onChange={(e) => {
                    const v = e.target.value
                    setPatent((p) => ({ ...p, field6: v }))
                    if (plan.id) void saveFieldToDb('field_6', v, plan.id)
                  }}
                />
              </div>
            </div>

            {/* Delivery proof — photo/video of the finished piece, ideally with the recipient */}
            <div className="ledger-row" style={{ borderBottom: 'none' }}>
              <span className="row-num">📷</span>
              <div className="row-body">
                <span className="row-q">Show it finished — with the person it's for</span>
                <span className="row-hint">
                  Add a photo of the finished piece with the recipient, or a short video of it. This is the proof of the moment it was given.
                </span>
                {deliveryUrl ? (
                  VIDEO_RE.test(deliveryUrl) ? (
                    <video className="upload-preview" src={deliveryUrl} controls />
                  ) : (
                    <img className="upload-preview" src={deliveryUrl} alt="Finished piece with recipient" />
                  )
                ) : null}
                {!readOnly ? (
                  <label className="upload-block">
                    <div className="upload-label">
                      {deliveryUploading
                        ? 'Uploading…'
                        : deliveryUrl
                          ? 'Replace photo or video'
                          : 'Upload photo or video'}
                    </div>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      style={{ display: 'none' }}
                      disabled={deliveryUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) void handleDeliveryUpload(f)
                        e.target.value = ''
                      }}
                    />
                  </label>
                ) : null}
                {deliveryError ? (
                  <div className="status-banner returned" role="alert">{deliveryError}</div>
                ) : null}
              </div>
            </div>

            {/* Signoff block */}
            <div className="signoff">
              <div className="sc">
                <div className="sc-label">Maker's declaration</div>
                <SignaturePad
                  value={signatureDraft ?? signatureUrl}
                  disabled={readOnly}
                  onChange={(v) => setSignatureDraft(v)}
                />
              </div>
              <div className="sc">
                <div className="sc-label">Teacher review</div>
                <div className="wp-row">
                  <div className="wp-f">
                    <div className="wp-lbl">Workshop Points</div>
                    <input
                      type="text"
                      disabled
                      placeholder="—"
                      value={isApproved ? String(tile.wp_display ?? tile.wp_value ?? '') : ''}
                      readOnly
                    />
                  </div>
                  <div className="wp-f">
                    <div className="wp-lbl">Gold</div>
                    <input
                      type="text"
                      disabled
                      placeholder="—"
                      value={isApproved ? String(tile.gold_display ?? tile.gold_value ?? '') : ''}
                      readOnly
                    />
                  </div>
                </div>
                <div className="ret-lbl">Return note</div>
                <input
                  className="ret-input"
                  type="text"
                  disabled
                  placeholder="Comment or approval note…"
                  value={banner?.tone === 'returned' ? banner.text : ''}
                  readOnly
                />
              </div>
            </div>

            {!readOnly ? (
              <button
                className="submit-btn"
                type="button"
                style={{ marginTop: '1.5rem' }}
                disabled={
                  !canUseDb ||
                  submittingPatent ||
                  isFinalPending ||
                  !patent.field3.trim() ||
                  !patent.field4.trim() ||
                  (!checklistApproved && !bypassApprovals)
                }
                onClick={() => void onSubmitRecord()}
              >
                {submittingPatent ? 'Submitting…' : 'Submit for teacher approval'}
              </button>
            ) : null}
            {submitApprovalError ? <div className="status-banner returned" role="alert">{submitApprovalError}</div> : null}
          </div>

          {/* Closing quote — TBD Card 09 */}
          <div className="closing">
            <span className="closing-mark">❧</span>
            <div className="closing-text">[Closing quote — TBD, Card 09]</div>
          </div>

          {/* DEV-ONLY tester control — never shipped to production (import.meta.env.DEV). */}
          {import.meta.env.DEV ? (
            <div
              style={{
                margin: '0 2rem 1.25rem',
                paddingTop: '0.75rem',
                borderTop: '1px dashed var(--border-dark)',
                textAlign: 'center',
              }}
            >
              <button
                type="button"
                className="sig-act-btn"
                style={{ color: '#8B3A1A', letterSpacing: '0.1em' }}
                onClick={() => void devResetThisQuest()}
              >
                ⟲ Dev: reset this quest for me
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
