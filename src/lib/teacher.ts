/*
 * Teacher role helper
 *
 * Centralizes the string check against `profiles.role` so route guards (`StudentOnlyRoute`,
 * `TeacherDashboardRoute`, banners) stay consistent. If you add admin or TA roles later,
 * update this one function rather than scattering comparisons across the app.
 */

import type { Profile } from '../types/profile'

export function isTeacherProfile(profile: Profile | null | undefined): boolean {
  return profile?.role === 'teacher'
}

/** Teacher walking the app as a student — unlock quests and browse patents read-only. */
export function isTeacherPreviewBrowse(
  studentPreviewMode: boolean,
  profile: Profile | null | undefined,
): boolean {
  return studentPreviewMode && isTeacherProfile(profile)
}
