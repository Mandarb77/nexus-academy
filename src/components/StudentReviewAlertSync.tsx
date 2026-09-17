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
  continueHrefForPatentTile,
  tileForPatentRoute,
  type PatentContinueStep,
} from '../lib/questContinue'
import {
  CHICKADEE_PATENT_NOT_APPROVED,
  CHICKADEE_USAGE_NOT_NOW,
  fillChickadeeNotice,
  queueStudentReviewAlert,
  shouldQueueStudentReviewAlert,
  type StudentReviewAlertTone,
} from '../lib/studentReviewAlert'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { jitterFromId, pollWhileVisible } from '../lib/pollWhileVisible'

async function tileSkillName(tileId: string): Promise<string> {
  const { data } = await supabase.from('tiles').select('skill_name').eq('id', tileId).maybeSingle()
  const name = (data?.skill_name as string | null)?.trim()
  return name || 'your quest'
}

async function continueHrefForTile(tileId: string, step: PatentContinueStep): Promise<string> {
  const { data } = await supabase
    .from('tiles')
    .select('id, guild, skill_name, steps')
    .eq('id', tileId)
    .maybeSingle()
  if (!data) return '/journey'
  return continueHrefForPatentTile(tileForPatentRoute(data), step) ?? '/journey'
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

  const emit = useCallback(
    (
      alertId: string,
      message: string,
      tone: StudentReviewAlertTone = 'approved',
      extra?: { continueHref?: string; continueLabel?: string },
    ) => {
      if (!shouldQueueStudentReviewAlert(alertId)) return
      queueStudentReviewAlert({ alertId, message, tone, ...extra })
    },
    [],
  )

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return
    if (roleIsTeacher && !studentPreviewMode) return

    const uid = user.id
    const patentPrev = new Map<string, Record<string, unknown>>()
    const skillPrev = new Map<string, Record<string, unknown>>()
    const redemptionPrev = new Map<string, Record<string, unknown>>()
    const shopPrev = new Map<string, Record<string, unknown>>()
    const dutyPrev = new Map<string, Record<string, unknown>>()
    let seeded = false

    const handlePatent = (row: Record<string, unknown>, prev: Record<string, unknown> | undefined) => {
      const patentId = row.id != null ? String(row.id) : ''
      if (!patentId) return
      if (!prev) return
      const planApproved = isPlanApproval(prev, row)
      const checklistApproved = isChecklistApproval(prev, row)
      const planReturned = isPlanReturn(prev, row)
      const checklistReturned = isChecklistReturn(prev, row)
      const tileId = String(row.tile_id ?? patentId)

      if (planApproved) {
        void tileSkillName(tileId).then((quest) => {
          emit(`plan:${tileId}`, `Your plan for ${quest} was approved — the Work tab is open.`)
        })
      }
      if (checklistApproved) {
        void tileSkillName(tileId).then((quest) => {
          emit(`checklist:${tileId}`, `Checklist approved for ${quest} — the Record tab is open.`)
        })
      }
      if (planReturned) {
        void continueHrefForTile(tileId, 1).then((continueHref) => {
          emit(`patent-return:plan:${tileId}`, patentNotApproved, 'denied', {
            continueHref,
            continueLabel: 'Fix and continue',
          })
        })
      }
      if (checklistReturned) {
        void continueHrefForTile(tileId, 2).then((continueHref) => {
          emit(`patent-return:checklist:${tileId}`, patentNotApproved, 'denied', {
            continueHref,
            continueLabel: 'Fix and continue',
          })
        })
      }
    }

    const tick = async () => {
      const [patents, skills, redemptions, shops, duties] = await Promise.all([
        supabase
          .from('patents')
          .select('id, tile_id, status, stage, checklist_approved, checklist_submitted')
          .eq('student_id', uid)
          .order('created_at', { ascending: false })
          .limit(40),
        supabase
          .from('skill_completions')
          .select('id, tile_id, status')
          .eq('student_id', uid)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('redemption_requests')
          .select('id, item_name, status')
          .eq('student_id', uid)
          .order('created_at', { ascending: false })
          .limit(12),
        supabase
          .from('shop_purchase_requests')
          .select('id, item_name, status')
          .eq('student_id', uid)
          .order('created_at', { ascending: false })
          .limit(12),
        supabase
          .from('shop_duty_completions')
          .select('id, status')
          .eq('student_id', uid)
          .order('created_at', { ascending: false })
          .limit(12),
      ])

      const apply = (
        rows: Record<string, unknown>[] | null,
        prevMap: Map<string, Record<string, unknown>>,
        onChange: (next: Record<string, unknown>, prev: Record<string, unknown> | undefined) => void,
      ) => {
        for (const row of rows ?? []) {
          const id = row.id != null ? String(row.id) : ''
          if (!id) continue
          const prev = prevMap.get(id)
          if (seeded) onChange(row, prev)
          prevMap.set(id, row)
        }
      }

      apply((patents.data ?? []) as Record<string, unknown>[], patentPrev, handlePatent)
      apply((skills.data ?? []) as Record<string, unknown>[], skillPrev, (next, prev) => {
        if (!prev) return
        if (!isStatusDenial(prev, next, 'returned')) return
        const id = next.id != null ? String(next.id) : ''
        if (!id) return
        const tileId = next.tile_id != null ? String(next.tile_id) : ''
        void (tileId ? continueHrefForTile(tileId, 3) : Promise.resolve('/journey')).then((continueHref) => {
          emit(`patent-return:skill:${id}`, patentNotApproved, 'denied', {
            continueHref,
            continueLabel: 'Fix and continue',
          })
        })
      })
      apply((redemptions.data ?? []) as Record<string, unknown>[], redemptionPrev, (next, prev) => {
        if (!prev) return
        const id = next.id != null ? String(next.id) : ''
        if (!id) return
        if (isStatusApproval(prev, next)) {
          const item = ((next.item_name as string) ?? 'Shop item').trim() || 'Shop item'
          emit(`redemption:${id}`, `${item} — your redemption was approved.`)
          return
        }
        if (isStatusDenial(prev, next, 'returned')) {
          emit(`redemption-return:${id}`, usageNotNow, 'denied', {
            continueHref: '/inventory',
            continueLabel: 'Open inventory',
          })
        }
      })
      apply((shops.data ?? []) as Record<string, unknown>[], shopPrev, (next, prev) => {
        if (!prev) return
        const id = next.id != null ? String(next.id) : ''
        if (!id) return
        if (isStatusApproval(prev, next)) {
          const item = ((next.item_name as string) ?? 'Supply item').trim() || 'Supply item'
          emit(`shop:${id}`, `${item} — your Supply request was approved.`)
          return
        }
        if (isStatusDenial(prev, next, 'rejected')) {
          emit(`shop-reject:${id}`, usageNotNow, 'denied', {
            continueHref: '/shop',
            continueLabel: 'Open Supply',
          })
        }
      })
      apply((duties.data ?? []) as Record<string, unknown>[], dutyPrev, (next, prev) => {
        if (!prev) return
        const id = next.id != null ? String(next.id) : ''
        if (!id) return
        if (isStatusDenial(prev, next, 'returned')) {
          emit(`duty-return:${id}`, usageNotNow, 'denied', {
            continueHref: '/inventory',
            continueLabel: 'Open inventory',
          })
        }
      })
      seeded = true
    }

    void tick()
    return pollWhileVisible(
      () => {
        void tick()
      },
      30_000,
      { jitterMs: jitterFromId(uid, 8_000) },
    )
  }, [user?.id, roleIsTeacher, studentPreviewMode, emit, patentNotApproved, usageNotNow])

  return null
}
