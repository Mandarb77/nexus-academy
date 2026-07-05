/*
 * Realtime: teacher approved plan, checklist, shop request, or redemption → student banner + chime.
 *
 * Plan vs checklist must not be confused when Realtime omits columns on `payload.old`
 * (default replica identity only sends the PK). Prefer explicit transitions; fall back to
 * heuristics when `old` is incomplete.
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

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

/** True when status newly became approved (plan gate). */
function isPlanApproval(prev: Record<string, unknown>, next: Record<string, unknown>): boolean {
  if (next.status !== 'approved' || next.stage !== 'plan') return false
  if (hasOwn(prev, 'status')) return prev.status !== 'approved'
  /* Incomplete old row: treat as plan only when checklist is not the thing being set. */
  if (hasOwn(prev, 'checklist_approved')) return false
  return next.checklist_approved !== true
}

/** True when checklist_approved newly became true. */
function isChecklistApproval(prev: Record<string, unknown>, next: Record<string, unknown>): boolean {
  if (next.checklist_approved !== true) return false
  if (hasOwn(prev, 'checklist_approved')) return prev.checklist_approved !== true
  /* Incomplete old row: checklist update while plan is already approved. */
  return next.status === 'approved' && next.stage === 'plan' && !isPlanApproval(prev, next)
}

/** True when status newly became approved (shop / redemption). */
function isStatusApproval(prev: Record<string, unknown>, next: Record<string, unknown>): boolean {
  if (next.status !== 'approved') return false
  if (hasOwn(prev, 'status')) return prev.status !== 'approved'
  return true
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
          const prev = (payload.old ?? {}) as Record<string, unknown>
          const next = (payload.new ?? {}) as Record<string, unknown>
          const patentId = next.id != null ? String(next.id) : ''
          if (!patentId) return

          const planApproved = isPlanApproval(prev, next)
          const checklistApproved = isChecklistApproval(prev, next)
          const tileId = String(next.tile_id ?? patentId)

          if (planApproved) {
            void tileSkillName(tileId).then((quest) => {
              /* Key by tile so duplicate plan rows only chime once per approve click. */
              emit(`plan:${tileId}`, `Your plan for ${quest} was approved — the Work tab is open.`)
            })
          }

          if (checklistApproved) {
            void tileSkillName(tileId).then((quest) => {
              emit(`checklist:${tileId}`, `Checklist approved for ${quest} — the Record tab is open.`)
            })
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'redemption_requests', filter: `student_id=eq.${uid}` },
        (payload) => {
          const prev = (payload.old ?? {}) as Record<string, unknown>
          const next = (payload.new ?? {}) as Record<string, unknown>
          if (!isStatusApproval(prev, next)) return
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
          const prev = (payload.old ?? {}) as Record<string, unknown>
          const next = (payload.new ?? {}) as Record<string, unknown>
          if (!isStatusApproval(prev, next)) return
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
