/*
 * Teacher approvals console (`/teacher`)
 *
 * Five pending queues in one dense grid (plans, checklists, skills, redemptions, shop)
 * so everything fits on screen at once. Student preview balance sits *below* the queues
 * (testing aid, not the primary job). Storyline widget sits after the grid.
 *
 * Student progress roster is collapsed behind “Show student progress” by default —
 * privacy if kids glimpse the teacher laptop during class.
 *
 * Realtime refreshes lists; new items also surface globally via
 * TeacherSubmissionAlertSync (banner + chime in App.tsx).
 *
 * “Duplicate plan rows” in approve/return handlers: loops touch every pending plan row
 * for a student+tile so stray duplicate inserts cannot stay stuck in limbo.
 *
 * Overview: docs/developer-handoff-recent-work.md
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { TeacherStorylineWidget } from '../components/TeacherStorylineWidget'
import { TeacherSubmissionAlertToggle } from '../components/TeacherSubmissionAlertToggle'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { parseEmpathy } from '../lib/empathy'
import { applyTeacherPendingSnapshot } from '../lib/teacherPendingSnapshot'
import type { TeacherSubmissionAlert } from '../lib/teacherSubmissionAlert'

// =============================================================================
// Types — Supabase row shapes + UI “acting” state for button spinners
// =============================================================================

type TileInfo = {
  guild: string
  skill_name: string
  wp_value: number
  gold_value: number
  wp_display?: string | null
  gold_display?: string | null
}

type PendingSkillRow = {
  id: string
  student_id: string
  tile_id: string
  patent_id: string | null
  created_at: string
  display_name: string | null
  tile: TileInfo | null
  patent: PatentRow | null
}

type PatentRow = {
  id: string
  field_1: string
  field_2: string
  field_3: string
  field_4: string
  /** Final submission rows use `packet`; plan-stage rows must not approve via skill_completions. */
  stage: string | null
}

type PendingRedemptionRow = {
  id: string
  student_id: string
  inventory_id: string
  item_name: string
  created_at: string
  display_name: string | null
}

type PendingShopPurchaseRequestRow = {
  id: string
  student_id: string
  item_name: string
  requested_grams: number | null
  calculated_gold_cost: number
  notes: string | null
  created_at: string
  display_name: string | null
}

type PendingChecklistRow = {
  id: string
  student_id: string
  tile_id: string
  created_at: string
  display_name: string | null
  tile: { guild: string; skill_name: string } | null
  upload_url: string | null
}

type PendingPlanRow = {
  id: string
  student_id: string
  tile_id: string
  created_at: string
  display_name: string | null
  tile: { guild: string; skill_name: string } | null
  patent: { field_1: string; field_2: string } | null
}

type StudentSummary = {
  id: string
  display_name: string | null
  wp: number
  gold: number
}

type StudentSkillCompletion = {
  id: string
  tile_id: string
  status: string
  wp_awarded: number | null
  gold_awarded: number | null
  created_at: string
  tile: { guild: string; skill_name: string } | null
}

type StudentInventoryRow = {
  id: string
  student_id: string
  owner_role?: string | null
  item_name: string
  item_description: string
  gold_cost: number
  status: string
  created_at: string
}

type StudentRedemptionRow = {
  id: string
  inventory_id: string
  item_name: string
  status: string
  created_at: string
}

type Acting =
  | { scope: 'skill'; id: string; action: 'approve' | 'return' }
  | { scope: 'redemption'; id: string; action: 'approve' | 'return' }
  | { scope: 'shopRequest'; id: string; action: 'approve' | 'return' }
  | null

// -----------------------------------------------------------------------------
// EmpathyDisplay — compact read-only empathy for patent plan rows
// -----------------------------------------------------------------------------

function EmpathyDisplay({ raw }: { raw: string | null | undefined }) {
  const e = parseEmpathy(raw)
  const hasContent = e.who || e.why || e.what_changed || e.how_learned.length > 0
  if (!hasContent) return null
  return (
    <div className="bench-inset-card bench-empathy-readout" role="note">
      <strong className="bench-inset-card__title">Empathy</strong>
      {e.who ? (
        <p className="bench-inset-card__body">
          <strong>Who:</strong> {e.who}
        </p>
      ) : null}
      {e.why ? (
        <p className="bench-inset-card__body">
          <strong>Why it matters:</strong> {e.why}
        </p>
      ) : null}
      {e.what_changed ? (
        <p className="bench-inset-card__body">
          <strong>Changed their design because:</strong> {e.what_changed}
        </p>
      ) : null}
      {e.how_learned.length > 0 ? (
        <p className="bench-inset-card__body">
          <strong>How they learned:</strong> {e.how_learned.join(' · ')}
        </p>
      ) : null}
    </div>
  )
}

// =============================================================================
// TeacherPanelPage — `/teacher` grading console (patents + completions + redemptions)
// =============================================================================

