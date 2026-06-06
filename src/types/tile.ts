/*
 * Quest definitions from the `tiles` table (plus optional Quest Builder JSON)
 *
 * `steps` holds per-checklist-line approval flags and resource links for custom patents.
 * Nullable `steps` means mark-complete intro tile (no patent flow).
 *
 * Guild trees (051–054): `slug`, `sort_order`, `chips`, `unlock_after_slugs`, `unlock_after_any_slugs`.
 * Unlock resolver: `lib/tileUnlock.ts`.
 */

export type StepConfig = {
  description: string
  requiresApproval: boolean
  resourceUrl?: string
  /** Optional label for the resource link button (default: "Open resource →"). */
  resourceLabel?: string
}

export type QuestKind = 'required' | 'stretch' | 'tier2' | 'boss'

export type LedgerResource = { label: string; url: string }

export type TileChipKind =
  | 'tinkercad_tool'
  | 'resource'
  | 'fusion_option'
  | 'platform'
  | 'technique'

export type TileChip = { label: string; kind: TileChipKind }

export type TileRow = {
  id: string
  guild: string
  skill_name: string
  slug?: string | null
  sort_order?: number | null
  /** Prerequisite slugs — all must be teacher-approved before this quest opens. */
  unlock_after_slugs?: string[] | null
  /** Prerequisite slugs — any one teacher-approved completion unlocks this quest (OR). */
  unlock_after_any_slugs?: string[] | null
  chips?: TileChip[] | null
  wp_value: number
  gold_value?: number | null
  quest_kind?: QuestKind | null
  is_core?: boolean | null
  level4_eligible?: boolean | null
  wp_display?: string | null
  gold_display?: string | null
  subtitle?: string | null
  /** Student-facing quest brief (skill tree + patent plan). */
  tile_description?: string | null
  /** Plan-panel hint; teacher-authored per tile. */
  recipient_guidance?: string | null
  /** Optional resource buttons on patent checklist. */
  ledger_resources?: LedgerResource[] | null
  /** Null = legacy/hardcoded before DB backfill; otherwise checklist lines. */
  steps?: StepConfig[] | null
  /** Shown below the checklist on some quests (e.g. replay rules). */
  checklist_footer_note?: string | null
}
