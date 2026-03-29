import { useCallback, useEffect, useState } from 'react'
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
  created_at: string
  display_name: string | null
  tile: TileInfo | null
}

type PendingRedemptionRow = {
  id: string
  student_id: string
  inventory_id: string
  item_name: string
  created_at: string
  display_name: string | null
}

type Acting =
  | { scope: 'skill'; id: string; action: 'approve' | 'return' }
  | { scope: 'redemption'; id: string; action: 'approve' | 'return' }
  | null

export function TeacherPanelPage() {
  const { signOut } = useAuth()
  const [skillRows, setSkillRows] = useState<PendingSkillRow[]>([])
  const [redemptionRows, setRedemptionRows] = useState<PendingRedemptionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [acting, setActing] = useState<Acting>(null)

  const load = useCallback(async () => {
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
        .select('id, student_id, tile_id, created_at, status')
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

    setSkillRows(
      completions.map((r) => ({
        id: r.id as string,
        student_id: r.student_id as string,
        tile_id: r.tile_id as string,
        created_at: r.created_at as string,
        display_name: nameById.get(r.student_id as string) ?? null,
        tile: tileById.get(r.tile_id as string) ?? null,
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
    void load()
  }, [load])

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
    void load()
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
    void load()
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
    void load()
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
    void load()
  }

  const isActing = (scope: 'skill' | 'redemption', id: string, action: 'approve' | 'return') =>
    acting?.scope === scope && acting.id === id && acting.action === action

  const busySkill = (id: string) =>
    acting?.scope === 'skill' && acting.id === id ? acting : null
  const busyRedemption = (id: string) =>
    acting?.scope === 'redemption' && acting.id === id ? acting : null

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

      {loadError ? (
        <p className="error" role="alert">
          Could not load pending requests: {loadError}
        </p>
      ) : null}

      {loading ? (
        <p className="muted">Loading pending requests…</p>
      ) : loadError ? null : (
        <>
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
