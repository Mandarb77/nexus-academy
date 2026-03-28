import type { User } from '@supabase/supabase-js'

/** Set `role: "teacher"` under App Metadata in Supabase Auth for teacher accounts. */
export function isTeacherUser(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === 'teacher'
}
