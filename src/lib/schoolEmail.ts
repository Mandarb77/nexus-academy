/*
 * Kents Hill class membership — school Google accounts can play; everyone else browses
 *
 * Sign-in stays open so visitors can look around. Writes (quests, shop, kit, proposals)
 * require `@kentshill.org` or an existing teacher profile (staff may use a non-school login).
 */

import type { Profile } from '../types/profile'
import { isTeacherProfile, isTeacherPreviewBrowse } from './teacher'

export const SCHOOL_EMAIL_DOMAIN = 'kentshill.org'

export function emailDomain(email: string | null | undefined): string {
  const raw = email?.trim().toLowerCase() ?? ''
  const at = raw.lastIndexOf('@')
  if (at < 0) return ''
  return raw.slice(at + 1)
}

export function isSchoolEmail(email: string | null | undefined): boolean {
  return emailDomain(email) === SCHOOL_EMAIL_DOMAIN
}

/** Teachers keep full access; students need a school Google account. */
export function canClassInteract(
  email: string | null | undefined,
  profile: Profile | null | undefined,
): boolean {
  if (isTeacherProfile(profile)) return true
  return isSchoolEmail(email)
}

/** Signed-in visitor who may look around but not submit, buy, or save progress. */
export function isGuestBrowse(
  email: string | null | undefined,
  profile: Profile | null | undefined,
): boolean {
  if (!email && !profile) return false
  return !canClassInteract(email, profile)
}

/** Teacher student-preview or off-domain guest — UI is read-only. */
export function isReadOnlyBrowse(
  studentPreviewMode: boolean,
  profile: Profile | null | undefined,
  email: string | null | undefined,
): boolean {
  return isTeacherPreviewBrowse(studentPreviewMode, profile) || isGuestBrowse(email, profile)
}
