/*
 * Teacher student progress — class survey / pop-up event answers
 *
 * Loaded only after a teacher clicks a student. One pair of queries, no polling.
 * Shown so comments and grades can use the same page as completed quests.
 */

import { useEffect, useState } from 'react'
import { parsePopupEventBlocks, popupEventQuestions } from '../lib/popupEvent'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { PopupEventBlock, PopupEventResponseRow, PopupEventRow } from '../types/popupEvent'

type Props = {
  studentId: string
}

type EventWithResponse = {
  event: Pick<PopupEventRow, 'id' | 'title' | 'questions' | 'created_at'>
  response: PopupEventResponseRow | null
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; rows: EventWithResponse[] }

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function answersText(eventTitle: string, blocks: PopupEventBlock[], answers: Record<string, string>): string {
  const lines = [eventTitle]
  for (const q of popupEventQuestions(blocks)) {
    lines.push('', q.prompt, answers[q.id]?.trim() || '—')
  }
  return lines.join('\n')
}

export function TeacherStudentSurveyResponses({ studentId }: Props) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({ status: 'error', message: 'Supabase is not configured.' })
      return
    }
    let cancelled = false
    setState({ status: 'loading' })
    void (async () => {
      const [evRes, respRes] = await Promise.all([
        supabase
          .from('popup_events')
          .select('id, title, questions, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('popup_event_responses')
          .select('id, event_id, student_id, answers, submitted_at, skipped_by_teacher, skipped_reason')
          .eq('student_id', studentId),
      ])
      if (cancelled) return
      if (evRes.error) {
        setState({ status: 'error', message: evRes.error.message })
        return
      }
      if (respRes.error) {
        setState({ status: 'error', message: respRes.error.message })
        return
      }
      const responses = (respRes.data ?? []) as PopupEventResponseRow[]
      const byEvent = new Map(responses.map((r) => [r.event_id, r]))
      const rows: EventWithResponse[] = (evRes.data ?? []).map((raw) => {
        const event = {
          id: raw.id as string,
          title: raw.title as string,
          questions: parsePopupEventBlocks(raw.questions),
          created_at: raw.created_at as string,
        }
        const response = byEvent.get(event.id) ?? null
        const answers =
          response && response.answers && typeof response.answers === 'object'
            ? (response.answers as Record<string, string>)
            : {}
        return {
          event,
          response: response ? { ...response, answers } : null,
        }
      })
      setState({ status: 'ready', rows })
    })()
    return () => {
      cancelled = true
    }
  }, [studentId])

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(key)
      window.setTimeout(() => setCopiedId((id) => (id === key ? null : id)), 1600)
    } catch {
      setCopiedId(null)
    }
  }

  const copySurvey = async (row: EventWithResponse) => {
    if (!row.response || row.response.skipped_by_teacher) return
    await copyText(row.event.id, answersText(row.event.title, row.event.questions, row.response.answers))
  }

  if (state.status === 'loading') {
    return <p className="muted">Loading surveys…</p>
  }
  if (state.status === 'error') {
    return (
      <p className="error" role="alert">
        {state.message}
      </p>
    )
  }
  if (state.rows.length === 0) {
    return <p className="muted">No class surveys yet.</p>
  }

  const submitted = state.rows.filter((row) => row.response && !row.response.skipped_by_teacher)
  const allCopy = submitted
    .map((row) => answersText(row.event.title, row.event.questions, row.response?.answers ?? {}))
    .join('\n\n')

  return (
    <>
      {submitted.length > 0 ? (
        <button
          type="button"
          className="btn-secondary teacher-panel-survey-copy-all"
          onClick={() => void copyText('all', allCopy)}
        >
          {copiedId === 'all' ? 'Copied' : 'Copy all surveys'}
        </button>
      ) : null}
    <ul className="teacher-panel-mini-list">
      {state.rows.map((row) => {
        const questions = popupEventQuestions(row.event.questions)
        const skipped = Boolean(row.response?.skipped_by_teacher)
        const didSubmit = Boolean(row.response && !skipped)
        const status = skipped ? 'skipped' : didSubmit ? 'submitted' : 'waiting'
        return (
          <li key={row.event.id} className="teacher-panel-mini-row teacher-panel-mini-row--reset">
            <div className="teacher-panel-mini-main">
              <span className="teacher-panel-mini-title">{row.event.title}</span>
              <span className="teacher-panel-mini-meta muted">
                {status}
                {row.response ? ` · ${formatWhen(row.response.submitted_at)}` : ''}
              </span>
            </div>
            {didSubmit ? (
              <div className="teacher-panel-mini-actions">
                <button type="button" className="btn-secondary" onClick={() => void copySurvey(row)}>
                  {copiedId === row.event.id ? 'Copied' : 'Copy for comments'}
                </button>
              </div>
            ) : null}
            <div className="teacher-panel-student-answers">
              {skipped ? (
                <p className="muted">Skipped: {row.response?.skipped_reason || '—'}</p>
              ) : null}
              {!row.response ? <p className="muted">Not submitted yet.</p> : null}
              {didSubmit
                ? row.event.questions.map((block) =>
                    block.kind === 'note' ? (
                      <div key={block.id} className="teacher-panel-survey-note">
                        {block.title ? <p className="patent-label">{block.title}</p> : null}
                        <ul>
                          {block.items.map((item) => (
                            <li key={item} className="muted">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div key={block.id} className="teacher-panel-survey-qa">
                        <p className="patent-label">{block.prompt}</p>
                        <p className="teacher-panel-patent-copy">{row.response?.answers[block.id] || '—'}</p>
                      </div>
                    ),
                  )
                : null}
              {didSubmit && questions.length === 0 ? <p className="muted">No questions on this survey.</p> : null}
            </div>
          </li>
        )
      })}
    </ul>
    </>
  )
}
