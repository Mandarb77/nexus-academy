export type ProfileRole = 'student' | 'teacher'

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  wp: number
  gold: number
  rank: string
  role: ProfileRole
}
