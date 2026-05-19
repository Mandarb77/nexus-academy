/*
 * Quest definitions from the `tiles` table (plus optional Quest Builder JSON)
 *
 * `steps` holds per-checklist-line approval flags and resource links for custom patents.
 * Nullable `steps` means “use hardcoded flow” for legacy tiles (see `lib/customTile.ts`).
 */

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
  wp_display?: string | null
  gold_display?: string | null
  subtitle?: string | null
  /** Null for hardcoded tiles (Game Piece, Sticker); populated for builder-created quests. */
  steps?: StepConfig[] | null
  /** Shown below the checklist on some quests (e.g. replay rules). */
  checklist_footer_note?: string | null
}
