/**
 * Multiple `patents` rows can exist per student+tile+stage (e.g. duplicate inserts).
 * The newest row may still be `pending` while an older row is already `approved`, which
 * would keep the checklist disabled if we only read `limit(1)` by `created_at desc`.
 */
export function pickPrimaryPlanPatentRow<
  T extends { id: string; status: unknown; created_at: string },
>(rows: T[] | null | undefined, normalizeStatus: (s: unknown) => string): T | undefined {
  if (!rows?.length) return undefined
  const sorted = [...rows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const newest = sorted[0]
  const newestSt = normalizeStatus(newest.status)
  if (newestSt === 'returned') return newest
  if (newestSt === 'pending') {
    const olderApproved = sorted.find((r, i) => i > 0 && normalizeStatus(r.status) === 'approved')
    if (olderApproved) return olderApproved
  }
  if (newestSt === 'approved') return newest
  const anyApproved = sorted.find((r) => normalizeStatus(r.status) === 'approved')
  if (anyApproved) return anyApproved
  return newest
}
