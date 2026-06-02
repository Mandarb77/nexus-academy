/*
 * Unified patent-ledger content resolver
 *
 * `PatentLedger` is one component for every patent tile (game piece, pop-up card, sticker,
 * Void proto, and Quest Builder / T-shirt customs). The ledger's QUESTION rows are fixed; only
 * the per-tile CONTENT varies — checklist steps, resource links, recipient guidance, footer note.
 *
 * This module centralizes that per-tile content. Hardcoded flagship quests (game piece, sticker,
 * pop-up) keep their step copy + resource links here (previously embedded in their bespoke
 * components); Quest Builder / Void tiles resolve steps from the DB via `resolvedTileSteps`.
 *
 * Checklist indexing contract: step COUNT and ORDER must match the legacy lists so existing
 * `patents.checklist_state` boolean arrays stay aligned (game piece = 8, sticker = 8, pop-up = 8).
 */

import type { StepConfig, TileRow } from '../types/tile'
import { isPersonalGamePieceTile } from './gamePieceTile'
import {
  isPopUpCardTile,
  POP_UP_CARD_STEPS,
  POP_UP_CARD_STEP2_RESOURCE_LINKS,
  POP_UP_CARD_RECIPIENT_GUIDANCE,
  POP_UP_CARD_ORIGINAL_BONUS_NOTE,
} from './popUpCardQuest'
import { isStickerTile } from './stickerTile'
import {
  isVoidTile1Tile,
  VOID_TILE1_CHECKLIST_FOOTER,
  VOID_TILE1_RECIPIENT_GUIDANCE,
} from './voidTile1Proto'
import { PERSONAL_GAME_PIECE_STEPS } from './personalGamePieceSteps'
import { STICKER_STEPS } from './stickerSteps'
import { resolvedTileSteps, isTShirtPatentQuestTile } from './customTile'
import { T_SHIRT_QUEST_CHECKLIST_FOOTER } from './tShirtQuestSteps'

export type LedgerResource = { label: string; url: string }

export type LedgerContent = {
  steps: StepConfig[]
  resources: LedgerResource[]
  recipientGuidance: string | null
  footerNote: string | null
}

const TINKERCAD_JOIN_URL = 'https://www.tinkercad.com/joinclass/2XTJEL26G'
const TINKERCAD_TEMPLATE_URL =
  'https://www.tinkercad.com/things/1v3brIkBiqu/edit?returnTo=%2Fclassrooms%2F7CUhdwU3tyT%2Factivities%2FkSIm4lUkPQI&sharecode=DX6LI_t08XwEVWpoDJ2Puk_CeJgr5t7fhARIwRkhF2Q'
const TINKERCAD_LOCKED_BASE_URL = 'https://www.tinkercad.com/things/1v3brIkBiqu-game-clip2'

const GAME_PIECE_REPLAY_NOTE =
  'This quest can be completed again for bonus WP as you improve your TinkerCAD skills. Each version must be a meaningful improvement, not a re-print.'

/** Wrap plain step strings as StepConfig (requiresApproval unused by the ledger UI). */
function toStepConfigs(lines: readonly string[]): StepConfig[] {
  return lines.map((description) => ({ description, requiresApproval: false }))
}

/** Collect resource links carried on resolved StepConfig entries (DB/Void/custom tiles). */
function resourcesFromSteps(steps: StepConfig[]): LedgerResource[] {
  const seen = new Set<string>()
  const out: LedgerResource[] = []
  for (const s of steps) {
    if (s.resourceUrl && !seen.has(s.resourceUrl)) {
      seen.add(s.resourceUrl)
      out.push({ url: s.resourceUrl, label: s.resourceLabel?.trim() || 'Open resource' })
    }
  }
  return out
}

export function ledgerContentForTile(tile: TileRow): LedgerContent {
  // Prism pop-up card — interview-driven; four template sources + originality bonus note.
  if (isPopUpCardTile(tile)) {
    return {
      steps: toStepConfigs(POP_UP_CARD_STEPS),
      resources: POP_UP_CARD_STEP2_RESOURCE_LINKS.map((r) => ({ label: r.label, url: r.url })),
      recipientGuidance: POP_UP_CARD_RECIPIENT_GUIDANCE,
      footerNote: POP_UP_CARD_ORIGINAL_BONUS_NOTE,
    }
  }

  // Forge personal game piece — TinkerCAD class + template + locked base.
  if (isPersonalGamePieceTile(tile)) {
    return {
      steps: toStepConfigs(PERSONAL_GAME_PIECE_STEPS),
      resources: [
        { label: 'Join TinkerCAD class — code: 2XTJEL26G', url: TINKERCAD_JOIN_URL },
        { label: 'Open TinkerCAD Template', url: TINKERCAD_TEMPLATE_URL },
        { label: 'Open locked base in TinkerCAD', url: TINKERCAD_LOCKED_BASE_URL },
      ],
      recipientGuidance: null,
      footerNote: GAME_PIECE_REPLAY_NOTE,
    }
  }

  // Folded Path sticker — Piskel design + Cricut Design Space.
  if (isStickerTile(tile)) {
    return {
      steps: toStepConfigs(STICKER_STEPS),
      resources: [
        { label: 'Open Piskel', url: 'https://www.piskelapp.com/' },
        { label: 'Go to design.cricut.com', url: 'https://design.cricut.com' },
      ],
      recipientGuidance: null,
      footerNote: null,
    }
  }

  // Void proto coaster — DB/proto steps; recipient guidance + replay footer.
  if (isVoidTile1Tile(tile)) {
    const steps = resolvedTileSteps(tile)
    return {
      steps,
      resources: resourcesFromSteps(steps),
      recipientGuidance: VOID_TILE1_RECIPIENT_GUIDANCE,
      footerNote: VOID_TILE1_CHECKLIST_FOOTER,
    }
  }

  // Quest Builder / T-shirt customs — steps + resources from the DB row.
  const steps = resolvedTileSteps(tile)
  const footerNote =
    tile.checklist_footer_note?.trim() || (isTShirtPatentQuestTile(tile) ? T_SHIRT_QUEST_CHECKLIST_FOOTER : null)
  return {
    steps,
    resources: resourcesFromSteps(steps),
    recipientGuidance: null,
    footerNote,
  }
}
