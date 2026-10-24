/*
 * One-shot class event overlay. Checks once after a student session+profile exist.
 * No polling, no Realtime. Teachers, guests, and cleanup kiosks skip it.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isGuestBrowse } from '../lib/schoolEmail'
import { isTeacherProfile } from '../lib/teacher'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { withWriteTimeout } from '../lib/writeTimeout'
import {
  answerMeetsMinimum,
  minLengthForQuestion,
  parsePopupEventBlocks,
  popupEventQuestions,
} from '../lib/popupEvent'
import type { PopupEventPending } from '../types/popupEvent'
import { needsPreferredFirstName } from '../lib/preferredFirstName'

type RpcResult = {
  ok?: boolean
  error?: string
  reward_wp?: number
  reward_gold?: number
}

export function PopupEventGate() {
  const { user, profile, loading, studentPreviewMode, refreshProfile } = useAuth()
  const { pathname } = useLocation()
  const fetchedForUserRef = useRef<string | null>(null)
  const [pending, setPending] = useState<PopupEventPending | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [thanks, setThanks] = useState<{ wp: number; gold: number } | null>(null)

  const skipPath =
    pathname.startsWith('/cleanup') || pathname.startsWith('/auth/callback') || pathname === '/login'

  const eligible = Boolean(
    user &&
      profile &&
      !loading &&
      !skipPath &&
      !isTeacherProfile(profile) &&
      !studentPreviewMode &&
      !isGuestBrowse(user.email ?? profile.email, profile) &&
      !needsPreferredFirstName(profile),
  )

  useEffect(() => {
    if (!user?.id) {
      fetchedForUserRef.current = null
      setPending(null)
      setThanks(null)
      setAnswers({})
      return
    }
    if (!eligible || !isSupabaseConfigured) return
    if (fetchedForUserRef.current === user.id) return
    fetchedForUserRef.current = user.id
    let cancelled = false
    void (async () => {
      const { data, error: rpcError } = await supabase.rpc('student_pending_popup_event')
      if (cancelled) return
      if (rpcError) {
        console.error('pending popup event:', rpcError.message)
        return
      }
      if (!data || typeof data !== 'object') return
      const row = data as Record<string, unknown>
      const id = typeof row.id === 'string' ? row.id : ''
      const title = typeof row.title === 'string' ? row.title : ''
      if (!id || !title) return
      setPending({
        id,
        title,
        intro_text: typeof row.intro_text === 'string' ? row.intro_text : '',
        questions: parsePopupEventBlocks(row.questions),
        reward_wp: typeof row.reward_wp === 'number' ? row.reward_wp : 0,
        reward_gold: typeof row.reward_gold === 'number' ? row.reward_gold : 0,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [eligible, user?.id])

  const questions = useMemo(
    () => (pending ? popupEventQuestions(pending.questions) : []),
    [pending],
  )

  const allReady =
    pending != null &&
    questions.every((q) => answerMeetsMinimum(answers[q.id] ?? '', minLengthForQuestion(q)))

  if (!pending) return null

  const onSubmit = async () => {
    if (!allReady || submitting) return
    setSubmitting(true)
    setError(null)
    const payload: Record<string, string> = {}
    for (const q of questions) {
      payload[q.id] = (answers[q.id] ?? '').trim()
    }
    try {
      const { data, error: rpcError } = await withWriteTimeout(
        supabase.rpc('submit_popup_event_response', {
          p_event_id: pending.id,
          p_answers: payload,
        }),
      )
      if (rpcError) throw rpcError
      const result = data as RpcResult | null
      if (!result?.ok) {
        setError(result?.error?.trim() || 'Could not save. Check the network and try again.')
        return
      }
      setThanks({
        wp: result.reward_wp ?? pending.reward_wp,
        gold: result.reward_gold ?? pending.reward_gold,
      })
      void refreshProfile()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save. Check the network and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (thanks) {
    return (
      <div className="preferred-name-gate popup-event-gate" role="dialog" aria-modal="true" aria-labelledby="popup-event-thanks">
        <div className="preferred-name-card popup-event-card">
          <p className="preferred-name-card__eyebrow">Done</p>
          <h1 id="popup-event-thanks" className="preferred-name-card__title">
            Thanks. You earned {thanks.wp} WP and {thanks.gold} gold.
          </h1>
          <p className="preferred-name-card__body">You can keep going in the workshop.</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setPending(null)
              setThanks(null)
            }}
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="preferred-name-gate popup-event-gate" role="dialog" aria-modal="true" aria-labelledby="popup-event-title">
      <form
        className="preferred-name-card popup-event-card"
        onSubmit={(e) => {
          e.preventDefault()
          void onSubmit()
        }}
      >
        <p className="preferred-name-card__eyebrow">Class check-in</p>
        <h1 id="popup-event-title" className="preferred-name-card__title">
          {pending.title}
        </h1>
        <p className="preferred-name-card__body popup-event-intro">{pending.intro_text}</p>
        <p className="popup-event-privacy">Only Mr. Cook sees your answers.</p>

        {pending.questions.map((block) => {
          if (block.kind === 'note') {
            return (
              <div key={block.id} className="popup-event-note">
                {block.title ? <h2 className="popup-event-note-title">{block.title}</h2> : null}
                <ul>
                  {block.items.map((item) => (
                    <li key={item}>
                      <strong>{item.split(':')[0]}:</strong>
                      {item.includes(':') ? item.slice(item.indexOf(':') + 1) : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )
          }
          const min = minLengthForQuestion(block)
          const value = answers[block.id] ?? ''
          const tooShort = value.trim().length > 0 && !answerMeetsMinimum(value, min)
          return (
            <label key={block.id} className="popup-event-field">
              <span className="popup-event-prompt">{block.prompt}</span>
              {block.hint ? <span className="popup-event-hint">{block.hint}</span> : null}
              <textarea
                rows={4}
                value={value}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [block.id]: e.target.value }))}
                disabled={submitting}
              />
              {tooShort ? (
                <span className="popup-event-short">A couple more sentences will do — keep going.</span>
              ) : null}
            </label>
          )
        })}

        {error ? (
          <p className="preferred-name-card__error" role="alert">
            {error} Your writing is still here. Try Submit again.
          </p>
        ) : null}

        <button className="btn-primary" type="submit" disabled={!allReady || submitting}>
          {submitting ? 'Saving…' : 'Submit'}
        </button>
      </form>
    </div>
  )
}
