export type StepConfig = {
  description: string
  requiresApproval: boolean
  resourceUrl?: string
  /** Optional label for the resource link button (default: "Open resource →"). */
  resourceLabel?: string
}

export type TileRow = {
  id: string
  guild: string
  skill_name: string
  wp_value: number
  gold_value?: number | null
  /** Null for hardcoded tiles (Game Piece, Sticker); populated for builder-created quests. */
  steps?: StepConfig[] | null
  /** Shown below the checklist on some quests (e.g. replay rules). */
  checklist_footer_note?: string | null
}
