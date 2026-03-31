import { useEffect, useMemo, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type ResetType = 'skill_completions' | 'inventory_and_purchases' | 'redemption_requests'

type StudentRow = {
  id: string
  display_name: string | null
}

type TileRow = {
  id: string
  guild: string
  skill_name: string
}

type CompletionRow = {
  id: string
  student_id: string
  status: string
  wp_awarded: number | null
  gold_awarded: number | null
  patent_id: string | null
}

export function TeacherResetPage() {
  const { signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentId, setStudentId] = useState<string>('')
  const [studentResetType, setStudentResetType] = useState<ResetType | ''>('')

  const [tiles, setTiles] = useState<TileRow[]>([])
  const [tilesLoading, setTilesLoading] = useState(false)
  const [tileId, setTileId] = useState<string>('')
  const [tileCompletions, setTileCompletions] = useState<CompletionRow[]>([])
  const [tileCompletionsLoading, setTileCompletionsLoading] = useState(false)
  const [nameByStudentId, setNameByStudentId] = useState<Map<string, string | null>>(
    () => new Map(),
  )

  const selectedStudent = useMemo(() => {
    if (!studentId) return null
    return students.find((s) => s.id === studentId) ?? null
  }, [students, studentId])

  const selectedTile = useMemo(() => {
    if (!tileId) return null
    return tiles.find((t) => t.id === tileId) ?? null
  }, [tiles, tileId])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    setStudentsLoading(true)
    void (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, role')
        .eq('role', 'student')
        .order('display_name', { ascending: true })
      if (cancelled) return
      setStudentsLoading(false)
      if (error) {
        console.error('load students:', error.message)
        setStudents([])
        return
      }
      setStudents(
        (data ?? []).map((r) => ({
          id: r.id as string,
          display_name: (r.display_name as string | null) ?? null,
        })),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    setTilesLoading(true)
    void (async () => {
      const { data, error } = await supabase
        .from('tiles')
        .select('id, guild, skill_name')
        .order('guild', { ascending: true })
        .order('skill_name', { ascending: true })
      if (cancelled) return
      setTilesLoading(false)
      if (error) {
        console.error('load tiles:', error.message)
        setTiles([])
        return
      }
      setTiles(
        (data ?? []).map((t) => ({
          id: t.id as string,
          guild: t.guild as string,
          skill_name: t.skill_name as string,
        })),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const fullReset = async () => {
    if (!isSupabaseConfigured || busy) return
    setMessage(null)
    const ok = window.confirm(
      'This will reset all student WP, gold, rank, and completions. This cannot be undone. Are you sure?',
    )
    if (!ok) return

    setBusy(true)
    const ZERO_UUID = '00000000-0000-0000-0000-000000000000'

    // 1) profiles
    {
      const { error } = await supabase
        .from('profiles')
        .update({ wp: 0, gold: 0, rank: 'Initiate' })
        .neq('id', ZERO_UUID)
      if (error) {
        console.error('full reset: profiles update failed:', error)
        setMessage(`Reset failed updating profiles: ${error.message}`)
        setBusy(false)
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
        setMessage(`Reset failed deleting skill completions: ${error.message}`)
        setBusy(false)
        return
      }
      console.log('full reset: skill_completions deleted')
    }

    // 3) patents
    {
      const { error } = await supabase.from('patents').delete().gt('created_at', '0001-01-01T00:00:00Z')
      if (error) {
        console.error('full reset: patents delete failed:', error)
        setMessage(`Reset failed deleting patents: ${error.message}`)
        setBusy(false)
        return
      }
      console.log('full reset: patents deleted')
    }

    // 4) inventory
    {
      const { error } = await supabase.from('inventory').delete().gt('created_at', '0001-01-01T00:00:00Z')
      if (error) {
        console.error('full reset: inventory delete failed:', error)
        setMessage(`Reset failed deleting inventory: ${error.message}`)
        setBusy(false)
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
        setMessage(`Reset failed deleting redemption requests: ${error.message}`)
        setBusy(false)
        return
      }
      console.log('full reset: redemption_requests deleted')
    }

    // 6) gold_purchases
    {
      const { error } = await supabase.from('gold_purchases').delete().gt('created_at', '0001-01-01T00:00:00Z')
      if (error) {
        console.error('full reset: gold_purchases delete failed:', error)
        setMessage(`Reset failed deleting gold purchases: ${error.message}`)
        setBusy(false)
        return
      }
      console.log('full reset: gold_purchases deleted')
    }

    setBusy(false)
    setMessage('Full reset complete.')
  }

  const resetStudentAll = async () => {
    if (!isSupabaseConfigured || busy || !studentId) return
    setMessage(null)
    const name = selectedStudent?.display_name?.trim() || `Student (${studentId.slice(0, 8)}…)`
    const ok = window.confirm(
      `This will reset WP, gold, rank, and all related data for ${name}. This cannot be undone. Are you sure?`,
    )
    if (!ok) return
    setBusy(true)

    // Update profile first
    {
      const { error } = await supabase
        .from('profiles')
        .update({ wp: 0, gold: 0, rank: 'Initiate' })
        .eq('id', studentId)
      if (error) {
        console.error('student reset: profiles update failed:', error)
        setMessage(`Reset failed updating profile: ${error.message}`)
        setBusy(false)
        return
      }
    }

    // Delete per-table rows for this student
    const deletes: Array<[string, () => Promise<{ error: any }>]> = [
      [
        'skill_completions',
        async () => await supabase.from('skill_completions').delete().eq('student_id', studentId),
      ],
      ['patents', async () => await supabase.from('patents').delete().eq('student_id', studentId)],
      ['inventory', async () => await supabase.from('inventory').delete().eq('student_id', studentId)],
      [
        'redemption_requests',
        async () => await supabase.from('redemption_requests').delete().eq('student_id', studentId),
      ],
      [
        'gold_purchases',
        async () => await supabase.from('gold_purchases').delete().eq('student_id', studentId),
      ],
    ]

    for (const [label, run] of deletes) {
      const { error } = await run()
      if (error) {
        console.error(`student reset: ${label} delete failed:`, error)
        setMessage(`Reset failed deleting ${label}: ${error.message ?? String(error)}`)
        setBusy(false)
        return
      }
    }

    setBusy(false)
    setMessage(`Reset complete for ${name}.`)
  }

  const resetStudentByType = async () => {
    if (!isSupabaseConfigured || busy || !studentId) return
    if (!studentResetType) {
      setMessage('Choose a reset type first.')
      return
    }
    setMessage(null)
    const name = selectedStudent?.display_name?.trim() || `Student (${studentId.slice(0, 8)}…)`
    const label =
      studentResetType === 'skill_completions'
        ? 'Skill Completions'
        : studentResetType === 'inventory_and_purchases'
          ? 'Inventory and Purchases'
          : 'Redemption Requests'
    const ok = window.confirm(
      `This will delete ${label} for ${name}. This cannot be undone. Are you sure?`,
    )
    if (!ok) return
    setBusy(true)

    if (studentResetType === 'skill_completions') {
      const { error } = await supabase.from('skill_completions').delete().eq('student_id', studentId)
      if (error) {
        console.error('student reset by type: skill_completions delete failed:', error)
        setMessage(`Reset failed: ${error.message}`)
        setBusy(false)
        return
      }
    } else if (studentResetType === 'redemption_requests') {
      const { error } = await supabase
        .from('redemption_requests')
        .delete()
        .eq('student_id', studentId)
      if (error) {
        console.error('student reset by type: redemption_requests delete failed:', error)
        setMessage(`Reset failed: ${error.message}`)
        setBusy(false)
        return
      }
    } else {
      // inventory_and_purchases
      // redemptions reference inventory_id, so delete redemptions first
      const { error: rErr } = await supabase
        .from('redemption_requests')
        .delete()
        .eq('student_id', studentId)
      if (rErr) {
        console.error('student reset by type: redemption_requests delete failed:', rErr)
        setMessage(`Reset failed deleting redemption requests: ${rErr.message}`)
        setBusy(false)
        return
      }
      const { error: iErr } = await supabase.from('inventory').delete().eq('student_id', studentId)
      if (iErr) {
        console.error('student reset by type: inventory delete failed:', iErr)
        setMessage(`Reset failed deleting inventory: ${iErr.message}`)
        setBusy(false)
        return
      }
      const { error: pErr } = await supabase
        .from('gold_purchases')
        .delete()
        .eq('student_id', studentId)
      if (pErr) {
        console.error('student reset by type: gold_purchases delete failed:', pErr)
        setMessage(`Reset failed deleting gold purchases: ${pErr.message}`)
        setBusy(false)
        return
      }
    }

    setBusy(false)
    setMessage(`${label} reset complete for ${name}.`)
  }

  const loadCompletionsForTile = async (tid: string) => {
    if (!isSupabaseConfigured) return
    setTileCompletionsLoading(true)
    const { data, error } = await supabase
      .from('skill_completions')
      .select('id, student_id, status, wp_awarded, gold_awarded, patent_id, tile_id')
      .eq('tile_id', tid)
      .order('created_at', { ascending: false })
    setTileCompletionsLoading(false)
    if (error) {
      console.error('load completions for tile:', error.message)
      setTileCompletions([])
      setNameByStudentId(new Map())
      setMessage(`Could not load completions: ${error.message}`)
      return
    }

    const list = (data ?? []) as unknown as CompletionRow[]
    setTileCompletions(list)

    const ids = [...new Set(list.map((r) => r.student_id))]
    if (ids.length === 0) {
      setNameByStudentId(new Map())
      return
    }
    const { data: profs, error: pErr } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', ids)
    if (pErr) {
      console.error('load profile names:', pErr.message)
      setNameByStudentId(new Map())
      return
    }
    const m = new Map<string, string | null>()
    for (const p of profs ?? []) {
      m.set(p.id as string, (p.display_name as string | null) ?? null)
    }
    setNameByStudentId(m)
  }

  const resetQuestForStudent = async (row: CompletionRow) => {
    if (!isSupabaseConfigured || busy || !selectedTile) return
    const name =
      nameByStudentId.get(row.student_id)?.trim() || `Student (${row.student_id.slice(0, 8)}…)`
    const tileName = `${selectedTile.guild} — ${selectedTile.skill_name}`
    const wp = row.wp_awarded ?? 0
    const gold = row.gold_awarded ?? 0
    const ok = window.confirm(
      `This will remove the completion for ${name} on “${tileName}” and deduct ${wp} WP and ${gold} gold. This cannot be undone. Confirm?`,
    )
    if (!ok) return

    setBusy(true)
    setMessage(null)

    // Deduct from profile (client-side compute)
    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('id, wp, gold')
      .eq('id', row.student_id)
      .maybeSingle()
    if (profErr) {
      console.error('quest reset: load profile failed:', profErr)
      setMessage(`Reset failed loading profile: ${profErr.message}`)
      setBusy(false)
      return
    }
    const currentWp = (prof?.wp as number) ?? 0
    const currentGold = (prof?.gold as number) ?? 0
    const nextWp = Math.max(0, currentWp - wp)
    const nextGold = Math.max(0, currentGold - gold)

    const { error: updErr } = await supabase
      .from('profiles')
      .update({ wp: nextWp, gold: nextGold })
      .eq('id', row.student_id)
    if (updErr) {
      console.error('quest reset: profile update failed:', updErr)
      setMessage(`Reset failed updating profile: ${updErr.message}`)
      setBusy(false)
      return
    }

    // Delete completion
    const { error: delErr } = await supabase.from('skill_completions').delete().eq('id', row.id)
    if (delErr) {
      console.error('quest reset: completion delete failed:', delErr)
      setMessage(`Reset failed deleting completion: ${delErr.message}`)
      setBusy(false)
      return
    }

    // Delete associated patent if present
    if (row.patent_id) {
      const { error: patErr } = await supabase.from('patents').delete().eq('id', row.patent_id)
      if (patErr) {
        console.error('quest reset: patent delete failed:', patErr)
        setMessage(`Completion removed but patent delete failed: ${patErr.message}`)
        setBusy(false)
        await loadCompletionsForTile(selectedTile.id)
        return
      }
    }

    setBusy(false)
    setMessage(`Quest reset complete for ${name}.`)
    await loadCompletionsForTile(selectedTile.id)
  }

  return (
    <div className="app-shell teacher-panel-page">
      <header className="teacher-panel-header">
        <MainNav variant="teacher" />
        <div className="teacher-panel-top-row">
          <div>
            <h1 className="teacher-panel-title">Teacher reset</h1>
            <p className="muted teacher-panel-subtitle">
              Destructive tools for clearing student progress and shop data.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {!isSupabaseConfigured ? (
        <p className="muted" role="alert">
          Connect Supabase in <code className="inline-code">.env</code> to use reset tools.
        </p>
      ) : null}

      {message ? (
        <p className="muted" role="status">
          {message}
        </p>
      ) : null}

      <section className="teacher-panel-section" aria-labelledby="teacher-reset-full-heading">
        <h2 id="teacher-reset-full-heading" className="teacher-panel-section-title">
          Full reset
        </h2>
        <button
          type="button"
          className="btn-danger"
          disabled={!isSupabaseConfigured || busy}
          onClick={() => void fullReset()}
        >
          {busy ? 'Working…' : 'Full reset'}
        </button>
      </section>

      <section className="teacher-panel-section" aria-labelledby="teacher-reset-student-heading">
        <h2 id="teacher-reset-student-heading" className="teacher-panel-section-title">
          Reset individual student
        </h2>
        <label className="teacher-panel-reset-label">
          Student
          <select
            className="teacher-panel-select"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={busy || studentsLoading}
          >
            <option value="">{studentsLoading ? 'Loading…' : 'Choose a student…'}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name?.trim() || `Student (${s.id.slice(0, 8)}…)`}
              </option>
            ))}
          </select>
        </label>

        {studentId ? (
          <div className="teacher-panel-reset-grid" style={{ marginTop: '0.9rem' }}>
            <button
              type="button"
              className="btn-danger"
              disabled={busy || !isSupabaseConfigured}
              onClick={() => void resetStudentAll()}
            >
              Reset all for this student
            </button>

            <div className="teacher-panel-reset-by-type">
              <label className="teacher-panel-reset-label">
                Reset by type
                <select
                  className="teacher-panel-select"
                  value={studentResetType}
                  onChange={(e) => setStudentResetType(e.target.value as any)}
                  disabled={busy}
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
                disabled={busy || !studentResetType || !isSupabaseConfigured}
                onClick={() => void resetStudentByType()}
              >
                Reset selected
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="teacher-panel-section" aria-labelledby="teacher-reset-quest-heading">
        <h2 id="teacher-reset-quest-heading" className="teacher-panel-section-title">
          Reset individual quest
        </h2>

        <label className="teacher-panel-reset-label">
          Tile
          <select
            className="teacher-panel-select"
            value={tileId}
            onChange={(e) => {
              const id = e.target.value
              setTileId(id)
              setTileCompletions([])
              setNameByStudentId(new Map())
              if (id) void loadCompletionsForTile(id)
            }}
            disabled={busy || tilesLoading}
          >
            <option value="">{tilesLoading ? 'Loading…' : 'Choose a tile…'}</option>
            {tiles.map((t) => (
              <option key={t.id} value={t.id}>
                {t.guild} — {t.skill_name}
              </option>
            ))}
          </select>
        </label>

        {tileId && selectedTile ? (
          <div style={{ marginTop: '1rem' }}>
            {tileCompletionsLoading ? (
              <p className="muted">Loading completions…</p>
            ) : tileCompletions.length === 0 ? (
              <p className="muted">No completions found for this tile.</p>
            ) : (
              <ul className="teacher-panel-list">
                {tileCompletions.map((c) => {
                  const nm =
                    nameByStudentId.get(c.student_id)?.trim() ||
                    `Student (${c.student_id.slice(0, 8)}…)`
                  return (
                    <li key={c.id} className="card teacher-panel-item">
                      <div className="teacher-panel-item-main">
                        <p className="teacher-panel-student">{nm}</p>
                        <p className="teacher-panel-skill">
                          <strong>{selectedTile.skill_name}</strong>
                        </p>
                        <p className="muted teacher-panel-guild">
                          Status: <strong>{c.status}</strong>
                        </p>
                        <p className="muted" style={{ margin: 0 }}>
                          Awarded: {c.wp_awarded ?? 0} WP · {c.gold_awarded ?? 0} gold
                        </p>
                      </div>
                      <div className="teacher-panel-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={busy || !isSupabaseConfigured}
                          onClick={() => void resetQuestForStudent(c)}
                        >
                          Reset
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ) : null}
      </section>
    </div>
  )
}

