/*
 * Realtime: teacher approved plan, checklist, shop request, or redemption → student banner + chime.
 */

import { useCallback, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { queueStudentReviewAlert, shouldQueueStudentReviewAlert } from '../lib/studentReviewAlert'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

async function tileSkillName(tileId: string): Promise<string> {
  const { data } = await supabase.from('tiles').select('skill_name').eq('id', tileId).maybeSingle()
  const name = (data?.skill_name as string | null)?.trim()
  return name || 'your quest'
}

export function StudentReviewAlertSync() {
  const { user, profile, studentPreviewMode } = useAuth()
  const roleIsTeacher = profile?.role === 'teacher'

  const emit = useCallback((alertId: string, message: string) => {
    if (!shouldQueueStudentReviewAlert(alertId)) return
    queueStudentReviewAlert({ alertId, message })
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return
    if (roleIsTeacher && !studentPreviewMode) return

    const uid = user.id

    const channel = supabase
      .channel(`student-review-alert-${uid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'patents', filter: `student_id=eq.${uid}` },
        (payload) => {
          const prev = payload.old as Record<string, unknown>
          const next = payload.new as Record<string, unknown>
          const patentId = next.id != null ? String(next.id) : ''
          if (!patentId) return

          if (prev.status !== 'approved' && next.status === 'approved' && next.stage === 'plan') {
            void tileSkillName(String(next.tile_id ?? '')).then((quest) => {
              emit(`plan:${patentId}`, `Your plan for ${quest} was approved — the Work tab is open.`)
            })
            return
          }

          if (!prev.checklist_approved && next.checklist_approved) {
            void tileSkillName(String(next.tile_id ?? '')).then((quest) => {
              emit(`checklist:${patentId}`, `Checklist approved for ${quest} — the Record tab is open.`)
            })
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'redemption_requests', filter: `student_id=eq.${uid}` },
        (payload) => {
          const prev = payload.old as Record<string, unknown>
          const next = payload.new as Record<string, unknown>
          if (prev.status === 'approved' || next.status !== 'approved') return
          const id = next.id != null ? String(next.id) : ''
          if (!id) return
          const item = ((next.item_name as string) ?? 'Shop item').trim() || 'Shop item'
          emit(`redemption:${id}`, `${item} — your redemption was approved.`)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shop_purchase_requests', filter: `student_id=eq.${uid}` },
        (payload) => {
          const prev = payload.old as Record<string, unknown>
          const next = payload.new as Record<string, unknown>
          if (prev.status === 'approved' || next.status !== 'approved') return
          const id = next.id != null ? String(next.id) : ''
          if (!id) return
          const item = ((next.item_name as string) ?? 'Supply item').trim() || 'Supply item'
          emit(`shop:${id}`, `${item} — your Supply request was approved.`)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, roleIsTeacher, studentPreviewMode, emit])

  return null
}
