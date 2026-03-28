export type Role = 'student' | 'teacher'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  wp_total: number
  gold_balance: number
  rank: string
  role: Role
  created_at?: string
}
