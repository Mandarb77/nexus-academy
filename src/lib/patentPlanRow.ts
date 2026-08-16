/*
 * Patent row selection — deduplication and “which row is truth?” for duplicate inserts
 *
 * Students sometimes accumulate multiple `patents` rows per tile (retries, bugs, or
 * double clicks). Taking only `ORDER BY created_at DESC LIMIT 1` broke real classes:
 * a newer empty `pending` row could shadow an older `approved` plan and keep the
 * checklist locked forever. `pickStudentPlanPatentContext` encodes product rules for
 * which row drives the UI and when checklist unlock is allowed. `selectStudentPatentPrimary`
 * extends that to choose between plan-stage vs packet-stage rows so final packet answers
 * still load after the student advances past planning.
 */

// =============================================================================
// Plan-stage primary row (duplicate-safe) + thin back-compat wrapper
// =============================================================================

/**
 * Multiple `patents` rows can exist per student+tile+stage (e.g. duplicate inserts).
 *
 * Checklist unlock + persistence must follow a row the teacher has approved. If we only
 * took `created_at desc` limit 1, a newer duplicate `pending` row would hide an older
 * `approved` row and keep checkboxes disabled.
 *
 * Rules:
 * - A `pending` row plus a `returned` row means the student resubmitted after a teacher
 *   send-back — use the newest pending row and keep the checklist locked.
 * - Newest row is `returned` → that row is active; checklist stays locked until resubmit.
 * - Any `approved` row exists → use the **newest approved** row for UI + saves; checklist unlocks.
 * - Otherwise → newest row (typically `pending`).
 */
export function pickStudentPlanPatentContext<
  T extends { id: string; status: unknown; created_at: string },
>(
  rows: T[] | null | undefined,
  normalizeStatus: (s: unknown) => string,
): { primary: T | undefined; canUnlockChecklist: boolean } {
  if (!rows?.length) return { primary: undefined, canUnlockChecklist: false }
  const sorted = [...rows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const newest = sorted[0]
  const pendingSorted = sorted.filter((r) => normalizeStatus(r.status) === 'pending')
  const hasReturned = sorted.some((r) => normalizeStatus(r.status) === 'returned')
  if (pendingSorted.length > 0 && hasReturned) {
    return { primary: pendingSorted[0], canUnlockChecklist: false }
  }
  if (normalizeStatus(newest.status) === 'returned') {
    return { primary: newest, canUnlockChecklist: false }
  }
  const approvedSorted = sorted.filter((r) => normalizeStatus(r.status) === 'approved')
  if (approvedSorted.length > 0) {
    return { primary: approvedSorted[0], canUnlockChecklist: true }
  }
  return { primary: newest, canUnlockChecklist: false }
}

/** Back-compat: only the row; callers that need unlock state should use pickStudentPlanPatentContext. */
export function pickPrimaryPlanPatentRow<
  T extends { id: string; status: unknown; created_at: string },
>(rows: T[] | null | undefined, normalizeStatus: (s: unknown) => string): T | undefined {
  return pickStudentPlanPatentContext(rows, normalizeStatus).primary
}

// =============================================================================
// Plan vs packet stage — which row set hydrates the wizard after refresh
// =============================================================================

export type StudentPatentPrimaryResult<T> = {
  primary: T | undefined
  rowsForMerge: T[]
  canUnlockChecklist: boolean
  source: 'plan' | 'packet' | 'none'
}

/**
 * Load both `plan` and `packet` stage rows.
 * A pending/returned plan is the live gate (including resubmit after a send-back).
 * Otherwise an in-flight packet wins so leftover approved plan duplicates cannot hide it.
 */
export function selectStudentPatentPrimary<
  T extends { id: string; status: unknown; created_at: string; stage?: unknown },
>(allRows: T[], normalizeStatus: (s: unknown) => string): StudentPatentPrimaryResult<T> {
  const planRows = allRows.filter((r) => String(r.stage ?? '').trim().toLowerCase() === 'plan')
  const packetRows = allRows
    .filter((r) => String(r.stage ?? '').trim().toLowerCase() === 'packet')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const planGate = pickStudentPlanPatentContext(planRows, normalizeStatus)
  const planGateStatus = planGate.primary ? normalizeStatus(planGate.primary.status) : 'none'

  if (planGateStatus === 'pending' || planGateStatus === 'returned') {
    return { primary: planGate.primary, rowsForMerge: planRows, canUnlockChecklist: planGate.canUnlockChecklist, source: 'plan' }
  }
  if (packetRows.length > 0) {
    return {
      primary: packetRows[0],
      rowsForMerge: packetRows,
      canUnlockChecklist: false,
      source: 'packet',
    }
  }
  if (planRows.length > 0) {
    return { primary: planGate.primary, rowsForMerge: planRows, canUnlockChecklist: planGate.canUnlockChecklist, source: 'plan' }
  }
  return { primary: undefined, rowsForMerge: [], canUnlockChecklist: false, source: 'none' }
}
