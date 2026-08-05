/*
 * Realtime listener: teacher approved a skill → queue celebration + rewards display
 *
 * Fires on every transition into `approved` (plan/checklist use StudentReviewAlertSync).
 * Awards may land in a follow-up trigger update — we still notify on the status change,
 * then refresh WP/gold when available.
 */

import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { queueApprovalCelebration } from '../lib/approvalCelebration'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function isFinalApproval(prev: Record<string, unknown>, next: Record<string, unknown>): boolean {
  if (next.status !== 'approved') return false
  if (hasOwn(prev, 'status')) return prev.status !== 'approved'
  return true
}

function numAward(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function ApprovalCelebrationSync() {
  const { user, profile, studentPreviewMode } = useAuth()
  const roleIsTeacher = profile?.role === 'teacher'

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return
    if (roleIsTeacher && !studentPreviewMode) return

    const uid = user.id

    const emit = (completionId: string, wp: number, gold: number) => {
      queueApprovalCelebration({ wp, gold, completionId })
    }

    const catchUpRecentApprovals = async () => {
      const since = new Date(Date.now() - 120_000).toISOString()
      const { data, error } = await supabase
        .from('skill_completions')
        .select('id, wp_awarded, gold_awarded')
        .eq('student_id', uid)
        .eq('status', 'approved')
        .gte('approved_at', since)
        .order('approved_at', { ascending: false })
        .limit(8)

      if (error || !data?.length) return
      for (const row of data) {
        const id = row.id != null ? String(row.id) : ''
        if (!id) continue
        emit(id, numAward(row.wp_awarded), numAward(row.gold_awarded))
        break
      }
    }

    const channel = supabase
      .channel(`approval-celebration-${uid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'skill_completions', filter: `student_id=eq.${uid}` },
        (payload) => {
          const prev = (payload.old ?? {}) as Record<string, unknown>
          const next = (payload.new ?? {}) as Record<string, unknown>
          if (!isFinalApproval(prev, next)) return

          const id = next.id != null ? String(next.id) : ''
          if (!id) return

          if (next.wp_awarded != null && next.gold_awarded != null) {
            emit(id, numAward(next.wp_awarded), numAward(next.gold_awarded))
            return
          }

          /* Always notify on approve; fill awards when the trigger has written them. */
          emit(id, 0, 0)
          void supabase
            .from('skill_completions')
            .select('wp_awarded, gold_awarded')
            .eq('id', id)
            .maybeSingle()
            .then(({ data }) => {
              if (data?.wp_awarded == null && data?.gold_awarded == null) return
              const wp = numAward(data?.wp_awarded)
              const gold = numAward(data?.gold_awarded)
              /* Replace pending toast amounts if still showing this completion. */
              queueApprovalCelebration({ wp, gold, completionId: id })
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
