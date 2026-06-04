/*
 * Default wp_value / gold_value per quest_kind on tiles.
 * Authoritative payouts remain on the tile row; triggers read wp_value / gold_value at approval.
 */

import type { QuestKind } from '../types/tile'

export type { QuestKind }

export const QUEST_KIND_LABELS: Record<QuestKind, string> = {
  required: 'Required (Tier 1 core)',
  stretch: 'Stretch (Tier 1 optional)',
  tier2: 'Tier 2 (commission/community)',
  boss: 'Boss fight',
}

/** Default recipient_guidance when creating a quest (teacher can override). */
export function defaultRecipientGuidanceForQuestKind(kind: QuestKind): string {
  if (kind === 'tier2' || kind === 'boss') {
    return 'Name a recipient outside your circle who can say no to your design.'
  }
  return 'Name someone in your life this is for — roommate, family, friend.'
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
