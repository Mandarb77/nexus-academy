import { useCallback, useEffect, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type TileInfo = {
  guild: string
  skill_name: string
  wp_value: number
}

type PendingRow = {
  id: string
  student_id: string
  tile_id: string
  created_at: string
  display_name: string | null
  tile: TileInfo | null
}

export function TeacherPanelPage() {
  const { signOut } = useAuth()
  const [rows, setRows] = useState<PendingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)
  const [actionKind, setActionKind] = useState<'approve' | 'return' | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setRows([])
      setLoadError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)

    const { data: completions, error: completionsErr } = await supabase
      .from('skill_completions')
      .select('id, student_id, tile_id, created_at, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (completionsErr) {
      console.error('teacher panel pending:', completionsErr.message)
      setRows([])
      setLoadError(completionsErr.message)
      setLoading(false)
      return
    }

    const list = completions ?? []
    if (list.length === 0) {
      setRows([])
      setLoading(false)
      return
    }

    const studentIds = [...new Set(list.map((r) => r.student_id as string))]
    const tileIds = [...new Set(list.map((r) => r.tile_id as string))]

    const [profilesRes, tilesRes] = await Promise.all([
      supabase.from('profiles').select('id, display_name').in('id', studentIds),
      supabase.from('tiles').select('id, guild, skill_name, wp_value').in('id', tileIds),
    ])

    if (profilesRes.error) {
      console.error('profiles for teacher panel:', profilesRes.error.message)
      setRows([])
      setLoadError(profilesRes.error.message)
      setLoading(false)
      return
    }
    if (tilesRes.error) {
      console.error('tiles for teacher panel:', tilesRes.error.message)
      setRows([])
      setLoadError(tilesRes.error.message)
      setLoading(false)
      return
    }

    const nameById = new Map<string, string | null>()
    for (const p of profilesRes.data ?? []) {
      nameById.set(p.id as string, (p.display_name as string | null) ?? null)
    }

    const tileById = new Map<string, TileInfo>()
    for (const t of tilesRes.data ?? []) {
      tileById.set(t.id as string, {
        guild: t.guild as string,
        skill_name: t.skill_name as string,
        wp_value: (t.wp_value as number) ?? 10,
      })
    }

    const merged: PendingRow[] = list.map((r) => ({
      id: r.id as string,
      student_id: r.student_id as string,
      tile_id: r.tile_id as string,
      created_at: r.created_at as string,
      display_name: nameById.get(r.student_id as string) ?? null,
      tile: tileById.get(r.tile_id as string) ?? null,
    }))

    setRows(merged)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setActing = (id: string, kind: 'approve' | 'return') => {
    setActingId(id)
    setActionKind(kind)
  }

  const clearActing = () => {
    setActingId(null)
    setActionKind(null)
  }

  const approve = async (id: string) => {
    if (!isSupabaseConfigured) return
    setActing(id, 'approve')
    const { error } = await supabase
      .from('skill_completions')
      .update({ status: 'approved' })
      .eq('id', id)
    clearActing()
    if (error) {
      console.error('approve:', error.message)
      return
    }
    void load()
  }

  const returnCompletion = async (id: string) => {
    if (!isSupabaseConfigured) return
    setActing(id, 'return')
    const { error } = await supabase
      .from('skill_completions')
      .update({ status: 'returned' })
      .eq('id', id)
    clearActing()
    if (error) {
      console.error('return:', error.message)
      return
    }
    void load()
  }

  return (
    <div className="app-shell teacher-panel-page">
      <header className="teacher-panel-header">
        <MainNav variant="teacher" />
        <div className="teacher-panel-top-row">
          <div>
            <h1 className="teacher-panel-title">Teacher panel</h1>
            <p className="muted teacher-panel-subtitle">
              Review pending skill completions. Approve adds that skill&apos;s Workshop Points (from the
              tile) plus <strong>10 gold</strong>. Return sends it back so the student can submit again.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {loadError ? (
        <p className="error" role="alert">
          Could not load pending completions: {loadError}
        </p>
      ) : null}

      {loading ? (
        <p className="muted">Loading pending requests…</p>
      ) : loadError ? null : rows.length === 0 ? (
        <p className="muted">No pending skill completions.</p>
      ) : (
        <ul className="teacher-panel-list">
          {rows.map((row) => {
            const t = row.tile
            const studentName =
              row.display_name?.trim() ||
              `Student (${row.student_id.slice(0, 8)}…)`
            const busyApprove = actingId === row.id && actionKind === 'approve'
            const busyReturn = actingId === row.id && actionKind === 'return'
            const busy = busyApprove || busyReturn

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
                    onClick={() => void approve(row.id)}
                  >
                    {busyApprove ? 'Approving…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy}
                    onClick={() => void returnCompletion(row.id)}
                  >
                    {busyReturn ? 'Returning…' : 'Return'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
