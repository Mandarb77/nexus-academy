/*
 * Patent plan status vocabulary — bridges legacy strings to UI union
 *
 * Teachers and migrations may label plan approval differently over time (`plan_approved`
 * vs `approved`). Student patent tabs and `pickStudentPlanPatentContext` all funnel
 * through `normalizePatentPlanStatus` so checklist gating stays consistent regardless
 * of historical rows in `patents.status`.
 */

// =============================================================================
// `normalizePatentPlanStatus` — UI + row-picker vocabulary
// =============================================================================

/** Normalizes `patents.status` for UI + `pickStudentPlanPatentContext`. DB uses pending | approved | returned. */
export type UiPatentPlanStatus = 'none' | 'pending' | 'approved' | 'returned'

export function normalizePatentPlanStatus(input: unknown): UiPatentPlanStatus {
  const s = String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
  /* Legacy synonym from earlier schema wording — treat as approved for checklist unlock rules. */
  if (s === 'plan_approved' || s === 'planapproved') return 'approved'
  if (s === 'none' || s === 'pending' || s === 'approved' || s === 'returned') return s
  return 'pending'
}
