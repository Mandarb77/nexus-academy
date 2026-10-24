/*
 * Pop-up events admin (`/teacher/events`)
 * Activate at most one event. Students hit it on next login. Skip does not award WP/gold.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import {
  compareStudentsForGradeBook,
  gradeBookRosterLabel,
} from '../lib/gradeBookExport'
import { parsePopupEventBlocks, popupEventQuestions } from '../lib/popupEvent'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { PopupEventBlock, PopupEventResponseRow, PopupEventRow } from '../types/popupEvent'

type StudentRow = { id: string; display_name: string | null; email: string | null }

type RpcResult = { ok?: boolean; error?: string }

function blankEvent(): Omit<PopupEventRow, 'id' | 'created_at'> {
  return {
    title: '',
    intro_text: '',
    questions: [],
    reward_wp: 0,
    reward_gold: 0,
    is_active: false,
    required: true,
  }
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function TeacherEventsPage() {
  const { signOut } = useAuth()
  const [events, setEvents] = useState<PopupEventRow[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [responses, setResponses] = useState<PopupEventResponseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState(blankEvent())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [readStudentId, setReadStudentId] = useState('')
  const [skipReason, setSkipReason] = useState('')
  const [skippingId, setSkippingId] = useState<string | null>(null)

  const selected = events.find((e) => e.id === selectedId) ?? null
  const questions = popupEventQuestions(form.questions)

  const loadAll = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [evRes, stRes] = await Promise.all([
      supabase.from('popup_events').select('*').order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, display_name, email')
        .eq('role', 'student')
        .is('archived_from_class_at', null),
    ])
    setLoading(false)
    if (evRes.error) {
      setLoadError(evRes.error.message)
      return
    }
    if (stRes.error) {
      setLoadError(stRes.error.message)
      return
    }
    setLoadError(null)
    const rows = ((evRes.data ?? []) as PopupEventRow[]).map((row) => ({
      ...row,
      questions: parsePopupEventBlocks(row.questions),
    }))
    setEvents(rows)
    setStudents(
      [...((stRes.data ?? []) as StudentRow[])].sort((a, b) => compareStudentsForGradeBook(a, b, 'last')),
    )
  }, [])

  const loadResponses = useCallback(async (eventId: string) => {
    const { data, error: qErr } = await supabase
      .from('popup_event_responses')
      .select('id, event_id, student_id, answers, submitted_at, skipped_by_teacher, skipped_reason')
      .eq('event_id', eventId)
    if (qErr) {
      setError(qErr.message)
      return
    }
    setResponses(
      ((data ?? []) as PopupEventResponseRow[]).map((row) => ({
        ...row,
        answers: row.answers && typeof row.answers === 'object' ? row.answers : {},
      })),
    )
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!selectedId) {
      setResponses([])
      return
    }
    void loadResponses(selectedId)
  }, [selectedId, loadResponses])

  const responseByStudent = useMemo(() => {
    const map = new Map<string, PopupEventResponseRow>()
    for (const r of responses) map.set(r.student_id, r)
    return map
  }, [responses])

  const unanswered = students.filter((s) => !responseByStudent.has(s.id))

  const loadIntoForm = (row: PopupEventRow) => {
    setSelectedId(row.id)
    setForm({
      title: row.title,
      intro_text: row.intro_text,
      questions: row.questions,
      reward_wp: row.reward_wp,
      reward_gold: row.reward_gold,
      is_active: row.is_active,
      required: row.required,
    })
    setMessage(null)
    setError(null)
  }

  const startNew = () => {
    setSelectedId(null)
    setForm(blankEvent())
    setMessage(null)
    setError(null)
  }

  const saveEvent = async () => {
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      title: form.title.trim(),
      intro_text: form.intro_text,
      questions: form.questions,
      reward_wp: Number(form.reward_wp) || 0,
      reward_gold: Number(form.reward_gold) || 0,
      required: form.required,
    }
    if (selectedId) {
      const { error: uErr } = await supabase.from('popup_events').update(payload).eq('id', selectedId)
      setSaving(false)
      if (uErr) {
        setError(uErr.message)
        return
      }
    } else {
      const { data, error: iErr } = await supabase.from('popup_events').insert(payload).select('id').single()
      setSaving(false)
      if (iErr || !data) {
        setError(iErr?.message ?? 'Could not save.')
        return
      }
      setSelectedId((data as { id: string }).id)
    }
    setMessage('Saved.')
    await loadAll()
  }

  const toggleActive = async (row: PopupEventRow) => {
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('set_popup_event_active', {
      p_event_id: row.id,
      p_active: !row.is_active,
    })
    const result = data as RpcResult | null
    if (rpcError || !result?.ok) {
      setError(rpcError?.message ?? result?.error ?? 'Could not change status.')
      return
    }
    setMessage(row.is_active ? 'Event is off. Students will not see it.' : 'Event is on. Students see it on next login.')
    await loadAll()
  }

  const skipStudent = async (studentId: string) => {
    if (!selectedId || !skipReason.trim()) {
      setError('Write a skip reason first.')
      return
    }
    setSkippingId(studentId)
    const { data, error: rpcError } = await supabase.rpc('skip_popup_event_for_student', {
      p_event_id: selectedId,
      p_student_id: studentId,
      p_reason: skipReason.trim(),
    })
    setSkippingId(null)
    const result = data as RpcResult | null
    if (rpcError || !result?.ok) {
      setError(rpcError?.message ?? result?.error ?? 'Could not skip.')
      return
    }
    setMessage('Skipped. No WP or gold.')
    await loadResponses(selectedId)
  }

  const readResponse = selectedId ? responseByStudent.get(readStudentId) : undefined
  const readStudent = students.find((s) => s.id === readStudentId)

  const copyStudentAnswers = async () => {
    if (!readStudent || !readResponse || readResponse.skipped_by_teacher) return
    const lines = [
      gradeBookRosterLabel(readStudent, 'last'),
      ...questions.map((q) => `${q.prompt}\n${readResponse.answers[q.id] ?? ''}`),
    ]
    await navigator.clipboard.writeText(lines.join('\n\n'))
    setMessage('Copied this student’s answers.')
  }

  const exportCsv = () => {
    const headers = [
      'Last, First',
      'Status',
      'Submitted',
      ...questions.map((_, i) => `Q${i + 1}`),
      'Skip reason',
    ]
    const lines = [headers.map(csvEscape).join(',')]
    for (const student of students) {
      const resp = responseByStudent.get(student.id)
      const status = !resp ? 'not submitted' : resp.skipped_by_teacher ? 'skipped' : 'submitted'
      const submitted = resp?.submitted_at ? new Date(resp.submitted_at).toISOString() : ''
      const cols = [
        gradeBookRosterLabel(student, 'last'),
        status,
        submitted,
        ...questions.map((q) => resp?.answers[q.id] ?? ''),
        resp?.skipped_reason ?? '',
      ]
      lines.push(cols.map((c) => csvEscape(String(c))).join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(selected?.title || 'event').replace(/\s+/g, '-')}-responses.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const updateQuestion = (id: string, patch: Partial<PopupEventBlock>) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((b) => (b.id === id ? ({ ...b, ...patch } as PopupEventBlock) : b)),
    }))
  }

  const addQuestion = () => {
    const id = `q${Date.now()}`
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, { kind: 'question', id, prompt: '', min_length: 25 }],
    }))
  }

  const addNote = () => {
    const id = `note-${Date.now()}`
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, { kind: 'note', id, title: '', items: [] }],
    }))
  }

  return (
    <div className="app-shell bench-chrome teacher-panel-page">
      <header className="teacher-panel-header">
        <MainNav variant="teacher" />
        <div className="teacher-panel-top-row">
          <div>
            <h1 className="teacher-panel-title bench-page-title">Pop-up events</h1>
            <p className="muted teacher-panel-subtitle">
              One active event at a time. Students see it the next time they log in. Answers are
              teacher-only.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {loading ? <p className="muted">Loading…</p> : null}
      {loadError ? (
        <p className="error" role="alert">
          {loadError}
        </p>
      ) : null}
      {message ? <p className="muted">{message}</p> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="teacher-panel-section">
        <h2 className="teacher-panel-section-title">Events</h2>
        <p className="muted teacher-panel-award-note">
          Only one can be on. Turning a new one on turns the previous one off.
        </p>
        {events.length === 0 ? (
          <p className="muted teacher-panel-section-empty">No events yet.</p>
        ) : (
          <ul className="teacher-event-list">
            {events.map((row) => (
              <li key={row.id}>
                <button type="button" className="btn-secondary" onClick={() => loadIntoForm(row)}>
                  {row.title}
                </button>
                <span className="muted">{row.is_active ? 'Active' : 'Inactive'}</span>
                <button type="button" className="btn-secondary" onClick={() => void toggleActive(row)}>
                  {row.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn-secondary" onClick={startNew}>
          New event
        </button>
      </section>

      <section className="teacher-panel-section" style={{ maxWidth: '720px' }}>
        <h2 className="teacher-panel-section-title">
          {selectedId ? `Editing: ${form.title || 'Event'}` : 'New event'}
        </h2>
        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Title *</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
        </label>
        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Intro</span>
          <textarea
            rows={5}
            value={form.intro_text}
            onChange={(e) => setForm((p) => ({ ...p, intro_text: e.target.value }))}
          />
        </label>
        <label className="patent-field" style={{ display: 'inline-block', marginRight: '1rem' }}>
          <span className="patent-label">WP</span>
          <input
            type="number"
            min={0}
            value={form.reward_wp}
            onChange={(e) => setForm((p) => ({ ...p, reward_wp: Number(e.target.value) }))}
          />
        </label>
        <label className="patent-field" style={{ display: 'inline-block' }}>
          <span className="patent-label">Gold</span>
          <input
            type="number"
            min={0}
            value={form.reward_gold}
            onChange={(e) => setForm((p) => ({ ...p, reward_gold: Number(e.target.value) }))}
          />
        </label>

        <h3 className="teacher-panel-section-title" style={{ marginTop: '1.25rem' }}>
          Questions and notes
        </h3>
        <p className="muted">A note is a read-only list (used for Habits of Learning between questions).</p>
        {form.questions.map((block) =>
          block.kind === 'note' ? (
            <div key={block.id} className="teacher-panel-section" style={{ margin: '0.75rem 0', padding: '0.75rem' }}>
              <span className="patent-label">Note</span>
              <input
                type="text"
                placeholder="Heading"
                value={block.title ?? ''}
                onChange={(e) => updateQuestion(block.id, { title: e.target.value })}
              />
              <textarea
                rows={4}
                placeholder="One list item per line"
                value={block.items.join('\n')}
                onChange={(e) =>
                  updateQuestion(block.id, { items: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })
                }
              />
            </div>
          ) : (
            <div key={block.id} className="teacher-panel-section" style={{ margin: '0.75rem 0', padding: '0.75rem' }}>
              <span className="patent-label">Question</span>
              <textarea
                rows={3}
                value={block.prompt}
                onChange={(e) => updateQuestion(block.id, { prompt: e.target.value })}
              />
              <label className="patent-field">
                <span className="patent-label">Minimum characters</span>
                <input
                  type="number"
                  min={1}
                  value={block.min_length ?? 25}
                  onChange={(e) => updateQuestion(block.id, { min_length: Number(e.target.value) || 25 })}
                />
              </label>
            </div>
          ),
        )}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button type="button" className="btn-secondary" onClick={addQuestion}>
            Add question
          </button>
          <button type="button" className="btn-secondary" onClick={addNote}>
            Add note / list
          </button>
        </div>
        <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveEvent()}>
          {saving ? 'Saving…' : 'Save event'}
        </button>
      </section>

      {selectedId ? (
        <>
          <section className="teacher-panel-section">
            <h2 className="teacher-panel-section-title">Who has responded</h2>
            <p className="muted">
              {responses.filter((r) => !r.skipped_by_teacher).length} submitted · {responses.filter((r) => r.skipped_by_teacher).length} skipped ·{' '}
              {unanswered.length} waiting
            </p>
            <button type="button" className="btn-secondary" onClick={exportCsv}>
              Export CSV
            </button>
            <label className="patent-field" style={{ display: 'block', margin: '0.75rem 0' }}>
              <span className="patent-label">Skip reason (required before skip)</span>
              <input type="text" value={skipReason} onChange={(e) => setSkipReason(e.target.value)} />
            </label>
            <h3 className="teacher-panel-section-title">Waiting</h3>
            {unanswered.length === 0 ? (
              <p className="muted">Everyone has a response or skip.</p>
            ) : (
              <ul className="teacher-event-list">
                {unanswered.map((s) => (
                  <li key={s.id}>
                    <span>{gradeBookRosterLabel(s, 'last')}</span>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={skippingId === s.id}
                      onClick={() => void skipStudent(s.id)}
                    >
                      {skippingId === s.id ? 'Skipping…' : 'Skip for this student'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="teacher-panel-section" style={{ maxWidth: '720px' }}>
            <h2 className="teacher-panel-section-title">Read answers</h2>
            <label className="patent-field">
              <span className="patent-label">Student</span>
              <select value={readStudentId} onChange={(e) => setReadStudentId(e.target.value)}>
                <option value="">Select…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {gradeBookRosterLabel(s, 'last')}
                    {responseByStudent.get(s.id)?.skipped_by_teacher
                      ? ' (skipped)'
                      : responseByStudent.get(s.id)
                        ? ' (submitted)'
                        : ' (waiting)'}
                  </option>
                ))}
              </select>
            </label>
            {readStudent && !readResponse ? <p className="muted">No response yet.</p> : null}
            {readResponse?.skipped_by_teacher ? (
              <p className="muted">Skipped: {readResponse.skipped_reason}</p>
            ) : null}
            {readResponse && !readResponse.skipped_by_teacher
              ? questions.map((q) => (
                  <div key={q.id} style={{ marginTop: '1rem' }}>
                    <p className="patent-label">{q.prompt}</p>
                    <p className="teacher-panel-patent-copy">{readResponse.answers[q.id] || '—'}</p>
                  </div>
                ))
              : null}
            {readResponse && !readResponse.skipped_by_teacher ? (
              <button type="button" className="btn-secondary" onClick={() => void copyStudentAnswers()}>
                Copy all for this student
              </button>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  )
}
