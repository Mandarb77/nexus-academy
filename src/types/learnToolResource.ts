export type LearnToolGuild = 'Forge' | 'Void' | 'Prism' | 'Silicon' | 'Folded'

export type LearnToolResourceStatus = 'pending' | 'approved' | 'archived'

export type LearnToolResourceRow = {
  id: string
  guild: LearnToolGuild
  title: string
  description: string
  url: string
  credit_line: string | null
  status: LearnToolResourceStatus
  submitted_by: string | null
  sort_order: number
  created_at?: string
  updated_at?: string
}
