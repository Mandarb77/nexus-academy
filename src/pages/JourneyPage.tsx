import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { useSkillTree } from '../hooks/useSkillTree'
import { guildHeading } from '../lib/guildTree'
import { getPatentRoute } from '../lib/patentRoutes'
import { selectStudentPatentPrimary } from '../lib/patentPlanRow'
import { normalizePatentPlanStatus } from '../lib/patentPlanStatus'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { TileRow } from '../types/tile'

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

type PatentWipRow = {
  id: string
  tile_id: string
  status: unknown
  stage: unknown
  field_1: string | null
  checklist_state: unknown
  checklist_submitted: boolean | null
  checklist_approved: boolean | null
  created_at: string
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
  const { tiles, completionByTileId, loading: treeLoading } = useSkillTree()
  const [rows, setRows] = useState<CompletionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patentWip, setPatentWip] = useState<PatentWipRow[]>([])
  const [patentWipLoading, setPatentWipLoading] = useState(true)

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

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) {
      setPatentWip([])
      setPatentWipLoading(false)
      return
    }
    let cancelled = false
    setPatentWipLoading(true)
    void supabase
      .from('patents')
      .select(
        'id, tile_id, status, stage, field_1, checklist_state, checklist_submitted, checklist_approved, created_at',
      )
      .eq('student_id', user.id)
      .in('stage', ['plan', 'packet'])
      .order('created_at', { ascending: false })
      .then(({ data, error: wipErr }) => {
        if (cancelled) return
        setPatentWipLoading(false)
        if (wipErr) {
          console.error('[Journey] patent wip:', wipErr.message)
          setPatentWip([])
          return
        }
        setPatentWip((data ?? []) as PatentWipRow[])
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const sorted = useMemo(() => {
    return [...rows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }, [rows])

  /** Patent quests still in progress (quest not teacher-approved yet) — same data as the patent pages, linked here. */
  const continuePatentQuests = useMemo(() => {
    if (!tiles.length || !patentWip.length) return []
    const byTile = new Map<string, PatentWipRow[]>()
    for (const row of patentWip) {
      const tid = String(row.tile_id)
      if (!byTile.has(tid)) byTile.set(tid, [])
      byTile.get(tid)!.push(row)
    }
    const out: {
      tile: TileRow
      href: string
      preview: string
      previewClipped: boolean
      done: number
      total: number
      planStatus: ReturnType<typeof normalizePatentPlanStatus>
      source: 'plan' | 'packet'
      checklistSubmitted: boolean
      checklistApproved: boolean
    }[] = []
    for (const [tid, list] of byTile) {
      const { primary, source } = selectStudentPatentPrimary(list, normalizePatentPlanStatus)
      if (!primary) continue
      if (source === 'none') continue
      const tile = tiles.find((t) => String(t.id) === tid)
      if (!tile) continue
      const href = getPatentRoute(tile)
      if (!href) continue
      const comp = completionByTileId.get(tile.id)
      if (comp?.status === 'approved') continue

      const rawCs = primary.checklist_state
      const cs = Array.isArray(rawCs) ? (rawCs as boolean[]) : []
      const done = cs.filter(Boolean).length
      const total = cs.length
      const fullPreview = String(primary.field_1 ?? '').trim()
      const preview = fullPreview.slice(0, 200)
      const previewClipped = fullPreview.length > 200
      out.push({
        tile,
        href,
        preview,
        previewClipped,
        done,
        total,
        planStatus: normalizePatentPlanStatus(primary.status),
        source,
        checklistSubmitted: Boolean(primary.checklist_submitted),
        checklistApproved: Boolean(primary.checklist_approved),
      })
    }
    out.sort((a, b) => a.tile.skill_name.localeCompare(b.tile.skill_name))
    return out
  }, [tiles, patentWip, completionByTileId])

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

      {!treeLoading && !patentWipLoading && continuePatentQuests.length > 0 ? (
        <section className="journey-wip card" aria-label="Quests to continue">
          <h2 className="journey-wip-title">Continue your patent quests</h2>
          <p className="muted journey-wip-intro">
            Your plan answers and checklist progress are saved in your account. Open a quest anytime — even after
            closing the browser — to pick up where you left off.
          </p>
          <ul className="journey-wip-list">
            {continuePatentQuests.map((q) => {
              const statusLabel =
                q.source === 'packet'
                  ? 'Final submission with teacher'
                  : q.planStatus === 'approved'
                    ? q.checklistSubmitted && !q.checklistApproved
                      ? 'Checklist with teacher'
                      : q.checklistApproved
                        ? 'Final questions'
                        : 'Checklist in progress'
                    : q.planStatus === 'pending'
                      ? 'Plan with teacher'
                      : q.planStatus === 'returned'
                        ? 'Plan returned — update and resubmit'
                        : 'In progress'
              return (
                <li key={q.tile.id}>
                  <article className="journey-wip-entry">
                    <div className="journey-wip-entry-main">
                      <h3 className="journey-wip-entry-title">{q.tile.skill_name}</h3>
                      <p className="muted journey-wip-entry-meta">
                        <span>{guildHeading(q.tile.guild)}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{statusLabel}</span>
                        {q.total > 0 ? (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span>
                              Checklist {q.done}/{q.total}
                            </span>
                          </>
                        ) : null}
                      </p>
                      {q.preview ? (
                        <p className="journey-wip-preview">
                          &ldquo;{q.preview}
                          {q.previewClipped ? '…' : ''}&rdquo;
                        </p>
                      ) : (
                        <p className="muted journey-wip-preview">No plan summary yet — open the quest to add your answers.</p>
                      )}
                    </div>
                    <Link to={q.href} className="btn-primary journey-wip-link">
                      Open quest
                    </Link>
                  </article>
                </li>
              )
            })}
          </ul>
        </section>
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
