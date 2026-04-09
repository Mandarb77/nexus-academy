/**
 * When multiple `patents` rows exist for the same tile, the UI may pick a primary row
 * (e.g. newest approved) that has empty `field_*` while an older row still holds the
 * student's answers. Merge fills gaps from other rows, newest first.
 */

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

export function fillPatentPlanFieldsFromRows(
  primary: PatentFormRow,
  allRows: PatentFormRow[],
): { field_1: string; field_2: string; field_3: string; field_4: string } {
  const sorted = [...allRows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  const pick = (key: 'field_1' | 'field_2' | 'field_3' | 'field_4'): string => {
    const primaryVal = primary[key]
    if (nonEmptyField(primaryVal)) return primaryVal
    for (const r of sorted) {
      const v = r[key]
      if (nonEmptyField(v)) return v
    }
    return typeof primaryVal === 'string' ? primaryVal : ''
  }

  return {
    field_1: pick('field_1'),
    field_2: pick('field_2'),
    field_3: pick('field_3'),
    field_4: pick('field_4'),
  }
}
