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
