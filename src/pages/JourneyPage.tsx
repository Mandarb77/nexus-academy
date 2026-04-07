import { useCallback, useEffect, useMemo, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { guildHeading } from '../lib/guildTree'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type TileJoin = {
  guild: string
  skill_name: string
} | null

type CompletionRow = {
  id: string
  created_at: string
  wp_awarded: number | null
  gold_awarded: number | null
  tiles: TileJoin | TileJoin[]
}

function normalizeTile(row: CompletionRow): { guild: string; skillName: string } {
  const t = row.tiles
  const tile = Array.isArray(t) ? t[0] : t
  return {
    guild: tile?.guild?.trim() || 'Guild',
    skillName: tile?.skill_name?.trim() || 'Quest',
  }
}

export function JourneyPage() {
  const { profile, user, signOut } = useAuth()
  const [rows, setRows] = useState<CompletionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: loadErr } = await supabase
      .from('skill_completions')
      .select(
        `
        id,
        created_at,
        wp_awarded,
        gold_awarded,
        tiles (
          guild,
          skill_name
        )
      `,
      )
      .eq('student_id', user.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    setLoading(false)
    if (loadErr) {
      setError(loadErr.message)
      setRows([])
      return
    }
    setRows((data ?? []) as CompletionRow[])
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  const sorted = useMemo(() => {
    return [...rows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }, [rows])

  const totalQuests = sorted.length
  const totalWpProfile = profile?.wp ?? 0
  const totalGoldProfile = profile?.gold ?? 0

  const displayName =
    profile?.display_name?.trim() ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'Student'

  return (
    <div className="app-shell journey-page">
      <MainNav />
      <header className="journey-header">
        <div>
          <h1 className="journey-title">Your journey</h1>
          <p className="muted journey-intro">
            Every approved quest you have finished — a record of what you have built and earned,{' '}
            <strong>{displayName}</strong>.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => signOut()}>
          Sign out
        </button>
      </header>

      {!isSupabaseConfigured ? (
        <p className="muted" role="alert">
          Connect Supabase in <code className="inline-code">.env</code> to load your journey.
        </p>
      ) : null}

      <section className="journey-summary card" aria-label="Your totals">
        <h2 className="visually-hidden">Summary</h2>
        <div className="journey-summary-grid">
          <div className="journey-summary-item">
            <span className="journey-summary-label">Total Workshop Points</span>
            <span className="journey-summary-value">{totalWpProfile}</span>
          </div>
          <div className="journey-summary-item journey-summary-item--gold">
            <span className="journey-summary-label">Total gold</span>
            <span className="journey-summary-value gold-currency-text">{totalGoldProfile}</span>
          </div>
          <div className="journey-summary-item">
            <span className="journey-summary-label">Quests completed</span>
            <span className="journey-summary-value">{totalQuests}</span>
          </div>
        </div>
        <p className="muted journey-summary-note">
          WP and gold match your profile. The list below only includes teacher-approved quests.
        </p>
      </section>

      {loading ? (
        <p className="muted">Loading your journey…</p>
      ) : error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : sorted.length === 0 ? (
        <div className="journey-empty card">
          <p className="journey-empty-lead">No approved quests yet.</p>
          <p className="muted">
            When you finish a quest and your teacher approves it, it will appear here — newest first,
            organized by guild.
          </p>
        </div>
      ) : (
        <ol className="journey-timeline" aria-label="Approved quests, most recent first">
          {sorted.map((row, index) => {
            const { guild, skillName } = normalizeTile(row)
            const prev = index > 0 ? normalizeTile(sorted[index - 1]!) : null
            const showGuildHeading = !prev || prev.guild !== guild
            const wp = row.wp_awarded ?? 0
            const gold = row.gold_awarded ?? 0
            const when = new Date(row.created_at)
            const dateStr = when.toLocaleDateString(undefined, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })

            return (
              <li key={row.id} className="journey-timeline-item">
                {showGuildHeading ? (
                  <h3 className="journey-guild-heading">{guildHeading(guild)}</h3>
                ) : null}
                <article className="journey-entry card">
                  <div className="journey-entry-main">
                    <h4 className="journey-entry-title">{skillName}</h4>
                    <p className="journey-entry-meta muted">
                      <span className="journey-entry-guild">{guildHeading(guild)}</span>
                      <span aria-hidden="true"> · </span>
                      <time dateTime={row.created_at}>{dateStr}</time>
                    </p>
                  </div>
                  <div className="journey-entry-awards">
                    <span className="journey-entry-wp">+{wp} WP</span>
                    <span className="journey-entry-gold gold-currency-text">+{gold} gold</span>
                  </div>
                  <span className="journey-badge journey-badge--approved">Approved</span>
                </article>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
