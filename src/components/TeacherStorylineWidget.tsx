/*
 * Teacher panel — Storyline fragment widget
 *
 * Class-wide milestones (not per-student): Fragment 2 = first packet-stage Patent
 * approval; Fragment 3 = first Tier 2 quest completion. Fired from DB triggers on
 * `skill_completions` (migration 20260708133000). Shows one undismissed row at a
 * time; “Mark as delivered” calls `dismiss_storyline_milestone` so the cue stays
 * until the teacher actually runs the storyline beat in class.
 */

import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export type StorylineMilestone = {
  fragment_number: number
  trigger_description: string
  fired_at: string
}

type Props = {
  enabled?: boolean
}

export function TeacherStorylineWidget({ enabled = true }: Props) {
  const [milestone, setMilestone] = useState<StorylineMilestone | null>(null)
  const [dismissing, setDismissing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMilestone = useCallback(async () => {
    if (!enabled || !isSupabaseConfigured) {
      setMilestone(null)
      return
    }

    const { data, error: loadError } = await supabase
      .from('storyline_milestones')
      .select('fragment_number, trigger_description, fired_at')
      .is('dismissed_at', null)
      .order('fragment_number', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (loadError) {
      console.error('storyline milestones:', loadError.message)
      setError(loadError.message)
      setMilestone(null)
      return
    }

    setError(null)
    setMilestone(data)
  }, [enabled])

  useEffect(() => {
    void loadMilestone()
  }, [loadMilestone])

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return

    const channel = supabase
      .channel('storyline-milestones')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'storyline_milestones' },
        () => {
          void loadMilestone()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [enabled, loadMilestone])

  async function markDelivered() {
    if (!milestone || dismissing) return
    setDismissing(true)
    setError(null)

    const { data, error: dismissError } = await supabase.rpc('dismiss_storyline_milestone', {
      p_fragment_number: milestone.fragment_number,
    })

    setDismissing(false)

    if (dismissError) {
      setError(dismissError.message)
      return
    }

    const result = data as { ok?: boolean; error?: string } | null
    if (result && result.ok === false) {
      setError(result.error ?? 'Could not mark as delivered')
      return
    }

    await loadMilestone()
  }

  if (!milestone) return null

  return (
    <section
      className="teacher-panel-storyline"
      aria-labelledby="teacher-panel-storyline-heading"
    >
      <div className="card teacher-panel-item teacher-panel-storyline__card">
        <div className="teacher-panel-item-main">
          <h2 id="teacher-panel-storyline-heading" className="teacher-panel-storyline__label">
            Storyline
          </h2>
          <p className="teacher-panel-storyline__text">
            Storyline: Fragment {milestone.fragment_number} ready — {milestone.trigger_description}.
          </p>
          {error ? (
            <p className="error teacher-panel-storyline__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="teacher-panel-actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={dismissing}
            onClick={() => void markDelivered()}
          >
            {dismissing ? 'Marking…' : 'Mark as delivered'}
          </button>
        </div>
      </div>
    </section>
  )
}
