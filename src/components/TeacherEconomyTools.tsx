import { useCallback, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type StudentOption = {
  id: string
  display_name: string | null
  wp: number
  gold: number
}

type CompletionOption = {
  id: string
  tile_id: string
  wp_awarded: number | null
  gold_awarded: number | null
  approved_at: string | null
  created_at: string
  tile: { guild: string; skill_name: string } | null
}

type GrantRow = {
  id: string
  student_id: string
  wp_delta: number
  gold_delta: number
  reason: string
  created_at: string
  student_name: string
}

type RpcResult = {
  ok?: boolean
  error?: string
  quest_name?: string
  wp_delta?: number
  gold_delta?: number
}

function studentLabel(student: StudentOption): string {
  return student.display_name?.trim() || `Student (${student.id.slice(0, 8)}…)`
}

function signedAmount(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function TeacherEconomyTools() {
  const [students, setStudents] = useState<StudentOption[]>([])
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [grantStudentId, setGrantStudentId] = useState('')
  const [wpDelta, setWpDelta] = useState('')
  const [goldDelta, setGoldDelta] = useState('')
  const [reason, setReason] = useState('')
  const [granting, setGranting] = useState(false)
  const [grantMessage, setGrantMessage] = useState<string | null>(null)
  const [grantError, setGrantError] = useState<string | null>(null)
  const [recentGrants, setRecentGrants] = useState<GrantRow[]>([])

  const [rescindStudentId, setRescindStudentId] = useState('')
  const [completions, setCompletions] = useState<CompletionOption[]>([])
  const [completionsLoading, setCompletionsLoading] = useState(false)
  const [selectedCompletionId, setSelectedCompletionId] = useState('')
  const [rescinding, setRescinding] = useState(false)
  const [rescindMessage, setRescindMessage] = useState<string | null>(null)
  const [rescindError, setRescindError] = useState<string | null>(null)

  const loadStudents = useCallback(async () => {
    await Promise.resolve()
    if (!isSupabaseConfigured) {
      setStudentsLoading(false)
      return
    }

    setStudentsLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, wp, gold')
      .eq('role', 'student')
      .is('archived_from_class_at', null)
      .order('display_name', { ascending: true })
    setStudentsLoading(false)

    if (error) {
      setLoadError(error.message)
      return
    }

    setLoadError(null)
    setStudents(
      (data ?? []).map((row) => ({
        id: row.id as string,
        display_name: (row.display_name as string | null) ?? null,
        wp: (row.wp as number) ?? 0,
        gold: (row.gold as number) ?? 0,
      })),
    )
  }, [])

  const loadRecentGrants = useCallback(async () => {
    if (!isSupabaseConfigured) return

    const { data, error } = await supabase
      .from('teacher_economy_grants')
      .select('id, student_id, wp_delta, gold_delta, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      setLoadError(error.message)
      return
    }

    const rows = data ?? []
    const studentIds = [...new Set(rows.map((row) => row.student_id as string))]
    const namesById = new Map<string, string>()

    if (studentIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', studentIds)

      if (profileError) {
        setLoadError(profileError.message)
        return
      }

      for (const profile of profiles ?? []) {
        namesById.set(
          profile.id as string,
          ((profile.display_name as string | null) ?? '').trim() ||
            `Student (${String(profile.id).slice(0, 8)}…)`,
        )
      }
    }

    setRecentGrants(
      rows.map((row) => ({
        id: row.id as string,
        student_id: row.student_id as string,
        wp_delta: (row.wp_delta as number) ?? 0,
        gold_delta: (row.gold_delta as number) ?? 0,
        reason: row.reason as string,
        created_at: row.created_at as string,
        student_name: namesById.get(row.student_id as string) ?? 'Unknown student',
      })),
    )
  }, [])

  const loadCompletions = useCallback(async (studentId: string) => {
    await Promise.resolve()
    setSelectedCompletionId('')
    setCompletions([])
    setRescindError(null)
    setRescindMessage(null)
    if (!studentId || !isSupabaseConfigured) return

    setCompletionsLoading(true)
    const { data, error } = await supabase
      .from('skill_completions')
      .select('id, tile_id, wp_awarded, gold_awarded, approved_at, created_at')
      .eq('student_id', studentId)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false, nullsFirst: false })
    setCompletionsLoading(false)

    if (error) {
      setRescindError(error.message)
      return
    }

    const rows = data ?? []
    const tileIds = [...new Set(rows.map((row) => row.tile_id as string))]
    const tilesById = new Map<string, { guild: string; skill_name: string }>()

    if (tileIds.length > 0) {
      const { data: tiles, error: tilesError } = await supabase
        .from('tiles')
        .select('id, guild, skill_name')
        .in('id', tileIds)

      if (tilesError) {
        setRescindError(tilesError.message)
        return
      }

      for (const tile of tiles ?? []) {
        tilesById.set(tile.id as string, {
          guild: tile.guild as string,
          skill_name: tile.skill_name as string,
        })
      }
    }

    setCompletions(
      rows.map((row) => ({
        id: row.id as string,
        tile_id: row.tile_id as string,
        wp_awarded: (row.wp_awarded as number | null) ?? null,
        gold_awarded: (row.gold_awarded as number | null) ?? null,
        approved_at: (row.approved_at as string | null) ?? null,
        created_at: row.created_at as string,
        tile: tilesById.get(row.tile_id as string) ?? null,
      })),
    )
  }, [])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadStudents()
      void loadRecentGrants()
    }, 0)
    return () => window.clearTimeout(loadTimer)
  }, [loadRecentGrants, loadStudents])

  const selectedGrantStudent = useMemo(
    () => students.find((student) => student.id === grantStudentId) ?? null,
    [grantStudentId, students],
  )

  const selectedCompletion = useMemo(
    () => completions.find((completion) => completion.id === selectedCompletionId) ?? null,
    [completions, selectedCompletionId],
  )

  const submitGrant = async (event: React.FormEvent) => {
    event.preventDefault()
    setGrantError(null)
    setGrantMessage(null)

    const parsedWp = wpDelta.trim() ? Number(wpDelta) : 0
    const parsedGold = goldDelta.trim() ? Number(goldDelta) : 0
    if (!Number.isInteger(parsedWp) || !Number.isInteger(parsedGold)) {
      setGrantError('WP and gold adjustments must be whole numbers.')
      return
    }

    setGranting(true)
    const { data, error } = await supabase.rpc('teacher_grant_economy', {
      p_student_id: grantStudentId,
      p_wp_delta: parsedWp,
      p_gold_delta: parsedGold,
      p_reason: reason.trim(),
    })
    setGranting(false)

    if (error) {
      setGrantError(error.message)
      return
    }

    const result = data as RpcResult | null
    if (!result?.ok) {
      setGrantError(result?.error ?? 'The adjustment could not be saved.')
      return
    }

    setGrantMessage(`Saved adjustment for ${selectedGrantStudent ? studentLabel(selectedGrantStudent) : 'student'}.`)
    setWpDelta('')
    setGoldDelta('')
    setReason('')
    await Promise.all([loadStudents(), loadRecentGrants()])
  }

  const rescindCompletion = async () => {
    if (!selectedCompletion) return
    const questName = selectedCompletion.tile?.skill_name ?? 'this quest'
    const student = students.find((row) => row.id === rescindStudentId)
    const name = student ? studentLabel(student) : 'this student'
    if (!window.confirm(`Rescind "${questName}" for ${name}? This will remove the completion and reverse its recorded WP and gold.`)) {
      return
    }

    setRescinding(true)
    setRescindError(null)
    setRescindMessage(null)
    const { data, error } = await supabase.rpc('teacher_rescind_skill_completion_with_log', {
      p_completion_id: selectedCompletion.id,
    })
    setRescinding(false)

    if (error) {
      setRescindError(error.message)
      return
    }

    const result = data as RpcResult | null
    if (!result?.ok) {
      setRescindError(result?.error ?? 'The completion could not be rescinded.')
      return
    }

    setRescindMessage(
      `Rescinded ${result.quest_name ?? questName}. Applied ${signedAmount(result.wp_delta ?? 0)} WP and ${signedAmount(result.gold_delta ?? 0)} gold.`,
    )
    await Promise.all([
      loadCompletions(rescindStudentId),
      loadStudents(),
      loadRecentGrants(),
    ])
  }

  const grantDisabled =
    granting ||
    !isSupabaseConfigured ||
    !grantStudentId ||
    !reason.trim() ||
    ((!wpDelta.trim() || Number(wpDelta) === 0) &&
      (!goldDelta.trim() || Number(goldDelta) === 0))

  return (
    <div className="teacher-economy-tools">
      <section className="teacher-panel-section teacher-economy-tool">
        <div className="card teacher-panel-student-block teacher-panel-award-card">
          <h2 className="teacher-panel-section-title">Student WP / gold adjustment</h2>
          <p className="muted teacher-panel-award-note">
            Make a small correction to a real student balance. Negative numbers remove WP or gold.
          </p>

          <form className="teacher-economy-form" onSubmit={(event) => void submitGrant(event)}>
            <label className="teacher-panel-reset-label teacher-economy-student-field">
              Student
              <select
                className="teacher-panel-select"
                value={grantStudentId}
                onChange={(event) => setGrantStudentId(event.target.value)}
                disabled={granting || studentsLoading}
              >
                <option value="">{studentsLoading ? 'Loading…' : 'Choose a student…'}</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {studentLabel(student)}
                  </option>
                ))}
              </select>
            </label>

            {selectedGrantStudent ? (
              <dl className="teacher-panel-preview-balance">
                <div>
                  <dt>Current WP</dt>
                  <dd>{selectedGrantStudent.wp}</dd>
                </div>
                <div>
                  <dt>Current gold</dt>
                  <dd>{selectedGrantStudent.gold}</dd>
                </div>
              </dl>
            ) : null}

            <div className="teacher-panel-award-form">
              <label className="teacher-panel-award-field">
                <span>WP delta</span>
                <input
                  type="number"
                  step={1}
                  value={wpDelta}
                  onChange={(event) => setWpDelta(event.target.value)}
                  disabled={granting}
                  placeholder="0"
                />
              </label>
              <label className="teacher-panel-award-field">
                <span>Gold delta</span>
                <input
                  type="number"
                  step={1}
                  value={goldDelta}
                  onChange={(event) => setGoldDelta(event.target.value)}
                  disabled={granting}
                  placeholder="0"
                />
              </label>
            </div>

            <label className="teacher-panel-award-field">
              <span>Reason (visible only to you)</span>
              <input
                type="text"
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={granting}
                required
              />
            </label>

            {grantError ? <p className="error" role="alert">{grantError}</p> : null}
            {grantMessage ? <p className="teacher-economy-success" role="status">{grantMessage}</p> : null}
            {loadError ? <p className="error" role="alert">{loadError}</p> : null}

            <button type="submit" className="btn-primary" disabled={grantDisabled}>
              {granting ? 'Saving…' : 'Apply adjustment'}
            </button>
          </form>

          <details className="teacher-economy-history">
            <summary>Recent grants</summary>
            {recentGrants.length === 0 ? (
              <p className="muted">No adjustments have been logged yet.</p>
            ) : (
              <ul className="teacher-panel-mini-list">
                {recentGrants.map((grant) => (
                  <li key={grant.id} className="teacher-economy-history-row">
                    <strong>{grant.student_name}</strong>
                    <span>{signedAmount(grant.wp_delta)} WP · {signedAmount(grant.gold_delta)} gold</span>
                    <span>{grant.reason}</span>
                    <time dateTime={grant.created_at}>{displayDate(grant.created_at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </details>
        </div>
      </section>

      <section className="teacher-panel-section teacher-economy-tool">
        <div className="card teacher-panel-student-block teacher-panel-award-card">
          <h2 className="teacher-panel-section-title">Rescind quest completion</h2>
          <p className="muted teacher-panel-award-note">
            Remove one approved completion and reverse the exact WP and gold recorded for it.
          </p>

          <label className="teacher-panel-reset-label teacher-economy-student-field">
            Student
            <select
              className="teacher-panel-select"
              value={rescindStudentId}
              onChange={(event) => {
                const studentId = event.target.value
                setRescindStudentId(studentId)
                void loadCompletions(studentId)
              }}
              disabled={rescinding || studentsLoading}
            >
              <option value="">{studentsLoading ? 'Loading…' : 'Choose a student…'}</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {studentLabel(student)}
                </option>
              ))}
            </select>
          </label>

          {completionsLoading ? (
            <p className="muted">Loading completed quests…</p>
          ) : rescindStudentId && completions.length === 0 ? (
            <p className="muted">This student has no approved quest completions.</p>
          ) : (
            <fieldset className="teacher-economy-completions">
              <legend className="sr-only">Completed quests</legend>
              {completions.map((completion) => {
                const awardsMissing = completion.wp_awarded == null || completion.gold_awarded == null
                return (
                  <label key={completion.id} className="teacher-economy-completion">
                    <input
                      type="radio"
                      name="completion-to-rescind"
                      value={completion.id}
                      checked={selectedCompletionId === completion.id}
                      onChange={() => setSelectedCompletionId(completion.id)}
                      disabled={rescinding || awardsMissing}
                    />
                    <span>
                      <strong>{completion.tile?.skill_name ?? 'Unknown quest'}</strong>
                      <span>
                        {completion.tile?.guild ?? 'Unknown guild'} ·{' '}
                        {displayDate(completion.approved_at ?? completion.created_at)}
                      </span>
                      <span>
                        {awardsMissing
                          ? 'Recorded award amounts are missing; this completion cannot be safely rescinded here.'
                          : `${completion.wp_awarded} WP · ${completion.gold_awarded} gold`}
                      </span>
                    </span>
                  </label>
                )
              })}
            </fieldset>
          )}

          {rescindError ? <p className="error" role="alert">{rescindError}</p> : null}
          {rescindMessage ? <p className="teacher-economy-success" role="status">{rescindMessage}</p> : null}

          <button
            type="button"
            className="btn-secondary teacher-economy-rescind"
            disabled={!selectedCompletion || rescinding || !isSupabaseConfigured}
            onClick={() => void rescindCompletion()}
          >
            {rescinding ? 'Rescinding…' : 'Rescind selected completion'}
          </button>
        </div>
      </section>
    </div>
  )
}
