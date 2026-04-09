/** Local backup when `checklist_state` DB writes fail or before they replicate. */

export type ChecklistDraftPayload = { planRowId: string; checks: boolean[] }

export function readChecklistDraft(raw: string | null): ChecklistDraftPayload | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as { planRowId?: unknown; checks?: unknown }
    if (typeof o.planRowId !== 'string' || !Array.isArray(o.checks)) return null
    return { planRowId: o.planRowId, checks: o.checks.map(Boolean) }
  } catch {
    return null
  }
}

export function writeChecklistDraft(key: string, planRowId: string, checks: boolean[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ planRowId, checks } satisfies ChecklistDraftPayload))
  } catch {
    /* quota / private mode */
  }
}

/** Prefer DB; fill gaps from local draft (OR per index) when plan row id matches. */
export function mergeChecklistFromDraft(
  dbChecks: boolean[],
  draft: ChecklistDraftPayload | null,
  planRowId: string,
): boolean[] {
  if (!draft || draft.planRowId !== planRowId || draft.checks.length !== dbChecks.length) {
    return dbChecks
  }
  return dbChecks.map((b, i) => Boolean(b || draft.checks[i]))
}
