/*
 * Realtime: teacher approved or returned plan, checklist, final packet, shop,
 * redemption, or duty → student chickadee banner + chime.
 *
 * Plan vs checklist must not be confused when Realtime omits columns on `payload.old`
 * (default replica identity only sends the PK). Prefer explicit transitions; fall back to
 * heuristics when `old` is incomplete.
 *
 * Reject/return copy is the fixed chickadee strings. Final packet approve still uses
 * ApprovalCelebrationSync (same chickadee line + WP/gold amounts).
 */

import { useCallback, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { preferredFirstNameForVoice } from '../lib/preferredFirstName'
import {
  CHICKADEE_PATENT_NOT_APPROVED,
  CHICKADEE_USAGE_NOT_NOW,
  fillChickadeeNotice,
  queueStudentReviewAlert,
  shouldQueueStudentReviewAlert,
  type StudentReviewAlertTone,
} from '../lib/studentReviewAlert'
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

/** True when plan status newly became returned. */
function isPlanReturn(prev: Record<string, unknown>, next: Record<string, unknown>): boolean {
  if (next.status !== 'returned' || next.stage !== 'plan') return false
  if (hasOwn(prev, 'status')) return prev.status !== 'returned'
  return true
}

/**
 * True when a submitted checklist was cleared without a plan return
 * (teacher returned checklist only — status stays approved).
 */
function isChecklistReturn(prev: Record<string, unknown>, next: Record<string, unknown>): boolean {
  if (isPlanReturn(prev, next)) return false
  if (next.stage !== 'plan') return false
  if (next.checklist_submitted !== false) return false
  if (hasOwn(prev, 'checklist_submitted')) return prev.checklist_submitted === true
  /* Incomplete old row: un-submit while plan is still approved. */
  return next.status === 'approved' && next.checklist_approved !== true
}

/** True when status newly became approved (shop / redemption / duty). */
function isStatusApproval(prev: Record<string, unknown>, next: Record<string, unknown>): boolean {
  if (next.status !== 'approved') return false
  if (hasOwn(prev, 'status')) return prev.status !== 'approved'
  return true
}

/** True when status newly became the given deny/return value. */
function isStatusDenial(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  deniedStatus: string,
): boolean {
  if (next.status !== deniedStatus) return false
  if (hasOwn(prev, 'status')) return prev.status !== deniedStatus
  return true
}

export function StudentReviewAlertSync() {
  const { user, profile, studentPreviewMode } = useAuth()
  const roleIsTeacher = profile?.role === 'teacher'
  const studentName = preferredFirstNameForVoice(profile)
  const patentNotApproved = fillChickadeeNotice(CHICKADEE_PATENT_NOT_APPROVED, studentName)
  const usageNotNow = fillChickadeeNotice(CHICKADEE_USAGE_NOT_NOW, studentName)

  const emit = useCallback((alertId: string, message: string, tone: StudentReviewAlertTone = 'approved') => {
    if (!shouldQueueStudentReviewAlert(alertId)) return
    queueStudentReviewAlert({ alertId, message, tone })
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
          const planReturned = isPlanReturn(prev, next)
          const checklistReturned = isChecklistReturn(prev, next)
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

          if (planReturned) {
            emit(`patent-return:plan:${tileId}`, patentNotApproved, 'denied')
          }

          if (checklistReturned) {
            emit(`patent-return:checklist:${tileId}`, patentNotApproved, 'denied')
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'skill_completions', filter: `student_id=eq.${uid}` },
        (payload) => {
          const prev = (payload.old ?? {}) as Record<string, unknown>
          const next = (payload.new ?? {}) as Record<string, unknown>
          if (!isStatusDenial(prev, next, 'returned')) return
          const id = next.id != null ? String(next.id) : ''
          if (!id) return
          emit(`patent-return:skill:${id}`, patentNotApproved, 'denied')
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'redemption_requests', filter: `student_id=eq.${uid}` },
        (payload) => {
          const prev = (payload.old ?? {}) as Record<string, unknown>
          const next = (payload.new ?? {}) as Record<string, unknown>
          const id = next.id != null ? String(next.id) : ''
          if (!id) return
          if (isStatusApproval(prev, next)) {
            const item = ((next.item_name as string) ?? 'Shop item').trim() || 'Shop item'
            emit(`redemption:${id}`, `${item} — your redemption was approved.`)
            return
          }
          if (isStatusDenial(prev, next, 'returned')) {
            emit(`redemption-return:${id}`, usageNotNow, 'denied')
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shop_purchase_requests', filter: `student_id=eq.${uid}` },
        (payload) => {
          const prev = (payload.old ?? {}) as Record<string, unknown>
          const next = (payload.new ?? {}) as Record<string, unknown>
          const id = next.id != null ? String(next.id) : ''
          if (!id) return
          if (isStatusApproval(prev, next)) {
            const item = ((next.item_name as string) ?? 'Supply item').trim() || 'Supply item'
            emit(`shop:${id}`, `${item} — your Supply request was approved.`)
            return
          }
          if (isStatusDenial(prev, next, 'rejected')) {
            emit(`shop-reject:${id}`, usageNotNow, 'denied')
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shop_duty_completions', filter: `student_id=eq.${uid}` },
        (payload) => {
          const prev = (payload.old ?? {}) as Record<string, unknown>
          const next = (payload.new ?? {}) as Record<string, unknown>
          const id = next.id != null ? String(next.id) : ''
          if (!id) return
          if (isStatusDenial(prev, next, 'returned')) {
            emit(`duty-return:${id}`, usageNotNow, 'denied')
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, roleIsTeacher, studentPreviewMode, emit, patentNotApproved, usageNotNow])

  return null
}
