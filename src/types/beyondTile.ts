export type BeyondTileStatus = 'pending' | 'approved' | 'archived'

export type BeyondGuildTag = 'Forge' | 'Void' | 'Prism' | 'Silicon' | 'Folded' | 'All'

export type BeyondTileRow = {
  id: string
  title: string
  body: string
  guild_tags: BeyondGuildTag[]
  credit_line: string | null
  status: BeyondTileStatus
  submitted_by: string | null
  sort_order: number
  created_at?: string
  updated_at?: string
}