export function TeacherPanelPage() {
  const { profile, refreshProfile, signOut } = useAuth()

  // ---------------------------------------------------------------------------
  // Pending queues — what needs teacher action right now
  // ---------------------------------------------------------------------------
  const [skillRows, setSkillRows] = useState<PendingSkillRow[]>([])
  const [redemptionRows, setRedemptionRows] = useState<PendingRedemptionRow[]>([])
  const [shopRequestRows, setShopRequestRows] = useState<PendingShopPurchaseRequestRow[]>([])
  const [planRows, setPlanRows] = useState<PendingPlanRow[]>([])
  const [checklistRows, setChecklistRows] = useState<PendingChecklistRow[]>([])

  // ---------------------------------------------------------------------------
  // Student roster + drill-down (selected learner’s profile / skills / shop activity)
  // ---------------------------------------------------------------------------
  const [students, setStudents] = useState<StudentSummary[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [studentProfile, setStudentProfile] = useState<StudentSummary | null>(null)
  const [studentSkills, setStudentSkills] = useState<StudentSkillCompletion[]>([])
  const [studentInventory, setStudentInventory] = useState<StudentInventoryRow[]>([])
  const [studentRedemptions, setStudentRedemptions] = useState<StudentRedemptionRow[]>([])

  // ---------------------------------------------------------------------------
  // Page load + admin toast + per-row busy flags (skills, redemptions, patent sub-flows)
  // ---------------------------------------------------------------------------
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [adminMessage, setAdminMessage] = useState<string | null>(null)
  const [acting, setActing] = useState<Acting>(null)
  const [actingPlanId, setActingPlanId] = useState<string | null>(null)
  const [actingPlanKind, setActingPlanKind] = useState<'approve' | 'return' | null>(null)
  const [actingChecklistId, setActingChecklistId] = useState<string | null>(null)
  const [actingChecklistKind, setActingChecklistKind] = useState<'approve' | 'return' | null>(null)
  const [studentsBusy, setStudentsBusy] = useState(false)
  const [archivingStudentId, setArchivingStudentId] = useState<string | null>(null)
  const [awardWpAmount, setAwardWpAmount] = useState('')
  const [awardGoldAmount, setAwardGoldAmount] = useState('')
  const [awardingStudentId, setAwardingStudentId] = useState<string | null>(null)
  const [previewAwardWpAmount, setPreviewAwardWpAmount] = useState('')
  const [previewAwardGoldAmount, setPreviewAwardGoldAmount] = useState('')
  const [previewAwarding, setPreviewAwarding] = useState(false)
  const [previewClearing, setPreviewClearing] = useState(false)
  /* Roster hidden until opened — avoids flashing student names if the panel is visible. */
  const [showStudentProgress, setShowStudentProgress] = useState(false)
  const [penaltyByCompletionId, setPenaltyByCompletionId] = useState<Map<string, number>>(
    () => new Map(),
  )
  const [resettingCompletionId, setResettingCompletionId] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // `loadPending` — parallel queries + joins (tiles, names) for all four queues
  // ---------------------------------------------------------------------------
  const loadPending = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setSkillRows([])
      setRedemptionRows([])
      setShopRequestRows([])
      setLoadError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)

    const [compRes, redRes, shopReqRes, planRes, checklistRes] = await Promise.all([
      supabase
        .from('skill_completions')
        .select('id, student_id, tile_id, patent_id, created_at, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase
        .from('redemption_requests')
        .select('id, student_id, inventory_id, item_name, created_at, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase
        .from('shop_purchase_requests')
        .select('id, student_id, item_name, requested_grams, calculated_gold_cost, notes, created_at, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase
        .from('patents')
        .select('id, student_id, tile_id, field_1, field_2, created_at, stage, status')
        .eq('stage', 'plan')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase
        .from('patents')
        .select('id, student_id, tile_id, upload_url, created_at, stage, status, checklist_approved')
        .eq('stage', 'plan')
        .eq('status', 'approved')
        .eq('checklist_submitted', true)
        .eq('checklist_approved', false)
        .order('created_at', { ascending: true }),
    ])

    if (compRes.error) {
      console.error('teacher panel skill completions:', compRes.error.message)
      setSkillRows([])
      setRedemptionRows([])
      setLoadError(compRes.error.message)
      setLoading(false)
      return
    }
    if (redRes.error) {
      console.error('teacher panel redemptions:', redRes.error.message)
      setSkillRows([])
      setRedemptionRows([])
      setLoadError(redRes.error.message)
      setLoading(false)
      return
    }
    if (shopReqRes.error) {
      console.error('teacher panel shop purchase requests:', shopReqRes.error.message)
      setShopRequestRows([])
      setLoadError(shopReqRes.error.message)
      setLoading(false)
      return
    }
    if (planRes.error) {
      console.error('teacher panel plan approvals:', planRes.error.message)
      setSkillRows([])
      setRedemptionRows([])
      setPlanRows([])
      setLoadError(planRes.error.message)
      setLoading(false)
      return
    }
    if (checklistRes.error) {
      console.error('teacher panel checklist approvals:', checklistRes.error.message)
      setChecklistRows([])
      setLoadError(checklistRes.error.message)
      setLoading(false)
      return
    }

    const completions = compRes.data ?? []
    const redemptions = redRes.data ?? []
    const shopRequests = shopReqRes.data ?? []
    const plans = planRes.data ?? []
    const checklists = checklistRes.data ?? []

    const studentIds = [
      ...new Set([
        ...completions.map((r) => r.student_id as string),
        ...redemptions.map((r) => r.student_id as string),
        ...shopRequests.map((r) => r.student_id as string),
        ...plans.map((r) => r.student_id as string),
        ...checklists.map((r) => r.student_id as string),
      ]),
    ]

    const nameById = new Map<string, string | null>()
    if (studentIds.length > 0) {
      const { data: profs, error: pErr } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', studentIds)
      if (pErr) {
        console.error('profiles for teacher panel:', pErr.message)
        setSkillRows([])
        setRedemptionRows([])
        setLoadError(pErr.message)
        setLoading(false)
        return
      }
      for (const p of profs ?? []) {
        nameById.set(p.id as string, (p.display_name as string | null) ?? null)
      }
    }

    const tileIds = [...new Set(completions.map((r) => r.tile_id as string))]
    const tileById = new Map<string, TileInfo>()
    if (tileIds.length > 0) {
      const { data: tileRows, error: tErr } = await supabase
        .from('tiles')
        .select('id, guild, skill_name, wp_value, gold_value, wp_display, gold_display')
        .in('id', tileIds)
      if (tErr) {
        console.error('tiles for teacher panel:', tErr.message)
        setSkillRows([])
        setRedemptionRows([])
        setLoadError(tErr.message)
        setLoading(false)
        return
      }
      for (const t of tileRows ?? []) {
        tileById.set(t.id as string, {
          guild: t.guild as string,
          skill_name: t.skill_name as string,
          wp_value: (t.wp_value as number) ?? 10,
          gold_value: (t.gold_value as number) ?? 10,
        })
      }
    }

    const planTileIds = [...new Set([
      ...plans.map((r) => r.tile_id as string),
      ...checklists.map((r) => r.tile_id as string),
    ])]
    const planTileById = new Map<string, { guild: string; skill_name: string }>()
    if (planTileIds.length > 0) {
      const { data: tiles, error: ptErr } = await supabase
        .from('tiles')
        .select('id, guild, skill_name')
        .in('id', planTileIds)
      if (ptErr) {
        console.error('tiles for plan approvals:', ptErr.message)
        setSkillRows([])
        setRedemptionRows([])
        setPlanRows([])
        setLoadError(ptErr.message)
        setLoading(false)
        return
      }
      for (const t of tiles ?? []) {
        planTileById.set(t.id as string, {
          guild: t.guild as string,
          skill_name: t.skill_name as string,
        })
      }
    }

    const patentIds = [
      ...new Set(
        completions
          .map((r) => (r.patent_id as string | null) ?? null)
          .filter(Boolean) as string[],
      ),
    ]
    const patentById = new Map<string, PatentRow>()
    if (patentIds.length > 0) {
      const { data: pats, error: patErr } = await supabase
        .from('patents')
        .select('id, field_1, field_2, field_3, field_4, stage')
        .in('id', patentIds)
      if (patErr) {
        console.error('patents for teacher panel:', patErr.message)
        setSkillRows([])
        setRedemptionRows([])
        setLoadError(patErr.message)
        setLoading(false)
        return
      }
      for (const p of pats ?? []) {
        patentById.set(p.id as string, {
          id: p.id as string,
          field_1: (p.field_1 as string) ?? '',
          field_2: (p.field_2 as string) ?? '',
          field_3: (p.field_3 as string) ?? '',
          field_4: (p.field_4 as string) ?? '',
          stage: (p.stage as string | null) ?? null,
        })
      }
    }

    setSkillRows(
      completions.map((r) => ({
        id: r.id as string,
        student_id: r.student_id as string,
        tile_id: r.tile_id as string,
        patent_id: (r.patent_id as string | null) ?? null,
        created_at: r.created_at as string,
        display_name: nameById.get(r.student_id as string) ?? null,
        tile: tileById.get(r.tile_id as string) ?? null,
        patent:
          (r.patent_id as string | null)
            ? patentById.get(r.patent_id as string) ?? null
            : null,
      })),
    )

    setRedemptionRows(
      redemptions.map((r) => ({
        id: r.id as string,
        student_id: r.student_id as string,
        inventory_id: r.inventory_id as string,
        item_name: r.item_name as string,
        created_at: r.created_at as string,
        display_name: nameById.get(r.student_id as string) ?? null,
      })),
    )

    setShopRequestRows(
      shopRequests.map((r) => ({
        id: r.id as string,
        student_id: r.student_id as string,
        item_name: r.item_name as string,
        requested_grams: (r.requested_grams as number | null) ?? null,
        calculated_gold_cost: (r.calculated_gold_cost as number) ?? 0,
        notes: (r.notes as string | null) ?? null,
        created_at: r.created_at as string,
        display_name: nameById.get(r.student_id as string) ?? null,
      })),
    )

    setPlanRows(
      plans.map((r) => ({
        id: r.id as string,
        student_id: r.student_id as string,
        tile_id: r.tile_id as string,
        created_at: r.created_at as string,
        display_name: nameById.get(r.student_id as string) ?? null,
        tile: planTileById.get(r.tile_id as string) ?? null,
        patent: {
          field_1: (r.field_1 as string) ?? '',
          field_2: (r.field_2 as string) ?? '',
        },
      })),
    )

    setChecklistRows(
      checklists.map((r) => ({
        id: r.id as string,
        student_id: r.student_id as string,
        tile_id: r.tile_id as string,
        created_at: r.created_at as string,
        display_name: nameById.get(r.student_id as string) ?? null,
        tile: planTileById.get(r.tile_id as string) ?? null,
        upload_url: (r.upload_url as string | null) ?? null,
      })),
    )

    const pendingAlerts: TeacherSubmissionAlert[] = [
      ...plans.map((r) => {
        const sid = r.student_id as string
        const tid = r.tile_id as string
        return {
          alertId: `plan:${r.id as string}`,
          kind: 'plan' as const,
          studentName: nameById.get(sid) ?? null,
          detail: planTileById.get(tid)?.skill_name ?? 'Quest plan',
        }
      }),
      ...checklists.map((r) => {
        const sid = r.student_id as string
        const tid = r.tile_id as string
        return {
          alertId: `checklist:${r.id as string}`,
          kind: 'checklist' as const,
          studentName: nameById.get(sid) ?? null,
          detail: planTileById.get(tid)?.skill_name ?? 'Quest checklist',
        }
      }),
      ...completions.map((r) => {
        const sid = r.student_id as string
        const tid = r.tile_id as string
        return {
          alertId: `skill:${r.id as string}`,
          kind: 'skill' as const,
          studentName: nameById.get(sid) ?? null,
          detail: tileById.get(tid)?.skill_name ?? 'Skill completion',
        }
      }),
      ...redemptions.map((r) => {
        const sid = r.student_id as string
        return {
          alertId: `redemption:${r.id as string}`,
          kind: 'redemption' as const,
          studentName: nameById.get(sid) ?? null,
          detail: ((r.item_name as string) ?? 'Shop item').trim() || 'Shop item',
        }
      }),
      ...shopRequests.map((r) => {
        const sid = r.student_id as string
        return {
          alertId: `shop-request:${r.id as string}`,
          kind: 'redemption' as const,
          studentName: nameById.get(sid) ?? null,
          detail: ((r.item_name as string) ?? 'Shop request').trim() || 'Shop request',
        }
      }),
    ]
    applyTeacherPendingSnapshot(pendingAlerts)

    setLoading(false)
  }, [])

  // ---------------------------------------------------------------------------
  // Mount — populate all four pending queues once Supabase is ready
  // ---------------------------------------------------------------------------
  useEffect(() => {
    void loadPending()
  }, [loadPending])

  // ---------------------------------------------------------------------------
  // Realtime — re-fetch when students touch `patents` or `skill_completions`
  // ---------------------------------------------------------------------------
  /** Realtime: re-fetch pending items whenever a student submits a plan, checklist, or final packet. */
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const channel = supabase
      .channel('teacher-panel-student-submissions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'patents' },
        () => { void loadPending() },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'patents' },
        () => { void loadPending() },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'skill_completions' },
        () => { void loadPending() },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'skill_completions' },
        () => { void loadPending() },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'redemption_requests' },
        () => { void loadPending() },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'redemption_requests' },
        () => { void loadPending() },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shop_purchase_requests' },
        () => { void loadPending() },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shop_purchase_requests' },
        () => { void loadPending() },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [loadPending])

  // ---------------------------------------------------------------------------
  // Skill completions + shop redemptions — approve / return (WP guard on packet-only)
  // ---------------------------------------------------------------------------
  const clearActing = () => setActing(null)

  const approveSkill = async (id: string) => {
    if (!isSupabaseConfigured) return
    const row = skillRows.find((r) => r.id === id)
    const pid = row?.patent_id ?? null
    if (pid) {
      const st = row?.patent?.stage ?? ''
      /*
       * Guardrail: `skill_completions` rows can exist during plan/checklist phases for some flows,
       * but WP/gold must only fire when the linked patent is the final `packet` submission.
       * Without this check, a teacher approving the wrong queue entry could double-pay or pay early.
       */
      if (String(st).trim().toLowerCase() !== 'packet') {
        console.error(
          'approve skill: blocked — linked patent is not final packet stage (no WP/gold at plan/checklist gates)',
        )
        setAdminMessage(
          'Cannot approve this completion: the linked patent is not a final packet submission. Use Plan approvals or Checklist approvals instead.',
        )
        return
      }
    }
    setActing({ scope: 'skill', id, action: 'approve' })
    const { error } = await supabase.from('skill_completions').update({ status: 'approved' }).eq('id', id)
    clearActing()
    if (error) {
      console.error('approve skill:', error.message)
      return
    }
    void loadPending()
  }

  const returnSkill = async (id: string) => {
    if (!isSupabaseConfigured) return
    setActing({ scope: 'skill', id, action: 'return' })
    const { error } = await supabase
      .from('skill_completions')
      .update({ status: 'returned' })
      .eq('id', id)
    clearActing()
    if (error) {
      console.error('return skill:', error.message)
      return
    }
    void loadPending()
  }

  const approveRedemption = async (id: string) => {
    if (!isSupabaseConfigured) return
    setActing({ scope: 'redemption', id, action: 'approve' })
    const { error } = await supabase
      .from('redemption_requests')
      .update({ status: 'approved' })
      .eq('id', id)
    clearActing()
    if (error) {
      console.error('approve redemption:', error.message)
      return
    }
    void loadPending()
  }

  const approveShopRequest = async (id: string) => {
    if (!isSupabaseConfigured) return
    setActing({ scope: 'shopRequest', id, action: 'approve' })
    const { error } = await supabase
      .from('shop_purchase_requests')
      .update({ status: 'approved' })
      .eq('id', id)
    clearActing()
    if (error) {
      console.error('approve shop request:', error.message)
      setAdminMessage(`Could not approve shop request: ${error.message}`)
      return
    }
    void loadPending()
  }

  const returnShopRequest = async (id: string) => {
    if (!isSupabaseConfigured) return
    setActing({ scope: 'shopRequest', id, action: 'return' })
    const { error } = await supabase
      .from('shop_purchase_requests')
      .update({ status: 'rejected' })
      .eq('id', id)
    clearActing()
    if (error) {
      console.error('reject shop request:', error.message)
      setAdminMessage(`Could not reject shop request: ${error.message}`)
      return
    }
    void loadPending()
  }

  // ---------------------------------------------------------------------------
  // Patent plan + checklist — duplicate-row safe batch updates (see block comments in handlers)
  // ---------------------------------------------------------------------------
  const setActingPlan = (id: string, kind: 'approve' | 'return') => {
    setActingPlanId(id)
    setActingPlanKind(kind)
  }

  const clearActingPlan = () => {
    setActingPlanId(null)
    setActingPlanKind(null)
  }

  const approvePlan = async (id: string) => {
    if (!isSupabaseConfigured) return
    setActingPlan(id, 'approve')
    const row = planRows.find((r) => r.id === id) ?? null
    /*
     * Duplicate `patents` plan rows happen in the wild (double submit / retries). Approving only
     * the clicked `id` can leave a second `pending` row that keeps the student’s checklist locked —
     * batch-approve every pending plan for this student+tile when we know the row context.
     */
    const q = supabase
      .from('patents')
      .update({ status: 'approved' })
      .eq('id', id)
    const { error } = row
      ? await supabase
          .from('patents')
          .update({ status: 'approved' })
          .eq('student_id', row.student_id)
          .eq('tile_id', row.tile_id)
          .eq('stage', 'plan')
          .eq('status', 'pending')
      : await q
    clearActingPlan()
    if (error) {
      console.error('approve plan:', error.message)
      return
    }
    void loadPending()
  }

  const returnPlan = async (id: string) => {
    if (!isSupabaseConfigured) return
    setActingPlan(id, 'return')
    const row = planRows.find((r) => r.id === id) ?? null
    /*
     * Same duplicate-row story as approve: returning one row but leaving another `pending` would
     * strand the class — clear **all** plan-stage rows for the pair and reset checklist flags so
     * the student’s next resubmit is clean.
     */
    const { error } = row
      ? await supabase
          .from('patents')
          .update({ status: 'returned', checklist_submitted: false, checklist_approved: false })
          .eq('student_id', row.student_id)
          .eq('tile_id', row.tile_id)
          .eq('stage', 'plan')
      : await supabase
          .from('patents')
          .update({ status: 'returned', checklist_submitted: false, checklist_approved: false })
          .eq('id', id)
    clearActingPlan()
    if (error) {
      console.error('return plan:', error.message)
      return
    }
    void loadPending()
  }

  const approveChecklist = async (id: string) => {
    if (!isSupabaseConfigured) return
    setActingChecklistId(id)
    setActingChecklistKind('approve')
    const row = checklistRows.find((r) => r.id === id) ?? null
    /*
     * Checklist approval must stick even when multiple plan rows exist — update every submitted
     * plan for the student+tile so the UI cannot show “submitted” on one row and “not approved” on another.
     */
    const { error } = row
      ? await supabase
          .from('patents')
          .update({ checklist_approved: true })
          .eq('student_id', row.student_id)
          .eq('tile_id', row.tile_id)
          .eq('stage', 'plan')
          .eq('checklist_submitted', true)
      : await supabase
          .from('patents')
          .update({ checklist_approved: true })
          .eq('id', id)
    setActingChecklistId(null)
    setActingChecklistKind(null)
    if (error) {
      console.error('approve checklist:', error.message)
      return
    }
    void loadPending()
  }

  const returnChecklist = async (id: string) => {
    if (!isSupabaseConfigured) return
    setActingChecklistId(id)
    setActingChecklistKind('return')
    const row = checklistRows.find((r) => r.id === id) ?? null
    const { error } = row
      ? await supabase
          .from('patents')
          .update({ checklist_submitted: false, checklist_approved: false })
          .eq('student_id', row.student_id)
          .eq('tile_id', row.tile_id)
          .eq('stage', 'plan')
      : await supabase
          .from('patents')
          .update({ checklist_submitted: false, checklist_approved: false })
          .eq('id', id)
    setActingChecklistId(null)
    setActingChecklistKind(null)
    if (error) {
      console.error('return checklist:', error.message)
      return
    }
    void loadPending()
  }

  const returnRedemption = async (id: string) => {
    if (!isSupabaseConfigured) return
    setActing({ scope: 'redemption', id, action: 'return' })
    const { error } = await supabase
      .from('redemption_requests')
      .update({ status: 'returned' })
      .eq('id', id)
    clearActing()
    if (error) {
      console.error('return redemption:', error.message)
      return
    }
    void loadPending()
  }

  // ---------------------------------------------------------------------------
  // Row busy helpers — disable approve/return while matching RPC in flight
  // ---------------------------------------------------------------------------
  const isActing = (scope: 'skill' | 'redemption' | 'shopRequest', id: string, action: 'approve' | 'return') =>
    acting?.scope === scope && acting.id === id && acting.action === action

  const busySkill = (id: string) =>
    acting?.scope === 'skill' && acting.id === id ? acting : null
  const busyRedemption = (id: string) =>
    acting?.scope === 'redemption' && acting.id === id ? acting : null
  const busyShopRequest = (id: string) =>
    acting?.scope === 'shopRequest' && acting.id === id ? acting : null

  // ---------------------------------------------------------------------------
  // Student list — all learners (`profiles.role = student`)
  // ---------------------------------------------------------------------------
  const loadStudents = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setStudentsBusy(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, wp, gold, role')
      .eq('role', 'student')
      .is('archived_from_class_at', null)
      .order('display_name', { ascending: true })
    setStudentsBusy(false)
    if (error) {
      console.error('teacher panel students:', error.message)
      setAdminMessage(`Could not load students: ${error.message}`)
      setStudents([])
      return
    }
    const list: StudentSummary[] = (data ?? []).map((p) => ({
      id: p.id as string,
      display_name: (p.display_name as string | null) ?? null,
      wp: (p.wp as number) ?? 0,
      gold: (p.gold as number) ?? 0,
    }))
    setStudents(list)
  }, [])

  useEffect(() => {
    void loadStudents()
  }, [loadStudents])

  const selectedStudent = useMemo(
    () => (selectedStudentId ? students.find((s) => s.id === selectedStudentId) ?? null : null),
    [students, selectedStudentId],
  )

  const archiveStudentFromRoster = async (student: StudentSummary) => {
    if (!isSupabaseConfigured || archivingStudentId) return
    const name = student.display_name?.trim() || `Student (${student.id.slice(0, 8)}…)`
    const ok = window.confirm(
      `Archive ${name} from the student progress list? This keeps their account and history, but hides them from this roster.`,
    )
    if (!ok) return

    setArchivingStudentId(student.id)
    const { error } = await supabase
      .from('profiles')
      .update({ archived_from_class_at: new Date().toISOString() })
      .eq('id', student.id)
      .eq('role', 'student')
    setArchivingStudentId(null)

    if (error) {
      setAdminMessage(`Could not archive student: ${error.message}`)
      return
    }

    setAdminMessage(`${name} was archived from the student progress list.`)
    if (selectedStudentId === student.id) {
      setSelectedStudentId(null)
      setStudentProfile(null)
      setStudentSkills([])
      setStudentInventory([])
      setStudentRedemptions([])
    }
    void loadStudents()
  }

  // ---------------------------------------------------------------------------
  // Student drill-down — profile + skill history + shop rows (tiles joined for labels)
  // ---------------------------------------------------------------------------
  const loadStudentDetail = useCallback(
    async (studentId: string) => {
      if (!isSupabaseConfigured) return
      setAdminMessage(null)
      setStudentsBusy(true)

      const [profRes, skillsRes, invRes, redRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, wp, gold, role')
          .eq('id', studentId)
          .maybeSingle(),
        supabase
          .from('skill_completions')
          .select('id, tile_id, status, wp_awarded, gold_awarded, created_at')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false }),
        supabase
          .from('inventory')
          .select('id, student_id, item_name, item_description, gold_cost, status, created_at')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false }),
        supabase
          .from('redemption_requests')
          .select('id, inventory_id, item_name, status, created_at')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false }),
      ])

      setStudentsBusy(false)

      if (profRes.error) {
        setAdminMessage(`Could not load profile: ${profRes.error.message}`)
        return
      }
      if (skillsRes.error) {
        setAdminMessage(`Could not load skill completions: ${skillsRes.error.message}`)
        return
      }
      if (invRes.error) {
        setAdminMessage(`Could not load inventory: ${invRes.error.message}`)
        return
      }
      if (redRes.error) {
        setAdminMessage(`Could not load redemption requests: ${redRes.error.message}`)
        return
      }

      const p = profRes.data
      setStudentProfile(
        p
          ? {
              id: p.id as string,
              display_name: (p.display_name as string | null) ?? null,
              wp: (p.wp as number) ?? 0,
              gold: (p.gold as number) ?? 0,
            }
          : null,
      )

      let inventoryRows = (invRes.data ?? []) as StudentInventoryRow[]
      const selectedDisplayName = ((p?.display_name as string | null) ?? '').trim()
      if (inventoryRows.length === 0 && selectedDisplayName) {
        /*
         * Teacher "Preview as student" uses the teacher's own auth profile, so test
         * purchases can land on a same-name teacher profile instead of the roster
         * student row. Surface those rows here and label them rather than hiding
         * what the teacher just tested.
         */
        const { data: sameNameProfiles, error: sameNameError } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('display_name', selectedDisplayName)

        if (sameNameError) {
          setAdminMessage(`Could not check matching profiles for inventory: ${sameNameError.message}`)
          return
        }

        const ownerRoleById = new Map<string, string | null>()
        const relatedIds = (sameNameProfiles ?? [])
          .map((profileRow) => {
            const id = profileRow.id as string
            ownerRoleById.set(id, (profileRow.role as string | null) ?? null)
            return id
          })
          .filter((id) => id !== studentId)

        if (relatedIds.length > 0) {
          const { data: fallbackInventory, error: fallbackInventoryError } = await supabase
            .from('inventory')
            .select('id, student_id, item_name, item_description, gold_cost, status, created_at')
            .in('student_id', relatedIds)
            .order('created_at', { ascending: false })

          if (fallbackInventoryError) {
            setAdminMessage(`Could not load matching profile inventory: ${fallbackInventoryError.message}`)
            return
          }

          inventoryRows = ((fallbackInventory ?? []) as StudentInventoryRow[]).map((row) => ({
            ...row,
            owner_role: ownerRoleById.get(row.student_id) ?? null,
          }))
        }
      }

      const skillList = skillsRes.data ?? []
      const tileIds = [...new Set(skillList.map((r) => r.tile_id as string))]
      const tileById = new Map<string, { guild: string; skill_name: string }>()
      if (tileIds.length) {
        const { data: tiles, error: tErr } = await supabase
          .from('tiles')
          .select('id, guild, skill_name')
          .in('id', tileIds)
        if (tErr) {
          setAdminMessage(`Could not load tiles: ${tErr.message}`)
          return
        }
        for (const t of tiles ?? []) {
          tileById.set(t.id as string, {
            guild: t.guild as string,
            skill_name: t.skill_name as string,
          })
        }
      }

      setStudentSkills(
        skillList.map((r) => ({
          id: r.id as string,
          tile_id: r.tile_id as string,
          status: r.status as string,
          wp_awarded: (r.wp_awarded as number | null) ?? null,
          gold_awarded: (r.gold_awarded as number | null) ?? null,
          created_at: r.created_at as string,
          tile: tileById.get(r.tile_id as string) ?? null,
        })),
      )
      setStudentInventory(inventoryRows)
      setStudentRedemptions((redRes.data ?? []) as StudentRedemptionRow[])
    },
    [],
  )

  const awardSelectedStudent = async () => {
    /*
     * Testing helper: adjust the selected roster student's economy totals without
     * creating skill completions. This is intentionally direct so shop/progression
     * flows can be tested without fabricating quest history.
     */
    if (!isSupabaseConfigured || !selectedStudentId || awardingStudentId) return
    const wpAmount = Math.max(0, Math.floor(Number(awardWpAmount) || 0))
    const goldAmount = Math.max(0, Math.floor(Number(awardGoldAmount) || 0))
    if (wpAmount === 0 && goldAmount === 0) {
      setAdminMessage('Enter WP or gold to add.')
      return
    }

    const current = studentProfile ?? selectedStudent
    const currentWp = current?.wp ?? 0
    const currentGold = current?.gold ?? 0
    const nextWp = currentWp + wpAmount
    const nextGold = currentGold + goldAmount

    setAwardingStudentId(selectedStudentId)
    const { data, error } = await supabase
      .from('profiles')
      .update({ wp: nextWp, gold: nextGold })
      .eq('id', selectedStudentId)
      .eq('role', 'student')
      .select('id, display_name, wp, gold')
      .maybeSingle()
    setAwardingStudentId(null)

    if (error) {
      setAdminMessage(`Could not award student: ${error.message}`)
      return
    }
    if (!data) {
      setAdminMessage('Could not award student: no student profile was updated.')
      return
    }

    const updated: StudentSummary = {
      id: data.id as string,
      display_name: (data.display_name as string | null) ?? null,
      wp: (data.wp as number) ?? 0,
      gold: (data.gold as number) ?? 0,
    }
    setStudentProfile(updated)
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    setAwardWpAmount('')
    setAwardGoldAmount('')

    const parts = [
      wpAmount > 0 ? `${wpAmount} WP` : '',
      goldAmount > 0 ? `${goldAmount} gold` : '',
    ].filter(Boolean)
    const name = updated.display_name?.trim() || `Student (${updated.id.slice(0, 8)}…)`
    setAdminMessage(`Added ${parts.join(' and ')} to ${name}.`)
  }

  const awardPreviewProfile = async () => {
    /*
     * Preview mode does not impersonate a roster student; it browses student pages
     * through the signed-in teacher profile. This separate control funds that
     * preview profile so Supply and WP flows can be tested as the teacher.
     */
    if (!isSupabaseConfigured || !profile?.id || previewAwarding) return
    const wpAmount = Math.max(0, Math.floor(Number(previewAwardWpAmount) || 0))
    const goldAmount = Math.max(0, Math.floor(Number(previewAwardGoldAmount) || 0))
    if (wpAmount === 0 && goldAmount === 0) {
      setAdminMessage('Enter WP or gold to add to student preview.')
      return
    }

    const nextWp = (profile.wp ?? 0) + wpAmount
    const nextGold = (profile.gold ?? 0) + goldAmount
    setPreviewAwarding(true)
    const { error } = await supabase
      .from('profiles')
      .update({ wp: nextWp, gold: nextGold })
      .eq('id', profile.id)
      .eq('role', 'teacher')
    setPreviewAwarding(false)

    if (error) {
      setAdminMessage(`Could not update student preview balance: ${error.message}`)
      return
    }

    setPreviewAwardWpAmount('')
    setPreviewAwardGoldAmount('')
    await refreshProfile()

    const parts = [
      wpAmount > 0 ? `${wpAmount} WP` : '',
      goldAmount > 0 ? `${goldAmount} gold` : '',
    ].filter(Boolean)
    setAdminMessage(`Added ${parts.join(' and ')} to student preview.`)
  }

  const clearPreviewProfile = async () => {
    /*
     * Preview purchases and quest tests are saved against the teacher profile because
     * preview mode uses the teacher's active session. This clears only that preview
     * data, not any roster student's real progress.
     */
    if (!isSupabaseConfigured || !profile?.id || previewClearing) return
    const ok = window.confirm(
      'Clear all preview-as-student data for your teacher profile? This resets preview WP/gold and removes preview Kit, purchases, requests, patents, and completions. Real student roster data is not touched.',
    )
    if (!ok) return

    setPreviewClearing(true)
    setAdminMessage(null)
    const previewId = profile.id

    const deletes: Array<[string, () => Promise<{ error: any }>]> = [
      ['redemption_requests', async () => await supabase.from('redemption_requests').delete().eq('student_id', previewId)],
      ['inventory', async () => await supabase.from('inventory').delete().eq('student_id', previewId)],
      ['gold_purchases', async () => await supabase.from('gold_purchases').delete().eq('student_id', previewId)],
      [
        'shop_purchase_requests',
        async () => await supabase.from('shop_purchase_requests').delete().eq('student_id', previewId),
      ],
      ['skill_completions', async () => await supabase.from('skill_completions').delete().eq('student_id', previewId)],
      ['patents', async () => await supabase.from('patents').delete().eq('student_id', previewId)],
    ]

    for (const [label, run] of deletes) {
      const { error } = await run()
      if (error) {
        setPreviewClearing(false)
        setAdminMessage(`Could not clear preview ${label}: ${error.message ?? String(error)}`)
        return
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ wp: 0, gold: 0 })
      .eq('id', previewId)
      .eq('role', 'teacher')

    setPreviewClearing(false)
    if (error) {
      setAdminMessage(`Preview rows cleared, but balance reset failed: ${error.message}`)
      return
    }

    setPreviewAwardWpAmount('')
    setPreviewAwardGoldAmount('')
    await refreshProfile()
    void loadPending()
    setAdminMessage('Student preview data cleared. Preview WP and gold are back to 0.')
  }

  // ---------------------------------------------------------------------------
  // Admin — reverse an approved completion (RPC + optional WP/gold penalty %)
  // ---------------------------------------------------------------------------
  const resetCompletion = async (row: StudentSkillCompletion) => {
    if (!isSupabaseConfigured || resettingCompletionId) return
    const wp = row.wp_awarded ?? 0
    const gold = row.gold_awarded ?? 0
    const pen = Math.max(
      0,
      Math.min(100, penaltyByCompletionId.get(row.id) ?? 0),
    )
    const wpPen = Math.floor((wp * pen) / 100)
    const goldPen = Math.floor((gold * pen) / 100)
    const wpTotal = wp + wpPen
    const goldTotal = gold + goldPen

    const message =
      `This will remove ${wp} WP and ${gold} gold for this completion. ` +
      `Penalty of ${pen}% applied — additional ${wpPen} WP and ${goldPen} gold deducted. ` +
      `Total deduction: ${wpTotal} WP and ${goldTotal} gold. ` +
      `This cannot be undone. Confirm?`

    if (!window.confirm(message)) return

    setResettingCompletionId(row.id)
    const { data, error } = await supabase.rpc('teacher_reset_skill_completion', {
      p_completion_id: row.id,
      p_penalty_percent: pen,
    })
    setResettingCompletionId(null)
    if (error) {
      setAdminMessage(`Reset failed: ${error.message}`)
      return
    }
    const res = data as { ok?: boolean; error?: string }
    if (!res?.ok) {
      setAdminMessage(`Reset failed: ${res?.error ?? 'unknown error'}`)
      return
    }
    setAdminMessage(`Reset complete. Deducted ${wpTotal} WP and ${goldTotal} gold.`)
    if (selectedStudentId) {
      void loadStudentDetail(selectedStudentId)
    }
    void loadStudents()
    void loadPending()
  }

  // ---------------------------------------------------------------------------
  // Render — chrome, banners, four approval panels, student inspector
  // ---------------------------------------------------------------------------
  return (
    <div className="app-shell bench-chrome teacher-panel-page">
      {/* ---------- Header + teacher nav ---------- */}
      <header className="teacher-panel-header">
        <MainNav variant="teacher" />
        <div className="teacher-panel-top-row">
          <div>
            <h1 className="teacher-panel-title bench-page-title">Teacher panel</h1>
          </div>
          <div className="teacher-panel-top-actions">
            <TeacherSubmissionAlertToggle />
            <button type="button" className="btn-secondary" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ---------- Inline feedback (admin RPC errors, new submissions pulse) ---------- */}
      {adminMessage ? (
        <p className="muted" role="status">
          {adminMessage}
        </p>
      ) : null}

      {loadError ? (
        <p className="error" role="alert">
          Could not load pending requests: {loadError}
        </p>
      ) : null}

      {loading ? (
        <p className="muted">Loading pending requests…</p>
      ) : loadError ? null : (
        <>
          {/* ========== Pending queues (plans → shop), then preview balance beneath ========== */}
          <div className="teacher-panel-approvals-grid teacher-panel-approvals-grid--dense">
          <section className="teacher-panel-approval-box" aria-labelledby="teacher-panel-plans-heading">
            <h2 id="teacher-panel-plans-heading" className="teacher-panel-section-title">
              Plan approvals
            </h2>
            {planRows.length === 0 ? (
              <p className="muted teacher-panel-section-empty">No pending plans.</p>
            ) : (
              <ul className="teacher-panel-list">
                {planRows.map((row) => {
                  const studentName =
                    row.display_name?.trim() || `Student (${row.student_id.slice(0, 8)}…)`
                  const busyApprove = actingPlanId === row.id && actingPlanKind === 'approve'
                  const busyReturn = actingPlanId === row.id && actingPlanKind === 'return'
                  const busy = busyApprove || busyReturn
                  return (
                    <li key={row.id} className="card teacher-panel-item">
                      <div className="teacher-panel-item-main">
                        <p className="teacher-panel-student">{studentName}</p>
                        <p className="teacher-panel-skill">
                          <strong>{row.tile?.skill_name ?? 'Plan'}</strong>
                        </p>
                        <p className="muted teacher-panel-guild">
                          Plan approval · {row.tile?.guild ? <strong>{row.tile.guild}</strong> : null}
                        </p>
                        <div className="teacher-panel-patent">
                          <p className="teacher-panel-patent-title">
                            <strong>What are they going to make?</strong>
                          </p>
                          <p className="muted" style={{ margin: 0 }}>
                            {row.patent?.field_1}
                          </p>
                          <EmpathyDisplay raw={row.patent?.field_2 ?? null} />
                        </div>
                      </div>
                      <div className="teacher-panel-actions">
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={busy}
                          onClick={() => void approvePlan(row.id)}
                        >
                          {busyApprove ? 'Approving…' : 'Approve plan'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={busy}
                          onClick={() => void returnPlan(row.id)}
                        >
                          {busyReturn ? 'Returning…' : 'Return'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="teacher-panel-approval-box" aria-labelledby="teacher-panel-checklists-heading">
            <h2 id="teacher-panel-checklists-heading" className="teacher-panel-section-title">
              Checklist approvals
            </h2>
            {checklistRows.length === 0 ? (
              <p className="muted teacher-panel-section-empty">No pending checklist reviews.</p>
            ) : (
              <ul className="teacher-panel-list">
                {checklistRows.map((row) => {
                  const studentName =
                    row.display_name?.trim() || `Student (${row.student_id.slice(0, 8)}…)`
                  const busyApprove = actingChecklistId === row.id && actingChecklistKind === 'approve'
                  const busyReturn = actingChecklistId === row.id && actingChecklistKind === 'return'
                  const busy = busyApprove || busyReturn
                  const uploadUrl = row.upload_url
                  const isVideo = uploadUrl
                    ? /\.(mp4|webm|mov|avi|m4v)$/i.test(uploadUrl)
                    : false

                  return (
                    <li key={row.id} className="card teacher-panel-item">
                      <div className="teacher-panel-item-main">
                        <p className="teacher-panel-student">{studentName}</p>
                        <p className="teacher-panel-skill">
                          <strong>{row.tile?.skill_name ?? 'Checklist'}</strong>
                        </p>
                        <p className="muted teacher-panel-guild">
                          Checklist review · {row.tile?.guild ? <strong>{row.tile.guild}</strong> : null}
                        </p>
                        {uploadUrl ? (
                          <div style={{ marginTop: '0.65rem' }}>
                            <p style={{ margin: '0 0 0.35rem', fontSize: '0.9rem' }}>
                              <strong>Submitted photo / video:</strong>
                            </p>
                            {isVideo ? (
                              <video
                                src={uploadUrl}
                                controls
                                style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', display: 'block' }}
                              />
                            ) : (
                              <img
                                src={uploadUrl}
                                alt="Student's uploaded work"
                                style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', objectFit: 'contain', display: 'block' }}
                              />
                            )}
                          </div>
                        ) : (
                          <p className="muted" style={{ marginTop: '0.35rem', fontSize: '0.9rem' }}>
                            No photo or video uploaded yet.
                          </p>
                        )}
                      </div>
                      <div className="teacher-panel-actions">
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={busy}
                          onClick={() => void approveChecklist(row.id)}
                        >
                          {busyApprove ? 'Approving…' : 'Approve checklist'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={busy}
                          onClick={() => void returnChecklist(row.id)}
                        >
                          {busyReturn ? 'Returning…' : 'Return'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="teacher-panel-approval-box" aria-labelledby="teacher-panel-skills-heading">
            <h2 id="teacher-panel-skills-heading" className="teacher-panel-section-title">
              Skill completions
            </h2>
            {skillRows.length === 0 ? (
              <p className="muted teacher-panel-section-empty">No pending skill completions.</p>
            ) : (
              <ul className="teacher-panel-list">
                {skillRows.map((row) => {
                  const t = row.tile
                  const studentName =
                    row.display_name?.trim() ||
                    `Student (${row.student_id.slice(0, 8)}…)`
                  const b = busySkill(row.id)
                  const busy = Boolean(b)

                  return (
                    <li key={row.id} className="card teacher-panel-item">
                      <div className="teacher-panel-item-main">
                        <p className="teacher-panel-student">{studentName}</p>
                        <p className="teacher-panel-skill">
                          <strong>{t?.skill_name ?? 'Unknown skill'}</strong>
                        </p>
                        <p className="muted teacher-panel-guild">
                          Guild: <strong>{t?.guild ?? '—'}</strong>
                          {t?.wp_value != null ? (
                            <>
                              {' '}
                              · {t.wp_display ?? `${t.wp_value} WP`} and {t.gold_display ?? `${t.gold_value ?? 10} gold`} on approval
                            </>
                          ) : null}
                        </p>
                        {row.patent ? (
                          <div className="teacher-panel-patent">
                            <p className="teacher-panel-patent-title">
                              <strong>Patent packet</strong>
                            </p>
                            <dl className="teacher-panel-patent-dl">
                              <div>
                                <dt>What did they make?</dt>
                                <dd>{row.patent.field_1}</dd>
                              </div>
                            </dl>
                            <EmpathyDisplay raw={row.patent.field_2} />
                            <dl className="teacher-panel-patent-dl">
                              <div>
                                <dt>How did they make it an original work?</dt>
                                <dd>{row.patent.field_3}</dd>
                              </div>
                              <div>
                                <dt>What do they have to iterate?</dt>
                                <dd>{row.patent.field_4}</dd>
                              </div>
                            </dl>
                          </div>
                        ) : null}
                      </div>
                      <div className="teacher-panel-actions">
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={busy}
                          onClick={() => void approveSkill(row.id)}
                        >
                          {isActing('skill', row.id, 'approve') ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={busy}
                          onClick={() => void returnSkill(row.id)}
                        >
                          {isActing('skill', row.id, 'return') ? 'Returning…' : 'Return'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section
            className="teacher-panel-approval-box"
            aria-labelledby="teacher-panel-redemptions-heading"
          >
            <h2 id="teacher-panel-redemptions-heading" className="teacher-panel-section-title">
              Pending redemptions
            </h2>
            {redemptionRows.length === 0 ? (
              <p className="muted teacher-panel-section-empty">No pending redemptions.</p>
            ) : (
              <ul className="teacher-panel-list">
                {redemptionRows.map((row) => {
                  const studentName =
                    row.display_name?.trim() ||
                    `Student (${row.student_id.slice(0, 8)}…)`
                  const b = busyRedemption(row.id)
                  const busy = Boolean(b)

                  return (
                    <li key={row.id} className="card teacher-panel-item">
                      <div className="teacher-panel-item-main">
                        <p className="teacher-panel-student">{studentName}</p>
                        <p className="teacher-panel-skill">
                          <strong>{row.item_name}</strong>
                        </p>
                        <p className="muted teacher-panel-guild">Inventory redemption</p>
                      </div>
                      <div className="teacher-panel-actions">
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={busy}
                          onClick={() => void approveRedemption(row.id)}
                        >
                          {isActing('redemption', row.id, 'approve') ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={busy}
                          onClick={() => void returnRedemption(row.id)}
                        >
                          {isActing('redemption', row.id, 'return') ? 'Returning…' : 'Return'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
          <section
            className="teacher-panel-approval-box"
            aria-labelledby="teacher-panel-shop-requests-heading"
          >
            <h2 id="teacher-panel-shop-requests-heading" className="teacher-panel-section-title">
              Shop purchase requests
            </h2>
            {shopRequestRows.length === 0 ? (
              <p className="muted teacher-panel-section-empty">No pending shop requests.</p>
            ) : (
              <ul className="teacher-panel-list">
                {shopRequestRows.map((row) => {
                  const studentName =
                    row.display_name?.trim() ||
                    `Student (${row.student_id.slice(0, 8)}…)`
                  const b = busyShopRequest(row.id)
                  const busy = Boolean(b)

                  return (
                    <li key={row.id} className="card teacher-panel-item">
                      <div className="teacher-panel-item-main">
                        <p className="teacher-panel-student">{studentName}</p>
                        <p className="teacher-panel-skill">
                          <strong>{row.item_name}</strong>
                        </p>
                        <p className="muted teacher-panel-guild">
                          {row.requested_grams != null ? `${row.requested_grams}g · ` : ''}
                          {row.calculated_gold_cost} gold on approval
                        </p>
                        {row.notes ? <p className="muted teacher-panel-guild">{row.notes}</p> : null}
                      </div>
                      <div className="teacher-panel-actions">
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={busy}
                          onClick={() => void approveShopRequest(row.id)}
                        >
                          {isActing('shopRequest', row.id, 'approve') ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={busy}
                          onClick={() => void returnShopRequest(row.id)}
                        >
                          {isActing('shopRequest', row.id, 'return') ? 'Rejecting…' : 'Reject'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
          </div>{/* end pending queues grid */}

          <TeacherStorylineWidget enabled={isSupabaseConfigured} />

          {/* Preview balance after queues — keep approval work above testing tools. */}
          <section
            className="teacher-panel-section teacher-panel-section--preview-balance"
            aria-labelledby="teacher-panel-preview-awards-heading"
          >
            <div className="card teacher-panel-student-block teacher-panel-award-card">
              <h2 id="teacher-panel-preview-awards-heading" className="teacher-panel-section-title">
                Student preview balance
              </h2>
              <p className="muted teacher-panel-award-note">
                Preview as student uses your teacher profile. Add WP or gold here to test Supply and progression in preview mode.
              </p>
              <dl className="teacher-panel-preview-balance">
                <div>
                  <dt>Preview WP</dt>
                  <dd>{profile?.wp ?? 0}</dd>
                </div>
                <div>
                  <dt>Preview gold</dt>
                  <dd>{profile?.gold ?? 0}</dd>
                </div>
              </dl>
              <form
                className="teacher-panel-award-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  void awardPreviewProfile()
                }}
              >
                <label className="teacher-panel-award-field">
                  <span>WP to add</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={previewAwardWpAmount}
                    onChange={(e) => setPreviewAwardWpAmount(e.target.value)}
                    disabled={previewAwarding || previewClearing}
                  />
                </label>
                <label className="teacher-panel-award-field">
                  <span>Gold to add</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={previewAwardGoldAmount}
                    onChange={(e) => setPreviewAwardGoldAmount(e.target.value)}
                    disabled={previewAwarding || previewClearing}
                  />
                </label>
                <button type="submit" className="btn-secondary" disabled={previewAwarding || previewClearing}>
                  {previewAwarding ? 'Adding…' : 'Add to preview'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ color: '#b91c1c' }}
                  disabled={previewAwarding || previewClearing || !isSupabaseConfigured}
                  onClick={() => void clearPreviewProfile()}
                >
                  {previewClearing ? 'Clearing…' : 'Clear preview data'}
                </button>
              </form>
            </div>
          </section>

          {/* ========== Roster + drill-down (hidden by default — privacy if kids glimpse this page) ========== */}
          <section className="teacher-panel-section" aria-labelledby="teacher-panel-progress-heading">
            <div className="teacher-panel-progress-toggle-row">
              <h2 id="teacher-panel-progress-heading" className="teacher-panel-section-title">
                Student progress
              </h2>
              <button
                type="button"
                className="btn-secondary teacher-panel-progress-toggle"
                aria-expanded={showStudentProgress}
                aria-controls="teacher-panel-progress-panel"
                onClick={() => {
                  setShowStudentProgress((open) => {
                    if (open) {
                      setSelectedStudentId(null)
                      setStudentProfile(null)
                      setStudentSkills([])
                      setStudentInventory([])
                      setStudentRedemptions([])
                    }
                    return !open
                  })
                }}
              >
                {showStudentProgress ? 'Hide student progress' : 'Show student progress'}
              </button>
            </div>

            {showStudentProgress ? (
              <div id="teacher-panel-progress-panel">
                {selectedStudentId ? (
                  <div className="teacher-panel-student-detail">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedStudentId(null)
                    setStudentProfile(null)
                    setStudentSkills([])
                    setStudentInventory([])
                    setStudentRedemptions([])
                  }}
                >
                  ← Back to students
                </button>

                <div className="card teacher-panel-student-profile">
                  <h3 className="teacher-panel-subheading">Profile</h3>
                  <dl className="teacher-panel-kv">
                    <div>
                      <dt>Name</dt>
                      <dd>{studentProfile?.display_name?.trim() || selectedStudent?.display_name?.trim() || selectedStudentId}</dd>
                    </div>
                    <div>
                      <dt>WP</dt>
                      <dd>{studentProfile?.wp ?? selectedStudent?.wp ?? 0}</dd>
                    </div>
                    <div>
                      <dt>Gold</dt>
                      <dd>{studentProfile?.gold ?? selectedStudent?.gold ?? 0}</dd>
                    </div>
                  </dl>
                </div>

                <div className="card teacher-panel-student-block teacher-panel-award-card">
                  <h3 className="teacher-panel-subheading">Testing awards</h3>
                  <p className="muted teacher-panel-award-note">
                    Add WP or gold directly to this student for testing shop and progression flows.
                  </p>
                  <form
                    className="teacher-panel-award-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void awardSelectedStudent()
                    }}
                  >
                    <label className="teacher-panel-award-field">
                      <span>WP to add</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={awardWpAmount}
                        onChange={(e) => setAwardWpAmount(e.target.value)}
                        disabled={awardingStudentId === selectedStudentId}
                      />
                    </label>
                    <label className="teacher-panel-award-field">
                      <span>Gold to add</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={awardGoldAmount}
                        onChange={(e) => setAwardGoldAmount(e.target.value)}
                        disabled={awardingStudentId === selectedStudentId}
                      />
                    </label>
                    <button
                      type="submit"
                      className="btn-secondary"
                      disabled={awardingStudentId === selectedStudentId}
                    >
                      {awardingStudentId === selectedStudentId ? 'Adding…' : 'Add to student'}
                    </button>
                  </form>
                </div>

                <div className="card teacher-panel-student-block">
                  <h3 className="teacher-panel-subheading">Skill completions</h3>
                  {studentsBusy ? (
                    <p className="muted">Loading…</p>
                  ) : studentSkills.length === 0 ? (
                    <p className="muted">No skill completions.</p>
                  ) : (
                    <ul className="teacher-panel-mini-list">
                      {studentSkills.map((r) => {
                        const penalty = penaltyByCompletionId.get(r.id) ?? 0
                        const canReset = r.status === 'approved'
                        const missingAwards = r.wp_awarded == null || r.gold_awarded == null
                        const busy = resettingCompletionId === r.id

                        return (
                          <li key={r.id} className="teacher-panel-mini-row teacher-panel-mini-row--reset">
                            <div className="teacher-panel-mini-main">
                              <span className="teacher-panel-mini-title">
                                {r.tile?.skill_name ?? 'Unknown skill'}
                              </span>
                              <span className="teacher-panel-mini-meta muted">
                                {r.tile?.guild ? `${r.tile.guild} · ` : ''}
                                {r.status}
                                {r.wp_awarded != null && r.gold_awarded != null ? (
                                  <>
                                    {' '}
                                    · awarded {r.wp_awarded} WP / {r.gold_awarded} gold
                                  </>
                                ) : null}
                              </span>
                              {canReset && missingAwards ? (
                                <span className="muted teacher-panel-mini-warn">
                                  Missing awarded amounts — apply migration 014.
                                </span>
                              ) : null}
                            </div>
                            <div className="teacher-panel-mini-actions">
                              <label className="teacher-panel-penalty">
                                Penalty
                                <div className="teacher-panel-penalty-input">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={penalty}
                                    onChange={(e) => {
                                      const n = Number(e.target.value)
                                      const v = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0
                                      setPenaltyByCompletionId((prev) => {
                                        const next = new Map(prev)
                                        next.set(r.id, v)
                                        return next
                                      })
                                    }}
                                    disabled={!canReset || busy}
                                  />
                                  <span className="muted">%</span>
                                </div>
                              </label>
                              <button
                                type="button"
                                className="btn-secondary"
                                disabled={!canReset || missingAwards || busy}
                                onClick={() => void resetCompletion(r)}
                              >
                                {busy ? 'Resetting…' : 'Reset'}
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                <div className="card teacher-panel-student-block">
                  <h3 className="teacher-panel-subheading">Inventory</h3>
                  {studentsBusy ? (
                    <p className="muted">Loading…</p>
                  ) : studentInventory.length === 0 ? (
                    <p className="muted">No inventory items.</p>
                  ) : (
                    <ul className="teacher-panel-mini-list">
                      {studentInventory.map((r) => (
                        <li key={r.id} className="teacher-panel-mini-row">
                          <span className="teacher-panel-mini-title">{r.item_name}</span>
                          <span className="teacher-panel-mini-meta muted">
                            {r.status} · {r.gold_cost} gold
                            {r.student_id !== selectedStudentId ? (
                              <> · saved under {r.owner_role === 'teacher' ? 'teacher preview' : 'matching'} profile</>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="card teacher-panel-student-block">
                  <h3 className="teacher-panel-subheading">Redemption requests</h3>
                  {studentsBusy ? (
                    <p className="muted">Loading…</p>
                  ) : studentRedemptions.length === 0 ? (
                    <p className="muted">No redemption requests.</p>
                  ) : (
                    <ul className="teacher-panel-mini-list">
                      {studentRedemptions.map((r) => (
                        <li key={r.id} className="teacher-panel-mini-row">
                          <span className="teacher-panel-mini-title">{r.item_name}</span>
                          <span className="teacher-panel-mini-meta muted">{r.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
                ) : (
              studentsBusy ? (
                <p className="muted">Loading students…</p>
              ) : students.length === 0 ? (
                <p className="muted">No students found.</p>
              ) : (
                <ul className="teacher-panel-students">
                  {students.map((s) => {
                    const name = s.display_name?.trim() || `Student (${s.id.slice(0, 8)}…)`
                    const archiving = archivingStudentId === s.id
                    return (
                      <li key={s.id}>
                        <div className="teacher-panel-student-roster-row">
                          <button
                            type="button"
                            className="teacher-panel-student-row"
                            onClick={() => {
                              setSelectedStudentId(s.id)
                              void loadStudentDetail(s.id)
                            }}
                          >
                            <span className="teacher-panel-student-row-name">{name}</span>
                            <span className="teacher-panel-student-row-meta muted">
                              {s.wp} WP · {s.gold} gold
                            </span>
                          </button>
                          <button
                            type="button"
                            className="btn-secondary teacher-panel-archive-student"
                            disabled={Boolean(archivingStudentId)}
                            onClick={() => void archiveStudentFromRoster(s)}
                          >
                            {archiving ? 'Archiving…' : 'Archive'}
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )
                )}
              </div>
            ) : (
              <p className="muted teacher-panel-progress-hidden-note">
                Roster is hidden until you open it.
              </p>
            )}
          </section>
        </>
      )}

    </div>
  )
}
