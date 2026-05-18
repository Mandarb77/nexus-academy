/*
 * Merge answers across duplicate `patents` rows for the same tile
 *
 * The “primary” row chosen by `pickStudentPlanPatentContext` might be newest-approved but
 * missing some `field_*` values if the student edited an older row or partial migrations
 * split data. We backfill empty fields from other rows (newest wins) so the form shows
 * the full story without teachers thinking answers were deleted.
 */

// =============================================================================
// Row types — subset of `patents` columns used when merging duplicate rows
// =============================================================================

export type PatentFormRow = {
  id: string
  created_at: string
  field_1?: string | null
  field_2?: string | null
  field_3?: string | null
  field_4?: string | null
}

/** Full shape returned from `patents` select in student patent flows. */
export type LoadedPlanPatentRow = PatentFormRow & {
  status: unknown
  stage?: string | null
  checklist_submitted?: boolean | null
  checklist_approved?: boolean | null
  checklist_state?: unknown
  upload_url?: string | null
  process_upload_url?: string | null
}

function nonEmptyField(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

// =============================================================================
// `fillPatentPlanFieldsFromRows` — backfill empty `field_*` from other duplicate rows
// =============================================================================

export function fillPatentPlanFieldsFromRows(
  primary: PatentFormRow,
  allRows: PatentFormRow[],
): { field_1: string; field_2: string; field_3: string; field_4: string } {
  /* Newest rows first so “backfill from duplicates” prefers recent teacher-visible edits. */
  const sorted = [...allRows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  const pick = (key: 'field_1' | 'field_2' | 'field_3' | 'field_4'): string => {
    const primaryVal = primary[key]
    /* Primary row is authoritative when non-empty — UI picked it for checklist + phase reasons. */
    if (nonEmptyField(primaryVal)) return primaryVal
    for (const r of sorted) {
      const v = r[key]
      if (nonEmptyField(v)) return v
    }
    /* Fall back to empty string (or raw primary string) so controlled inputs never receive `undefined`. */
    return typeof primaryVal === 'string' ? primaryVal : ''
  }

  return {
    field_1: pick('field_1'),
    field_2: pick('field_2'),
    field_3: pick('field_3'),
    field_4: pick('field_4'),
  }
}
