/*
 * Realtime listener: teacher approved a skill → queue celebration + rewards display
 *
 * Subscribes to `skill_completions` UPDATEs for the signed-in student. The `prev.status`
 * vs `next.status` guard ensures we only fire on the transition into `approved`, not on
 * unrelated column updates to an already-approved row (prevents double banners). When
 * the websocket payload lacks `wp_awarded` / `gold_awarded` yet (race with DB trigger),
 * we re-fetch that row. `catchUpRecentApprovals` covers the case the tab was backgrounded
 * and missed the event — it scans the last two minutes after subscribe. Effect deps
 * intentionally use `profile?.role` rather than whole `profile` so routine WP refreshes
 * from `AuthContext` do not tear down the channel and drop events.
 */

import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  queueApprovalCelebration,
  shouldQueueCompletionCelebration,
} from '../lib/approvalCelebration'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function ApprovalCelebrationSync() {
  const { user, profile, studentPreviewMode } = useAuth()
  const roleIsTeacher = profile?.role === 'teacher'

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return
    if (roleIsTeacher && !studentPreviewMode) return

    const uid = user.id

    const emit = (completionId: string, wp: number, gold: number) => {
      if (!shouldQueueCompletionCelebration(completionId)) return
      queueApprovalCelebration({ wp, gold, completionId })
    }

    /* If the student had the tab asleep during approval, Realtime might not deliver — poll a short recent window once subscribed. */
    const catchUpRecentApprovals = async () => {
      const since = new Date(Date.now() - 120_000).toISOString()
      const { data, error } = await supabase
        .from('skill_completions')
        .select('id, wp_awarded, gold_awarded')
        .eq('student_id', uid)
        .eq('status', 'approved')
        .not('wp_awarded', 'is', null)
        .not('gold_awarded', 'is', null)
        .gte('approved_at', since)
        .order('approved_at', { ascending: false })
        .limit(8)

      if (error || !data?.length) return
      for (const row of data) {
        const id = row.id != null ? String(row.id) : ''
        if (!id) continue
        const wp = typeof row.wp_awarded === 'number' ? row.wp_awarded : Number(row.wp_awarded) || 0
        const gold = typeof row.gold_awarded === 'number' ? row.gold_awarded : Number(row.gold_awarded) || 0
        emit(id, wp, gold)
        break
      }
    }

    const channel = supabase
      .channel(`approval-celebration-${uid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'skill_completions', filter: `student_id=eq.${uid}` },
        (payload) => {
          const prev = payload.old as Record<string, unknown>
          const next = payload.new as Record<string, unknown>
          if (next.status !== 'approved') return
          /* Transition-only: ignore later updates to notes/attachments on an already-approved completion. */
          if (prev.status === 'approved') return
          const id = next.id != null ? String(next.id) : ''
          if (!id) return

          if (next.wp_awarded != null && next.gold_awarded != null) {
            const wp = typeof next.wp_awarded === 'number' ? next.wp_awarded : Number(next.wp_awarded) || 0
            const gold = typeof next.gold_awarded === 'number' ? next.gold_awarded : Number(next.gold_awarded) || 0
            emit(id, wp, gold)
            return
          }

          /* Trigger may fill award columns after the row update event — follow-up read avoids showing 0 WP. */
          void supabase
            .from('skill_completions')
            .select('wp_awarded, gold_awarded')
            .eq('id', id)
            .maybeSingle()
            .then(({ data }) => {
              if (data?.wp_awarded == null || data?.gold_awarded == null) return
              const wp = typeof data.wp_awarded === 'number' ? data.wp_awarded : Number(data.wp_awarded) || 0
              const gold = typeof data.gold_awarded === 'number' ? data.gold_awarded : Number(data.gold_awarded) || 0
              emit(id, wp, gold)
            })
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void catchUpRecentApprovals()
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, roleIsTeacher, studentPreviewMode])

  return null
}
