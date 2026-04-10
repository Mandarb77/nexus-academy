import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { queueApprovalCelebration } from '../lib/approvalCelebration'
import { isTeacherProfile } from '../lib/teacher'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

/**
 * Listens for final skill approvals and queues the home / skill-tree celebration toast.
 * Runs for students and for teachers in student preview mode.
 */
export function ApprovalCelebrationSync() {
  const { user, profile, studentPreviewMode } = useAuth()

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return
    if (isTeacherProfile(profile) && !studentPreviewMode) return

    const uid = user.id
    const channel = supabase
      .channel(`approval-celebration-${uid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'skill_completions', filter: `student_id=eq.${uid}` },
        (payload) => {
          const prev = payload.old as Record<string, unknown>
          const next = payload.new as Record<string, unknown>
          if (next.status !== 'approved') return
          if (prev.status === 'approved') return
          if (next.wp_awarded == null || next.gold_awarded == null) return
          const id = next.id != null ? String(next.id) : ''
          if (!id) return
          const wp = typeof next.wp_awarded === 'number' ? next.wp_awarded : Number(next.wp_awarded) || 0
          const gold = typeof next.gold_awarded === 'number' ? next.gold_awarded : Number(next.gold_awarded) || 0
          queueApprovalCelebration({ wp, gold, completionId: id })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, profile, studentPreviewMode])

  return null
}
