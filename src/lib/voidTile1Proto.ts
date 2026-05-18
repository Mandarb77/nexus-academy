/*
 * Void Navigators — Tier 1 required quest 1 (profile-cut coaster prototype)
 *
 * Hardcoded copy for UX pilot before the guild curriculum / modification path. Must stay
 * aligned with `039_void_tile1_coaster_proto.sql` (`guild` + `skill_name`). Detection is
 * by name, not tile id, so the migration can use any UUID in Supabase.
 */

import type { StepConfig, TileRow } from '../types/tile'

/** Must match `tiles.skill_name` in migration 039. */
export const VOID_TILE1_SKILL_NAME = 'Make a Profile-Cut Coaster for Someone'

export const VOID_TILE1_RECIPIENT_GUIDANCE =
  'Who is this for? A person or a pet counts. Pick someone you know well enough to design a profile silhouette or symbol — a teacher, teammate, family member, or your dog. Write at least two specific details about them before you open any CAM software. Generic coasters are not the goal.'

export const VOID_TILE1_CHECKLIST_FOOTER =
  'Tier 1 — Required (prototype). This is the first of three required Void quests. Stretch and later tiers stay locked until the full guild ships.'

/** Workshop checklist — profile cut, maker's mark, one material, delivery photo. */
export const VOID_TILE1_STEPS: StepConfig[] = [
  {
    description:
      'Step 1 — Name your recipient and capture specifics. Before any software, write who you are making this for (person or pet) and at least two details that will shape the profile design — a hobby, a posture, something only you noticed. These notes belong in your plan packet.',
    requiresApproval: false,
  },
  {
    description:
      'Step 2 — Sketch the profile and your maker\'s mark on paper. Your gift is a flat-profile piece: one clear silhouette or symbol from the side, plus a small maker\'s mark that shows you made it. Get a quick teacher check before you build the CAM file.',
    requiresApproval: false,
  },
  {
    description:
      'Step 3 — Choose one material. Pick a single stock for this quest (hardwood, plywood, or shop-approved acrylic). Write which material you are using and why it fits your recipient — one material only for this prototype.',
    requiresApproval: false,
  },
  {
    description:
      'Step 4 — Build your CAM file for a profile cut. Vector profile for the coaster footprint, include your maker\'s mark in the file, and set cut/score for your one material. Keep it coaster-sized — a flat gift, not a sculpture.',
    requiresApproval: false,
  },
  {
    description:
      'Step 5 — Test on scrap. Run a test profile cut on scrap of the same material. Check that the silhouette reads, the mark is legible, and edges are safe. Do not skip this step.',
    requiresApproval: false,
  },
  {
    description:
      'Step 6 — Cut the final coaster. Run your approved file on the real stock. Sand or finish only as allowed for that material in the shop.',
    requiresApproval: false,
  },
  {
    description:
      'Step 7 — Deliver it. Give the coaster to your recipient in person when you can. Take a photo of them with the gift (or holding it) for your patent packet.',
    requiresApproval: false,
  },
  {
    description:
      'Step 8 — Upload your delivery photo. Attach the delivery photo to your patent packet. Final submit stays locked until the photo is uploaded.',
    requiresApproval: false,
  },
]

export function isVoidTile1Tile(tile: Pick<TileRow, 'guild' | 'skill_name'>): boolean {
  const g = (tile.guild ?? '').trim().toLowerCase()
  const s = (tile.skill_name ?? '').trim()
  return g === 'void navigators' && s === VOID_TILE1_SKILL_NAME
}

/** Proto pilot: only Tile 1 is visible even if more Void rows exist in the DB. */
export function filterVoidTilesForProto(tiles: TileRow[]): TileRow[] {
  return tiles.filter(isVoidTile1Tile)
}
