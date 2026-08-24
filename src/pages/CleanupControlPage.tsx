/*
 * Laptop control for the classroom cleanup kiosk (`/cleanup`)
 *
 * Public page: pick a class, edit the typed roster, press Start Cleanup.
 * That inserts a `cleanup_triggers` row (with the random draw already computed)
 * so the Pi at `/cleanup/display` can animate the same pairings over Realtime.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { assignCleanupJobs, normalizeStudentNames } from '../lib/cleanupJobs'
import './cleanup.css'

type CleanupClassRow = {
  id: string
  class_name: string
  students: unknown
}

type ClassCardState = {
  id: string
  className: string
  students: string[]
  draft: string
  sending: boolean
  saving: boolean
  status: string | null
  error: string | null
}

function toCard(row: CleanupClassRow): ClassCardState {
  return {
    id: row.id,
    className: row.class_name,
    students: normalizeStudentNames(row.students),
    draft: '',
    sending: false,
    saving: false,
    status: null,
    error: null,
  }
}

export function CleanupControlPage() {
  const [cards, setCards] = useState<ClassCardState[]>([])
  const [loadError, setLoadError] = useState<string | null>(
    isSupabaseConfigured ? null : 'Supabase is not configured in this environment.',
  )
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from('cleanup_classes')
        .select('id, class_name, students')
        .order('class_name')
      if (cancelled) return
      if (error) {
        setLoadError(error.message)
        setLoading(false)
        return
      }
      setCards((data ?? []).map((row) => toCard(row as CleanupClassRow)))
      setLoadError(null)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const patchCard = (id: string, patch: Partial<ClassCardState>) => {
    setCards((prev) => prev.map((card) => (card.id === id ? { ...card, ...patch } : card)))
  }

  const persistStudents = async (card: ClassCardState, students: string[]) => {
    patchCard(card.id, { saving: true, error: null })
    const { error } = await supabase
      .from('cleanup_classes')
      .update({ students })
      .eq('id', card.id)
    if (error) {
      patchCard(card.id, { saving: false, error: error.message })
      return false
    }
    patchCard(card.id, { students, saving: false, error: null })
    return true
  }

  const addStudent = async (card: ClassCardState) => {
    const name = card.draft.trim()
    if (!name) return
    const exists = card.students.some((s) => s.toLowerCase() === name.toLowerCase())
    if (exists) {
      patchCard(card.id, { error: `${name} is already on this roster.`, draft: '' })
      return
    }
    const next = [...card.students, name]
    const ok = await persistStudents(card, next)
    if (ok) patchCard(card.id, { draft: '', status: null })
  }

  const removeStudent = async (card: ClassCardState, name: string) => {
    const next = card.students.filter((s) => s !== name)
    await persistStudents(card, next)
  }

  const startCleanup = async (card: ClassCardState) => {
    if (card.students.length === 0 || card.sending) return
    const assignments = assignCleanupJobs(card.students)
    patchCard(card.id, { sending: true, error: null, status: null })
    const { error } = await supabase.from('cleanup_triggers').insert({
      class_id: card.id,
      class_name: card.className,
      assignments,
    })
    if (error) {
      patchCard(card.id, { sending: false, error: error.message })
      return
    }
    patchCard(card.id, {
      sending: false,
      status: `Sent ${assignments.length} job${assignments.length === 1 ? '' : 's'} to the display.`,
    })
  }

  return (
    <div className="cleanup-control">
      <header className="cleanup-control__header">
        <p className="cleanup-control__eyebrow">Classroom kiosk</p>
        <h1 className="cleanup-control__title">Cleanup</h1>
        <p className="cleanup-control__lede">
          Add names, then start cleanup. The Pi display at{' '}
          <Link to="/cleanup/display">/cleanup/display</Link> listens live and reveals the draw.
        </p>
      </header>

      {!isSupabaseConfigured && (
        <p className="cleanup-control__banner cleanup-control__banner--error">
          Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.
        </p>
      )}
      {loadError && (
        <p className="cleanup-control__banner cleanup-control__banner--error">{loadError}</p>
      )}
      {loading && <p className="cleanup-control__muted">Loading classes…</p>}

      <div className="cleanup-control__grid">
        {cards.map((card) => (
          <section key={card.id} className="cleanup-control__card">
            <h2 className="cleanup-control__class">{card.className}</h2>
            <p className="cleanup-control__count">
              {card.students.length} student{card.students.length === 1 ? '' : 's'}
            </p>

            <ul className="cleanup-control__roster">
              {card.students.length === 0 && (
                <li className="cleanup-control__empty">Roster is empty — add names when they are ready.</li>
              )}
              {card.students.map((name) => (
                <li key={name} className="cleanup-control__student">
                  <span>{name}</span>
                  <button
                    type="button"
                    className="cleanup-control__remove"
                    onClick={() => void removeStudent(card, name)}
                    aria-label={`Remove ${name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <form
              className="cleanup-control__add"
              onSubmit={(e) => {
                e.preventDefault()
                void addStudent(card)
              }}
            >
              <input
                className="cleanup-control__input"
                value={card.draft}
                onChange={(e) => patchCard(card.id, { draft: e.target.value, error: null })}
                placeholder="Add a student name"
                autoComplete="off"
              />
              <button type="submit" className="btn-secondary" disabled={card.saving || !card.draft.trim()}>
                Add
              </button>
            </form>

            <button
              type="button"
              className="btn-primary cleanup-control__start"
              disabled={card.students.length === 0 || card.sending || card.saving}
              onClick={() => void startCleanup(card)}
            >
              {card.sending ? 'Sending…' : 'Start cleanup'}
            </button>

            {card.status && <p className="cleanup-control__status">{card.status}</p>}
            {card.error && <p className="cleanup-control__error">{card.error}</p>}
          </section>
        ))}
      </div>

      <aside className="cleanup-control__pi">
        <h3>Raspberry Pi kiosk</h3>
        <p>
          Open the display URL in Chromium kiosk mode so it can play sound without a tap:
        </p>
        <pre className="cleanup-control__code">{`chromium-browser --kiosk --autoplay-policy=no-user-gesture-required \\
  https://mandarb77-nexus-academy.vercel.app/cleanup/display`}</pre>
      </aside>
    </div>
  )
}
