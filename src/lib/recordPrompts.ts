/*
 * Record panel (Patent tab iii) copy — per-tile overrides via `tiles.record_prompts`.
 * When null, PatentLedger uses DEFAULT_RECORD_PROMPTS (legacy hardcoded copy).
 */

import type { TileRow } from '../types/tile'

export type RecordFieldKey = 'field_3' | 'field_4' | 'field_5' | 'field_6' | 'field_7'

export type RecordPromptRow = {
  /** Roman numeral label, or null for an inserted row between vi and vii. */
  rowNum: string | null
  field: RecordFieldKey
  label: string
  hint?: string | null
  required?: boolean
  placeholder?: string | null
  multiline?: boolean
}

export const DEFAULT_RECORD_PROMPTS: RecordPromptRow[] = [
  {
    rowNum: 'v',
    field: 'field_3',
    label: 'What did you make, and what makes it yours?',
    hint: 'Where did you go beyond the example?',
    required: true,
    placeholder:
      "e.g. I made a wolf figure and carved a notch so it stands on its own — that wasn't in the example.",
  },
  {
    rowNum: 'vi',
    field: 'field_4',
    label: 'What failed, and what did you change?',
    required: true,
    placeholder: "e.g. My first print's legs snapped, so I made them thicker and printed it again.",
  },
  {
    rowNum: 'vii',
    field: 'field_5',
    label: 'Maine connection?',
    hint: 'Optional — a place, a person, a tradition this connects to.',
    placeholder: "e.g. It's modeled on the gray wolves at the Maine Wildlife Park in Gray.",
  },
  {
    rowNum: 'viii',
    field: 'field_6',
    label: 'Who taught you?',
    hint: 'Optional — a person who showed you a technique or helped you think it through.',
    placeholder: 'e.g. Ms. Rivera showed me how to mirror vinyl before cutting.',
    multiline: false,
  },
]

function isRecordFieldKey(v: unknown): v is RecordFieldKey {
  return v === 'field_3' || v === 'field_4' || v === 'field_5' || v === 'field_6' || v === 'field_7'
}

export function parseRecordPrompts(raw: unknown): RecordPromptRow[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: RecordPromptRow[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const field = o.field
    const label = typeof o.label === 'string' ? o.label.trim() : ''
    if (!isRecordFieldKey(field) || !label) continue
    const rowNumRaw = o.rowNum
    const rowNum =
      rowNumRaw === null || rowNumRaw === undefined
        ? null
        : typeof rowNumRaw === 'string'
          ? rowNumRaw.trim() || null
          : null
    out.push({
      rowNum,
      field,
      label,
      hint: typeof o.hint === 'string' ? o.hint : null,
      required: Boolean(o.required),
      placeholder: typeof o.placeholder === 'string' ? o.placeholder : null,
      multiline: o.multiline === false ? false : true,
    })
  }
  return out.length ? out : null
}

export function recordPromptsForTile(tile: TileRow): RecordPromptRow[] {
  return parseRecordPrompts(tile.record_prompts) ?? DEFAULT_RECORD_PROMPTS
}

export type RecordPatentValues = {
  field3: string
  field4: string
  field5: string
  field6: string
  field7: string
}

export function recordFieldValue(values: RecordPatentValues, field: RecordFieldKey): string {
  if (field === 'field_3') return values.field3
  if (field === 'field_4') return values.field4
  if (field === 'field_5') return values.field5
  if (field === 'field_6') return values.field6
  return values.field7
}

export function recordSubmitReady(tile: TileRow, values: RecordPatentValues): boolean {
  for (const row of recordPromptsForTile(tile)) {
    if (!row.required) continue
    if (!recordFieldValue(values, row.field).trim()) return false
  }
  return true
}
