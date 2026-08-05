/*
 * Preferred first name helpers — Fran/Barry voice + Workshop welcome
 *
 * Canonical store: `profiles.preferred_first_name` (not Google display_name).
 * Shop purchase moments still ship with “Marcus” placeholders; `personalizeMarcusCopy`
 * swaps them at render time so catalog copy stays editable without per-student rows.
 * `needsPreferredFirstName` drives PreferredFirstNameGate; teachers never hit the gate.
 */

import type { Profile } from '../types/profile'

const FALLBACK = 'friend'

/** Best guess to prefill the “what should Fran call you?” field. */
export function suggestedPreferredFirstName(input: {
  preferredFirstName?: string | null
  displayName?: string | null
  fullNameFromGoogle?: string | null
  email?: string | null
}): string {
  const preferred = input.preferredFirstName?.trim()
  if (preferred) return preferred

  for (const raw of [input.displayName, input.fullNameFromGoogle]) {
    const token = firstNameToken(raw)
    if (token) return token
  }
  return ''
}

function firstNameToken(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const first = raw.trim().split(/\s+/)[0] ?? ''
  if (!/^[A-Za-z][A-Za-z'-]{1,30}$/.test(first)) return null
  if (/\d/.test(first)) return null
  return capitalizeName(first)
}

export function capitalizeName(name: string): string {
  const t = name.trim()
  if (!t) return ''
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Name Fran uses in shop voice — preferred first, else a soft fallback. */
export function preferredFirstNameForVoice(profile: Pick<Profile, 'preferred_first_name' | 'display_name'> | null | undefined): string {
  const preferred = profile?.preferred_first_name?.trim()
  if (preferred) return preferred
  const fromDisplay = firstNameToken(profile?.display_name)
  if (fromDisplay) return fromDisplay
  return FALLBACK
}

export function possessiveForm(name: string): string {
  const n = name.trim() || FALLBACK
  if (/s$/i.test(n)) return `${n}'`
  return `${n}'s`
}

/** Swap Marcus placeholders in Fran/Barry copy for the student's preferred name. */
export function personalizeMarcusCopy(text: string, firstName: string): string {
  const name = firstName.trim() || FALLBACK
  const poss = possessiveForm(name)
  return text
    .replace(/Marcus's/g, poss)
    .replace(/Marcus’/g, poss)
    .replace(/Marcus/g, name)
}

export function needsPreferredFirstName(profile: Pick<Profile, 'preferred_first_name' | 'role'> | null | undefined): boolean {
  if (!profile) return false
  if (profile.role === 'teacher') return false
  return !profile.preferred_first_name?.trim()
}
