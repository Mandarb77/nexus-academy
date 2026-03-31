import { useCallback, useEffect, useMemo, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

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

export function TeacherPanelPage() {
  const { signOut } = useAuth()
  const [skillRows, setSkillRows] = useState<PendingSkillRow[]>([])
  const [redemptionRows, setRedemptionRows] = useState<PendingRedemptionRow[]>([])
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
  const [resetType, setResetType] = useState<
    'skill_completions' | 'inventory_and_purchases' | 'redemption_requests' | ''
  >('')
  const [resetBusy, setResetBusy] = useState(false)
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

    const [compRes, redRes] = await Promise.all([
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

    const completions = compRes.data ?? []
    const redemptions = redRes.data ?? []

    const studentIds = [
      ...new Set([
        ...completions.map((r) => r.student_id as string),
        ...redemptions.map((r) => r.student_id as string),
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

    setLoading(false)
  }, [])

  useEffect(() => {
    void loadPending()
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

  const doFullReset = async () => {
    if (!isSupabaseConfigured || resetBusy) return
    setAdminMessage(null)
    const ok = window.confirm(
      'This will reset all student WP, gold, rank, and completions. This cannot be undone. Are you sure?',
    )
    if (!ok) return
    const ZERO_UUID = '00000000-0000-0000-0000-000000000000'
    setResetBusy(true)

    // 1) profiles
    {
      const { error } = await supabase
        .from('profiles')
        .update({ wp: 0, gold: 0, rank: 'Initiate' })
        .neq('id', ZERO_UUID)
      if (error) {
        console.error('full reset: profiles update failed:', error)
        setAdminMessage(`Reset failed updating profiles: ${error.message}`)
        setResetBusy(false)
        return
      }
      console.log('full reset: profiles updated')
    }

    // 2) skill_completions
    {
      const { error } = await supabase
        .from('skill_completions')
        .delete()
        .gt('created_at', '0001-01-01T00:00:00Z')
      if (error) {
        console.error('full reset: skill_completions delete failed:', error)
        setAdminMessage(`Reset failed deleting skill completions: ${error.message}`)
        setResetBusy(false)
        return
      }
      console.log('full reset: skill_completions deleted')
    }

    // 3) patents
    {
      const { error } = await supabase
        .from('patents')
        .delete()
        .gt('created_at', '0001-01-01T00:00:00Z')
      if (error) {
        console.error('full reset: patents delete failed:', error)
        setAdminMessage(`Reset failed deleting patents: ${error.message}`)
        setResetBusy(false)
        return
      }
      console.log('full reset: patents deleted')
    }

    // 4) inventory
    {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .gt('created_at', '0001-01-01T00:00:00Z')
      if (error) {
        console.error('full reset: inventory delete failed:', error)
        setAdminMessage(`Reset failed deleting inventory: ${error.message}`)
        setResetBusy(false)
        return
      }
      console.log('full reset: inventory deleted')
    }

    // 5) redemption_requests
    {
      const { error } = await supabase
        .from('redemption_requests')
        .delete()
        .gt('created_at', '0001-01-01T00:00:00Z')
      if (error) {
        console.error('full reset: redemption_requests delete failed:', error)
        setAdminMessage(`Reset failed deleting redemption requests: ${error.message}`)
        setResetBusy(false)
        return
      }
      console.log('full reset: redemption_requests deleted')
    }

    // 6) gold_purchases
    {
      const { error } = await supabase
        .from('gold_purchases')
        .delete()
        .gt('created_at', '0001-01-01T00:00:00Z')
      if (error) {
        console.error('full reset: gold_purchases delete failed:', error)
        setAdminMessage(`Reset failed deleting gold purchases: ${error.message}`)
        setResetBusy(false)
        return
      }
      console.log('full reset: gold_purchases deleted')
    }

    setResetBusy(false)
    setAdminMessage('Full reset complete.')
    setSelectedStudentId(null)
    setStudentProfile(null)
    setStudentSkills([])
    setStudentInventory([])
    setStudentRedemptions([])
    void loadPending()
    void loadStudents()
  }

  const doResetByType = async () => {
    if (!isSupabaseConfigured || resetBusy) return
    if (!resetType) {
      setAdminMessage('Choose a reset type first.')
      return
    }
    setAdminMessage(null)
    const label =
      resetType === 'skill_completions'
        ? 'Skill Completions'
        : resetType === 'inventory_and_purchases'
          ? 'Inventory and Purchases'
          : 'Redemption Requests'
    const ok = window.confirm(`This will delete ${label} for all students. This cannot be undone. Are you sure?`)
    if (!ok) return
    setResetBusy(true)
    const { data, error } = await supabase.rpc('teacher_reset_by_type', { p_type: resetType })
    setResetBusy(false)
    if (error) {
      setAdminMessage(`Reset failed: ${error.message}`)
      return
    }
    const res = data as { ok?: boolean; error?: string }
    if (!res?.ok) {
      setAdminMessage(`Reset failed: ${res?.error ?? 'unknown error'}`)
      return
    }
    setAdminMessage(`${label} reset complete.`)
    void loadPending()
    void loadStudents()
  }

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
          <section className="teacher-panel-section" aria-labelledby="teacher-panel-reset-heading">
            <h2 id="teacher-panel-reset-heading" className="teacher-panel-section-title">
              Reset
            </h2>
            <div className="teacher-panel-reset-grid">
              <button
                type="button"
                className="btn-danger"
                disabled={resetBusy || !isSupabaseConfigured}
                onClick={() => void doFullReset()}
              >
                {resetBusy ? 'Working…' : 'Full reset'}
              </button>
              <div className="teacher-panel-reset-by-type">
                <label className="teacher-panel-reset-label">
                  Reset by type
                  <select
                    className="teacher-panel-select"
                    value={resetType}
                    onChange={(e) => setResetType(e.target.value as typeof resetType)}
                    disabled={resetBusy}
                  >
                    <option value="">Choose…</option>
                    <option value="skill_completions">Skill Completions</option>
                    <option value="inventory_and_purchases">Inventory and Purchases</option>
                    <option value="redemption_requests">Redemption Requests</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={resetBusy || !resetType || !isSupabaseConfigured}
                  onClick={() => void doResetByType()}
                >
                  {resetBusy ? 'Working…' : 'Reset selected'}
                </button>
              </div>
            </div>
            <p className="muted teacher-panel-reset-hint">
              Resets apply to <strong>students</strong> (profiles with role <code className="inline-code">student</code>).
            </p>
          </section>

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

          <section className="teacher-panel-section" aria-labelledby="teacher-panel-skills-heading">
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
                                <dt>What did you make?</dt>
                                <dd>{row.patent.field_1}</dd>
                              </div>
                              <div>
                                <dt>What makes it yours?</dt>
                                <dd>{row.patent.field_2}</dd>
                              </div>
                              <div>
                                <dt>What failed and what did you change?</dt>
                                <dd>{row.patent.field_3}</dd>
                              </div>
                              <div>
                                <dt>Who is this for?</dt>
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
            className="teacher-panel-section"
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
        </>
      )}
    </div>
  )
}
