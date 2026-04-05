export type EmpathyDraft = {
  who: string
  why: string
  what_changed: string
  how_learned: string[]
}

export const EMPTY_EMPATHY: EmpathyDraft = {
  who: '',
  why: '',
  what_changed: '',
  how_learned: [],
}

export const EMPATHY_CHECKBOXES = [
  'I thought carefully about what their daily life is like',
  'I asked them directly what they need or want',
  'Someone who knows them well told me something that shaped my design',
  'I watched how they interact with similar objects or spaces',
  'I made an earlier version and got feedback before finalizing',
  'I imagined receiving this myself and asked honestly if I would use it',
]

export function serializeEmpathy(e: EmpathyDraft): string {
  return JSON.stringify({
    who: e.who,
    why: e.why,
    what_changed: e.what_changed,
    how_learned: e.how_learned,
  })
}

export function parseEmpathy(raw: string | null | undefined): EmpathyDraft {
  if (!raw) return EMPTY_EMPATHY
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return {
        who: typeof parsed.who === 'string' ? parsed.who : '',
        why: typeof parsed.why === 'string' ? parsed.why : '',
        what_changed: typeof parsed.what_changed === 'string' ? parsed.what_changed : '',
        how_learned: Array.isArray(parsed.how_learned)
          ? (parsed.how_learned as unknown[]).map(String)
          : [],
      }
    }
    // Old plain-string value: treat as "who"
    return { ...EMPTY_EMPATHY, who: raw }
  } catch {
    return { ...EMPTY_EMPATHY, who: raw }
  }
}

export function isEmpathyValid(e: EmpathyDraft): boolean {
  return e.what_changed.trim().length > 0
}
