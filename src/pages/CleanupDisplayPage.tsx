/*
 * Raspberry Pi kiosk display (`/cleanup/display`)
 *
 * No controls: waits for INSERT on `cleanup_triggers` via Supabase Realtime, plays a
 * dice-roll click train, then reveals each student → job pairing 500ms apart with a ding.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { parseAssignments, type CleanupAssignment } from '../lib/cleanupJobs'
import {
  CLEANUP_DICE_MS,
  CLEANUP_REVEAL_GAP_MS,
  isCleanupAudioUnlocked,
  playDiceRollSound,
  playRevealDing,
  unlockCleanupAudio,
} from '../lib/cleanupSound'
import './cleanup.css'

type Phase = 'idle' | 'rolling' | 'revealing' | 'done'

type TriggerPayload = {
  id?: unknown
  class_name?: unknown
  assignments?: unknown
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const id = window.setTimeout(() => resolve(), ms)
    const onAbort = () => {
      window.clearTimeout(id)
      resolve()
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export function CleanupDisplayPage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [className, setClassName] = useState<string | null>(null)
  const [pairings, setPairings] = useState<CleanupAssignment[]>([])
  const [visibleCount, setVisibleCount] = useState(0)
  const [live, setLive] = useState(false)
  const [audioArmed, setAudioArmed] = useState(false)
  const [configError] = useState<string | null>(
    isSupabaseConfigured ? null : 'Supabase is not configured.',
  )
  const abortRef = useRef<AbortController | null>(null)
  const runIdRef = useRef(0)

  const runReveal = useCallback(async (label: string, next: CleanupAssignment[]) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const runId = ++runIdRef.current

    setClassName(label)
    setPairings(next)
    setVisibleCount(0)
    setPhase('rolling')
    playDiceRollSound()
    await wait(CLEANUP_DICE_MS, controller.signal)
    if (controller.signal.aborted || runId !== runIdRef.current) return

    setPhase('revealing')
    for (let i = 0; i < next.length; i++) {
      if (controller.signal.aborted || runId !== runIdRef.current) return
      setVisibleCount(i + 1)
      playRevealDing()
      if (i < next.length - 1) {
        await wait(CLEANUP_REVEAL_GAP_MS, controller.signal)
      }
    }
    if (controller.signal.aborted || runId !== runIdRef.current) return
    setPhase('done')
  }, [])

  useEffect(() => {
    void unlockCleanupAudio().then((ok) => setAudioArmed(ok))

    const arm = () => {
      void unlockCleanupAudio().then((ok) => {
        if (ok || isCleanupAudioUnlocked()) setAudioArmed(true)
      })
    }
    window.addEventListener('pointerdown', arm)
    window.addEventListener('keydown', arm)
    return () => {
      window.removeEventListener('pointerdown', arm)
      window.removeEventListener('keydown', arm)
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const channel = supabase
      .channel('cleanup-triggers-kiosk')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cleanup_triggers' },
        (payload) => {
          const row = (payload.new ?? {}) as TriggerPayload
          const next = parseAssignments(row.assignments)
          const label = typeof row.class_name === 'string' && row.class_name.trim() ? row.class_name.trim() : 'Cleanup'
          if (next.length === 0) return
          void runReveal(label, next)
        },
      )
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED')
      })

    return () => {
      abortRef.current?.abort()
      void supabase.removeChannel(channel)
    }
  }, [runReveal])

  const shown = pairings.slice(0, visibleCount)

  return (
    <div className="cleanup-display">
      <div className="cleanup-display__chrome">
        <p className="cleanup-display__eyebrow">Classroom cleanup</p>
        <span className={`cleanup-display__live ${live ? 'is-on' : ''}`}>
          {live ? 'Listening' : 'Connecting'}
        </span>
      </div>

      {configError && <p className="cleanup-display__error">{configError}</p>}

      {phase === 'idle' && (
        <div className="cleanup-display__idle">
          <h1>Waiting for cleanup</h1>
          <p>Jobs will appear here when a class is started from the laptop.</p>
        </div>
      )}

      {phase === 'rolling' && (
        <div className="cleanup-display__idle cleanup-display__idle--roll">
          <h1>Rolling jobs…</h1>
          <p>{className}</p>
        </div>
      )}

      {(phase === 'revealing' || phase === 'done') && (
        <div className="cleanup-display__board">
          <h1 className="cleanup-display__class">{className}</h1>
          <ol className="cleanup-display__list">
            {shown.map((row, index) => (
              <li key={`${row.student}-${index}`} className="cleanup-display__row">
                <span className="cleanup-display__name">{row.student}</span>
                <span className="cleanup-display__job">{row.job}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {!audioArmed && (
        <button type="button" className="cleanup-display__audio" onClick={() => void unlockCleanupAudio().then((ok) => setAudioArmed(ok))}>
          Tap once to enable sound
        </button>
      )}
    </div>
  )
}
