/**
 * Multiple `patents` rows can exist per student+tile+stage (e.g. duplicate inserts).
 *
 * Checklist unlock + persistence must follow a row the teacher has approved. If we only
 * took `created_at desc` limit 1, a newer duplicate `pending` row would hide an older
 * `approved` row and keep checkboxes disabled.
 *
 * Rules:
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

export type StudentPatentPrimaryResult<T> = {
  primary: T | undefined
  rowsForMerge: T[]
  canUnlockChecklist: boolean
  source: 'plan' | 'packet' | 'none'
}

/**
 * Load both `plan` and `packet` stage rows. Plan-stage rows drive the checklist; if the student
 * already advanced to `packet` (final submission), fall back to the newest packet row so answers
 * still hydrate after refresh.
 */
export function selectStudentPatentPrimary<
  T extends { id: string; status: unknown; created_at: string; stage?: unknown },
>(allRows: T[], normalizeStatus: (s: unknown) => string): StudentPatentPrimaryResult<T> {
  const planRows = allRows.filter((r) => String(r.stage ?? '').trim().toLowerCase() === 'plan')
  const packetRows = allRows
    .filter((r) => String(r.stage ?? '').trim().toLowerCase() === 'packet')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (planRows.length > 0) {
    const { primary, canUnlockChecklist } = pickStudentPlanPatentContext(planRows, normalizeStatus)
    return { primary, rowsForMerge: planRows, canUnlockChecklist, source: 'plan' }
  }
  if (packetRows.length > 0) {
    return {
      primary: packetRows[0],
      rowsForMerge: packetRows,
      canUnlockChecklist: false,
      source: 'packet',
    }
  }
  return { primary: undefined, rowsForMerge: [], canUnlockChecklist: false, source: 'none' }
}
