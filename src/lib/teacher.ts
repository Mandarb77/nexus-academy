import type { Profile } from '../types/profile'

export function isTeacherProfile(profile: Profile | null | undefined): boolean {
  return profile?.role === 'teacher'
}
