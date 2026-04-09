import type { UiPatentPlanStatus } from './patentPlanStatus'

/**
 * Which tab to show after a fresh DB load (refresh-safe; do not use sessionStorage for this).
 * - `packet` → final questions (step 3).
 * - Plan `returned` → edit plan (step 1).
 * - Plan `pending` or `approved` → checklist (step 2), unless checklist already approved → step 3.
 */
export function serverSuggestedPatentPhase(params: {
  primaryStage: 'plan' | 'packet'
  planStatus: UiPatentPlanStatus
  checklistApproved: boolean
}): 1 | 2 | 3 {
  if (params.primaryStage === 'packet') return 3
  if (params.planStatus === 'returned' || params.planStatus === 'none') return 1
  if (params.checklistApproved) return 3
  return 2
}
