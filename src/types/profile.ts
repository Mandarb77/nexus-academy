export type ProfileRole = 'student' | 'teacher'

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  wp: number
  gold: number
  rank: string
  role: ProfileRole
  /** Optional profile field (reserved for future use). */
  portfolio_quote?: string | null
}
