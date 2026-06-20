/*
 * `profiles` row shape — economy + identity for each Google-authenticated user
 *
 * Mirrors the columns selected in `AuthContext` (`PROFILE_COLUMNS`). WP (Workshop Points)
 * and gold are adjusted by Supabase triggers when teachers approve quests or patent
 * packets — the client treats this interface as read-mostly except after `refreshProfile`.
 * `role` gates `/dashboard` vs student routes; keep values aligned with RLS policies.
 */

export type ProfileRole = 'student' | 'teacher'

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  wp: number
  gold: number
  role: ProfileRole
  /** Optional profile field (reserved for future use). */
  portfolio_quote?: string | null
}
