import { useCallback, useEffect, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type TileEmbed = {
  guild: string
  skill_name: string
  wp_value: number
}

type PendingRow = {
  id: string
  student_id: string
  tile_id: string
  created_at: string
  tiles: TileEmbed | TileEmbed[] | null
}

function tileEmbed(row: PendingRow): TileEmbed | null {
  const t = row.tiles
  if (!t) return null
  return Array.isArray(t) ? (t[0] ?? null) : t
}

export function TeacherPanelPage() {
  const { signOut } = useAuth()
  const [rows, setRows] = useState<PendingRow[]>([])
  const [nameByStudentId, setNameByStudentId] = useState<Map<string, string | null>>(
    () => new Map(),
  )
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [actionKind, setActionKind] = useState<'approve' | 'return' | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('skill_completions')
      .select(
        `
        id,
        student_id,
        tile_id,
        created_at,
        tiles ( guild, skill_name, wp_value )
      `,
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('teacher panel pending:', error.message)
      setRows([])
      setNameByStudentId(new Map())
    } else {
      const list = (data ?? []) as unknown as PendingRow[]
      setRows(list)
      const ids = [...new Set(list.map((r) => r.student_id))]
      if (ids.length === 0) {
        setNameByStudentId(new Map())
      } else {
        const { data: profs, error: pErr } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', ids)
        if (pErr) {
          console.error('profiles for teacher panel:', pErr.message)
          setNameByStudentId(new Map())
        } else {
          const m = new Map<string, string | null>()
          for (const p of profs ?? []) {
            m.set(p.id as string, (p.display_name as string | null) ?? null)
          }
          setNameByStudentId(m)
        }
      }
    }
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
              Review pending skill completions. Approve to award WP (from each tile, usually 10).
              Return sends it back so the student can submit again.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {loading ? (
        <p className="muted">Loading pending requests…</p>
      ) : rows.length === 0 ? (
        <p className="muted">No pending skill completions.</p>
      ) : (
        <ul className="teacher-panel-list">
          {rows.map((row) => {
            const t = tileEmbed(row)
            const studentName =
              nameByStudentId.get(row.student_id)?.trim() ||
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
                        · {t.wp_value} WP on approval
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
