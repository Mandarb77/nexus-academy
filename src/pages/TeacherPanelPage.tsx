import { useCallback, useEffect, useMemo, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { parseEmpathy } from '../lib/empathy'

type TileInfo = {
  guild: string
  skill_name: string
  wp_value: number
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
}

type PendingRedemptionRow = {
  id: string
  student_id: string
  inventory_id: string
  item_name: string
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
  rank: string | null
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
  | null

function EmpathyDisplay({ raw }: { raw: string | null | undefined }) {
  const e = parseEmpathy(raw)
  const hasContent = e.who || e.why || e.what_changed || e.how_learned.length > 0
  if (!hasContent) return null
  return (
    <div style={{ margin: '0.65rem 0', padding: '0.65rem 0.85rem', background: 'rgba(99,102,241,0.06)', borderLeft: '3px solid rgba(99,102,241,0.4)', borderRadius: '4px', fontSize: '0.88rem' }}>
      <p style={{ margin: '0 0 0.2rem', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>Empathy</p>
      {e.who ? <p style={{ margin: '0.15rem 0' }}><strong>Who:</strong> {e.who}</p> : null}
      {e.why ? <p style={{ margin: '0.15rem 0' }}><strong>Why it matters:</strong> {e.why}</p> : null}
      {e.what_changed ? <p style={{ margin: '0.15rem 0' }}><strong>Changed their design because:</strong> {e.what_changed}</p> : null}
      {e.how_learned.length > 0 ? (
        <p style={{ margin: '0.15rem 0' }}><strong>How they learned:</strong> {e.how_learned.join(' · ')}</p>
      ) : null}
    </div>
  )
}

export function TeacherPanelPage() {
  const { signOut } = useAuth()
  const [skillRows, setSkillRows] = useState<PendingSkillRow[]>([])
  const [redemptionRows, setRedemptionRows] = useState<PendingRedemptionRow[]>([])
  const [planRows, setPlanRows] = useState<PendingPlanRow[]>([])
  const [checklistRows, setChecklistRows] = useState<PendingChecklistRow[]>([])
  const [students, setStudents] = useState<StudentSummary[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [studentProfile, setStudentProfile] = useState<StudentSummary | null>(null)
  const [studentSkills, setStudentSkills] = useState<StudentSkillCompletion[]>([])
  const [studentInventory, setStudentInventory] = useState<StudentInventoryRow[]>([])
  const [studentRedemptions, setStudentRedemptions] = useState<StudentRedemptionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [adminMessage, setAdminMessage] = useState<string | null>(null)
  const [acting, setActing] = useState<Acting>(null)
  const [actingPlanId, setActingPlanId] = useState<string | null>(null)
  const [actingPlanKind, setActingPlanKind] = useState<'approve' | 'return' | null>(null)
  const [actingChecklistId, setActingChecklistId] = useState<string | null>(null)
  const [actingChecklistKind, setActingChecklistKind] = useState<'approve' | 'return' | null>(null)
  const [studentsBusy, setStudentsBusy] = useState(false)
  const [penaltyByCompletionId, setPenaltyByCompletionId] = useState<Map<string, number>>(
    () => new Map(),
  )
  const [resettingCompletionId, setResettingCompletionId] = useState<string | null>(null)

  const loadPending = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setSkillRows([])
      setRedemptionRows([])
      setLoadError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)

    const [compRes, redRes, planRes, checklistRes] = await Promise.all([
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
    const plans = planRes.data ?? []
    const checklists = checklistRes.data ?? []

    const studentIds = [
      ...new Set([
        ...completions.map((r) => r.student_id as string),
        ...redemptions.map((r) => r.student_id as string),
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
        .select('id, guild, skill_name, wp_value')
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
        .select('id, field_1, field_2, field_3, field_4')
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

    setLoading(false)
  }, [])

  useEffect(() => {
    void loadPending()
  }, [loadPending])

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
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [loadPending])

  const clearActing = () => setActing(null)

  const approveSkill = async (id: string) => {
    if (!isSupabaseConfigured) return
    setActing({ scope: 'skill', id, action: 'approve' })
    const { error } = await supabase
      .from('skill_completions')
      .update({ status: 'approved' })
      .eq('id', id)
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
    const { error } = await supabase.from('patents').update({ status: 'approved' }).eq('id', id)
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
    const { error } = await supabase
      .from('patents')
      .update({ status: 'returned', checklist_submitted: false })
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
    const { error } = await supabase
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
    const { error } = await supabase
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

  const isActing = (scope: 'skill' | 'redemption', id: string, action: 'approve' | 'return') =>
    acting?.scope === scope && acting.id === id && acting.action === action

  const busySkill = (id: string) =>
    acting?.scope === 'skill' && acting.id === id ? acting : null
  const busyRedemption = (id: string) =>
    acting?.scope === 'redemption' && acting.id === id ? acting : null

  const loadStudents = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setStudentsBusy(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, wp, gold, rank, role')
      .eq('role', 'student')
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
      rank: (p.rank as string | null) ?? null,
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

  const loadStudentDetail = useCallback(
    async (studentId: string) => {
      if (!isSupabaseConfigured) return
      setAdminMessage(null)
      setStudentsBusy(true)

      const [profRes, skillsRes, invRes, redRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, wp, gold, rank, role')
          .eq('id', studentId)
          .maybeSingle(),
        supabase
          .from('skill_completions')
          .select('id, tile_id, status, wp_awarded, gold_awarded, created_at')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false }),
        supabase
          .from('inventory')
          .select('id, item_name, item_description, gold_cost, status, created_at')
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
              rank: (p.rank as string | null) ?? null,
            }
          : null,
      )

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
      setStudentInventory((invRes.data ?? []) as StudentInventoryRow[])
      setStudentRedemptions((redRes.data ?? []) as StudentRedemptionRow[])
    },
    [],
  )

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

  return (
    <div className="app-shell teacher-panel-page">
      <header className="teacher-panel-header">
        <MainNav variant="teacher" />
        <div className="teacher-panel-top-row">
          <div>
            <h1 className="teacher-panel-title">Teacher panel</h1>
            <p className="muted teacher-panel-subtitle">
              Review pending skill completions and inventory redemptions. Approve a skill to award WP
              and gold; return sends it back for resubmit. Approve a redemption when the student has
              used their shop item; return if they need to try again.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </header>

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
          <div className="teacher-panel-approvals-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <section className="teacher-panel-approval-box" aria-labelledby="teacher-panel-plans-heading" style={{ border: '1px solid rgba(128,128,128,0.3)', borderRadius: '12px', padding: '1rem' }}>
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

          <section className="teacher-panel-approval-box" aria-labelledby="teacher-panel-checklists-heading" style={{ border: '1px solid rgba(128,128,128,0.3)', borderRadius: '12px', padding: '1rem' }}>
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
          </div>{/* end approval grid */}

          <div className="teacher-panel-approvals-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <section className="teacher-panel-approval-box" aria-labelledby="teacher-panel-skills-heading" style={{ border: '1px solid rgba(128,128,128,0.3)', borderRadius: '12px', padding: '1rem' }}>
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
                              · {t.wp_value} WP and 10 gold on approval
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
            style={{ border: '1px solid rgba(128,128,128,0.3)', borderRadius: '12px', padding: '1rem' }}
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
          </div>{/* end approvals grid row 2 */}

          <section className="teacher-panel-section" aria-labelledby="teacher-panel-progress-heading">
            <h2 id="teacher-panel-progress-heading" className="teacher-panel-section-title">
              Student progress
            </h2>

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
                    <div>
                      <dt>Rank</dt>
                      <dd>{studentProfile?.rank ?? selectedStudent?.rank ?? 'Initiate'}</dd>
                    </div>
                  </dl>
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
            ) : studentsBusy ? (
              <p className="muted">Loading students…</p>
            ) : students.length === 0 ? (
              <p className="muted">No students found.</p>
            ) : (
              <ul className="teacher-panel-students">
                {students.map((s) => {
                  const name = s.display_name?.trim() || `Student (${s.id.slice(0, 8)}…)`
                  return (
                    <li key={s.id}>
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
                          {s.wp} WP · {s.gold} gold · {s.rank ?? 'Initiate'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
