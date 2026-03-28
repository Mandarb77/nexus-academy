import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isTeacherUser } from '../lib/teacher'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type TileEmbed = {
  guild: string
  skill_name: string
  wp_value: number
}

type PendingCompletion = {
  id: string
  student_id: string
  tile_id: string
  skill_key: string
  created_at: string
  tiles: TileEmbed | TileEmbed[] | null
}

function tileEmbed(row: PendingCompletion): TileEmbed | null {
  const t = row.tiles
  if (!t) return null
  return Array.isArray(t) ? (t[0] ?? null) : t
}

export function DashboardPage() {
  const { profile, user, signOut } = useAuth()
  const [pending, setPending] = useState<PendingCompletion[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const displayName =
    profile?.display_name?.trim() ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'Teacher'

  const loadPending = useCallback(async () => {
    if (!isSupabaseConfigured || !isTeacherUser(user)) return
    setPendingLoading(true)
    const { data, error } = await supabase
      .from('skill_completions')
      .select(
        `
        id,
        student_id,
        tile_id,
        skill_key,
        created_at,
        tiles ( guild, skill_name, wp_value )
      `,
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('pending completions:', error.message)
      setPending([])
    } else {
      setPending((data ?? []) as unknown as PendingCompletion[])
    }
    setPendingLoading(false)
  }, [user])

  useEffect(() => {
    void loadPending()
  }, [loadPending])

  const approve = async (completionId: string) => {
    if (!isSupabaseConfigured) return
    setApprovingId(completionId)
    const { error } = await supabase
      .from('skill_completions')
      .update({ status: 'approved' })
      .eq('id', completionId)
    setApprovingId(null)
    if (error) {
      console.error('approve completion:', error.message)
      return
    }
    void loadPending()
  }

  return (
    <div className="app-shell">
      <header className="dash-header">
        <div>
          <h1>Nexus Academy</h1>
          <p className="muted">
            Signed in as <strong>{displayName}</strong>
            <span className="role-pill role-teacher">Teacher</span>
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => signOut()}>
          Sign out
        </button>
      </header>

      <section className="card">
        <h2>Your stats</h2>
        <dl className="stat-grid" aria-label="Your progress">
          <div className="stat">
            <dt>WP</dt>
            <dd>{profile?.wp ?? 0}</dd>
          </div>
          <div className="stat">
            <dt>Gold</dt>
            <dd>{profile?.gold ?? 0}</dd>
          </div>
          <div className="stat">
            <dt>Rank</dt>
            <dd>{profile?.rank ?? 'Initiate'}</dd>
          </div>
        </dl>
      </section>

      <section className="card teacher-pending-section">
        <h2>Pending skill completions</h2>
        <p className="muted teacher-pending-hint">
          Approve a request to add that tile&apos;s WP to the student&apos;s profile.
        </p>
        {pendingLoading ? (
          <p className="muted">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="muted">No pending requests.</p>
        ) : (
          <ul className="teacher-pending-list">
            {pending.map((row) => {
              const t = tileEmbed(row)
              const label = t
                ? `${t.guild} · ${t.skill_name} (+${t.wp_value} WP)`
                : `Tile ${row.tile_id.slice(0, 8)}…`
              return (
                <li key={row.id} className="teacher-pending-row">
                  <div className="teacher-pending-info">
                    <span className="teacher-pending-label">{label}</span>
                    <span className="teacher-pending-meta muted">
                      Student <code className="inline-code">{row.student_id.slice(0, 8)}…</code>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-primary teacher-approve-btn"
                    disabled={approvingId === row.id}
                    onClick={() => void approve(row.id)}
                  >
                    {approvingId === row.id ? 'Approving…' : 'Approve'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
