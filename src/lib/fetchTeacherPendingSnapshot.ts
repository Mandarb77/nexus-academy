/*
 * Lightweight pending-queue read for teacher submission alerts (ids + display labels only).
 *
 * Includes shop_duty_completions so Keeper's Duty (and any future duty SKU) chimes the
 * same way skill / plan / redemption queues do when a student marks work complete.
 */

import { isSupabaseConfigured, supabase } from './supabase'
import type { TeacherSubmissionAlert } from './teacherSubmissionAlert'

export async function fetchTeacherPendingSnapshot(): Promise<TeacherSubmissionAlert[]> {
  if (!isSupabaseConfigured) return []

  const [compRes, dutyRes, redRes, shopReqRes, planRes, checklistRes] = await Promise.all([
    supabase
      .from('skill_completions')
      .select('id, student_id, tile_id, status')
      .eq('status', 'pending'),
    supabase
      .from('shop_duty_completions')
      .select('id, student_id, item_name, status')
      .eq('status', 'pending'),
    supabase
      .from('redemption_requests')
      .select('id, student_id, item_name, status')
      .eq('status', 'pending'),
    supabase
      .from('shop_purchase_requests')
      .select('id, student_id, item_name, status')
      .eq('status', 'pending'),
    supabase
      .from('patents')
      .select('id, student_id, tile_id, stage, status')
      .eq('stage', 'plan')
      .eq('status', 'pending'),
    supabase
      .from('patents')
      .select('id, student_id, tile_id, stage, status, checklist_approved')
      .eq('stage', 'plan')
      .eq('status', 'approved')
      .eq('checklist_submitted', true)
      .eq('checklist_approved', false),
  ])

  if (
    compRes.error ||
    dutyRes.error ||
    redRes.error ||
    shopReqRes.error ||
    planRes.error ||
    checklistRes.error
  ) {
    return []
  }

  const completions = compRes.data ?? []
  const duties = dutyRes.data ?? []
  const redemptions = redRes.data ?? []
  const shopRequests = shopReqRes.data ?? []
  const plans = planRes.data ?? []
  const checklists = checklistRes.data ?? []

  const studentIds = [
    ...new Set([
      ...completions.map((r) => r.student_id as string),
      ...duties.map((r) => r.student_id as string),
      ...redemptions.map((r) => r.student_id as string),
      ...shopRequests.map((r) => r.student_id as string),
      ...plans.map((r) => r.student_id as string),
      ...checklists.map((r) => r.student_id as string),
    ]),
  ]

  const tileIds = [
    ...new Set([
      ...completions.map((r) => r.tile_id as string),
      ...plans.map((r) => r.tile_id as string),
      ...checklists.map((r) => r.tile_id as string),
    ]),
  ]

  const nameById = new Map<string, string>()
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', studentIds)
    for (const p of profiles ?? []) {
      const label =
        (p.display_name as string | null)?.trim() ||
        (p.email as string | null)?.trim() ||
        null
      if (label) nameById.set(p.id as string, label)
    }
  }

  const tileNameById = new Map<string, string>()
  if (tileIds.length > 0) {
    const { data: tiles } = await supabase.from('tiles').select('id, skill_name').in('id', tileIds)
    for (const t of tiles ?? []) {
      const name = (t.skill_name as string | null)?.trim()
      if (name) tileNameById.set(t.id as string, name)
    }
  }

  const items: TeacherSubmissionAlert[] = []

  for (const r of plans) {
    const sid = r.student_id as string
    const tid = r.tile_id as string
    items.push({
      alertId: `plan:${r.id as string}`,
      kind: 'plan',
      studentName: nameById.get(sid) ?? null,
      detail: tileNameById.get(tid) ?? 'Quest plan',
    })
  }

  for (const r of checklists) {
    const sid = r.student_id as string
    const tid = r.tile_id as string
    items.push({
      alertId: `checklist:${r.id as string}`,
      kind: 'checklist',
      studentName: nameById.get(sid) ?? null,
      detail: tileNameById.get(tid) ?? 'Quest checklist',
    })
  }

  for (const r of completions) {
    const sid = r.student_id as string
    const tid = r.tile_id as string
    items.push({
      alertId: `skill:${r.id as string}`,
      kind: 'skill',
      studentName: nameById.get(sid) ?? null,
      detail: tileNameById.get(tid) ?? 'Skill completion',
    })
  }

  for (const r of duties) {
    const sid = r.student_id as string
    items.push({
      alertId: `duty:${r.id as string}`,
      kind: 'duty',
      studentName: nameById.get(sid) ?? null,
      detail: ((r.item_name as string) ?? 'Shop duty').trim() || 'Shop duty',
    })
  }

  for (const r of redemptions) {
    const sid = r.student_id as string
    items.push({
      alertId: `redemption:${r.id as string}`,
      kind: 'redemption',
      studentName: nameById.get(sid) ?? null,
      detail: ((r.item_name as string) ?? 'Shop item').trim() || 'Shop item',
    })
  }

  for (const r of shopRequests) {
    const sid = r.student_id as string
    items.push({
      alertId: `shop-request:${r.id as string}`,
      kind: 'redemption',
      studentName: nameById.get(sid) ?? null,
      detail: ((r.item_name as string) ?? 'Shop request').trim() || 'Shop request',
    })
  }

  return items
}
