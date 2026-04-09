/** Normalizes `patents.status` for UI + `pickStudentPlanPatentContext`. DB uses pending | approved | returned. */
export type UiPatentPlanStatus = 'none' | 'pending' | 'approved' | 'returned'

export function normalizePatentPlanStatus(input: unknown): UiPatentPlanStatus {
  const s = String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
  if (s === 'plan_approved' || s === 'planapproved') return 'approved'
  if (s === 'none' || s === 'pending' || s === 'approved' || s === 'returned') return s
  return 'pending'
}
