/**
 * Initial tab (1 = plan, 2 = checklist, 3 = closing) after patent data loads.
 * - Until the teacher approves the plan (`checklistUnlocked`), default stays on step 1
 *   so opening questions stay in focus (avoids landing on a locked checklist from stale session).
 * - After approval, default is step 2 so the student lands on the checklist.
 */
export function computeInitialPatentPhase(params: {
  storedRaw: 1 | 2 | 3
  maxPhase: 1 | 2 | 3
  planSubmitted: boolean
  checklistUnlocked: boolean
  checklistApproved: boolean
}): 1 | 2 | 3 {
  const { storedRaw, maxPhase, planSubmitted, checklistUnlocked, checklistApproved } = params

  const suggested: 1 | 2 | 3 = !planSubmitted
    ? 1
    : !checklistUnlocked
      ? 1
      : !checklistApproved
        ? 2
        : 3

  let next: 1 | 2 | 3
  if (storedRaw >= 1 && storedRaw <= maxPhase) {
    next = storedRaw
    if (next >= 2 && !checklistUnlocked) next = 1
    if (next === 1 && planSubmitted && suggested >= 2) {
      next = Math.min(suggested, maxPhase) as 1 | 2 | 3
    }
  } else {
    next = suggested
  }
  return Math.min(Math.max(next, 1), maxPhase) as 1 | 2 | 3
}
