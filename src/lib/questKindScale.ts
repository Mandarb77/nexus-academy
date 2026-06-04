/*
 * Default wp_value / gold_value per quest_kind on tiles.
 * Authoritative payouts remain on the tile row; triggers read wp_value / gold_value at approval.
 */

import type { QuestKind } from '../types/tile'

export type { QuestKind }

export const QUEST_KIND_LABELS: Record<QuestKind, string> = {
  required: 'Required (Tier 1 core)',
  stretch: 'Stretch (Tier 1 optional)',
  tier2: 'Tier 2',
  boss: 'Boss fight',
}

export function defaultPayoutForQuestKind(kind: QuestKind): { wp: number; gold: number; isCore: boolean } {
  switch (kind) {
    case 'required':
      return { wp: 10, gold: 3, isCore: true }
    case 'stretch':
      return { wp: 6, gold: 13, isCore: false }
    case 'tier2':
      return { wp: 10, gold: 22, isCore: false }
    case 'boss':
      return { wp: 15, gold: 35, isCore: false }
  }
}
