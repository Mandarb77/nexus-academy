/*
 * Poll: teacher approved a skill → queue celebration + rewards display
 *
 * Fires on catch-up of recent `approved` rows (plan/checklist use StudentReviewAlertSync).
 * Awards may land in a follow-up trigger update — we still notify on the status change,
 * then refresh the profile (WP/gold) so Workshop updates without a manual reload.
 */

import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { hasShownApprovalCelebration, queueApprovalCelebration } from '../lib/approvalCelebration'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { jitterFromId, pollWhileVisible } from '../lib/pollWhileVisible'

function numAward(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function ApprovalCelebrationSync() {
  const { user, profile, studentPreviewMode, refreshProfile } = useAuth()
  const roleIsTeacher = profile?.role === 'teacher'

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return
    if (roleIsTeacher && !studentPreviewMode) return

    const uid = user.id

    /* WP/gold also refresh from the profile poll in AuthContext — one extra pull is enough. */
    const refreshBalanceSoon = () => {
      void refreshProfile()
    }

    const emit = (completionId: string, wp: number, gold: number) => {
      queueApprovalCelebration({ wp, gold, completionId })
      refreshBalanceSoon()
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
        /* Catch-up is for a closed tab — never replay a banner this browser already showed. */
        if (hasShownApprovalCelebration(id)) continue
        emit(id, numAward(row.wp_awarded), numAward(row.gold_awarded))
        break
      }
    }

    void catchUpRecentApprovals()
    return pollWhileVisible(
      () => {
        void catchUpRecentApprovals()
      },
      15_000,
      { jitterMs: jitterFromId(uid, 6_000) },
    )
  }, [user?.id, roleIsTeacher, studentPreviewMode, refreshProfile])

  return null
}
