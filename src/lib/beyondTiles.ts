import type { BeyondGuildTag, BeyondTileRow } from '../types/beyondTile'

export const BEYOND_GUILD_TAGS: BeyondGuildTag[] = [
  'Forge',
  'Void',
  'Prism',
  'Silicon',
  'Folded',
  'All',
]

export const BEYOND_BODY_MAX_CHARS = 320

/** Enforce one or two sentences for student proposals. */
export function countSentences(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  const parts = trimmed.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean)
  return parts.length
}

export function validateBeyondBody(body: string): string | null {
  const trimmed = body.trim()
  if (!trimmed) return 'Write one or two sentences.'
  if (trimmed.length > BEYOND_BODY_MAX_CHARS) {
    return `Keep it to one or two sentences (${BEYOND_BODY_MAX_CHARS} characters max).`
  }
  const sentences = countSentences(trimmed)
  if (sentences < 1) return 'Write at least one sentence.'
  if (sentences > 2) return 'No more than two sentences.'
  return null
}

export function formatBeyondGuildTags(tags: string[]): string {
  const list = tags.map((t) => t.trim()).filter(Boolean)
  if (!list.length) return ''
  if (list.length === 1 && list[0].toLowerCase() === 'all') return 'All'
  return list.join(' · ')
}

export function normalizeBeyondRow(raw: Record<string, unknown>): BeyondTileRow {
  const tags = raw.guild_tags
  return {
    id: raw.id as string,
    title: (raw.title as string) ?? '',
    body: (raw.body as string) ?? '',
    guild_tags: Array.isArray(tags) ? (tags as BeyondGuildTag[]) : [],
    credit_line: (raw.credit_line as string | null) ?? null,
    status: (raw.status as BeyondTileRow['status']) ?? 'pending',
    submitted_by: (raw.submitted_by as string | null) ?? null,
    sort_order: (raw.sort_order as number) ?? 0,
    created_at: raw.created_at as string | undefined,
    updated_at: raw.updated_at as string | undefined,
  }
}

export function isStudentSubmitted(row: Pick<BeyondTileRow, 'submitted_by'>): boolean {
  return Boolean(row.submitted_by?.trim())
}
