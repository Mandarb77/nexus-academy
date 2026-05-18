/*
 * Which patent wizard step (1 plan / 2 checklist / 3 packet) the server state implies
 *
 * Keeps refresh and deep-link behavior deterministic without hiding answers in
 * sessionStorage. For example: a returned plan must land the student on step 1 even
 * if they had previously expanded step 2 in memory — otherwise they cannot see teacher
 * feedback. Packet stage always jumps to step 3 because the “final questions” live there.
 */

import type { UiPatentPlanStatus } from './patentPlanStatus'

// =============================================================================
// `serverSuggestedPatentPhase` — DB snapshot → default tab (1 / 2 / 3)
// =============================================================================

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
