export type StepConfig = {
  description: string
  requiresApproval: boolean
}

export type TileRow = {
  id: string
  guild: string
  skill_name: string
  wp_value: number
  gold_value?: number | null
  /** Null for hardcoded tiles (Game Piece, Sticker); populated for builder-created quests. */
  steps?: StepConfig[] | null
}
