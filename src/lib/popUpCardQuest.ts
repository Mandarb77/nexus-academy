import type { TileRow } from '../types/tile'
import { isPersonalGamePieceTile } from './gamePieceTile'

/** Must match `tiles.skill_name` for the Prism pop-up card quest (migration 035). */
export const POP_UP_CARD_SKILL_NAME = 'Make a Pop-Up Card for Someone at Kents Hill'

export const POP_UP_CARD_RECIPIENT_GUIDANCE =
  'Who can you make this for? A teacher who has helped you. A staff member you want to thank — custodial staff, kitchen staff, and office staff all count and are often overlooked. A student who is new to the school. A classmate who did something worth celebrating. Day students may also make this for a family member. The rule: you must know something specific about this person that shapes your design.'

export const POP_UP_CARD_ORIGINAL_BONUS_NOTE =
  'Fully original designs not using any template earn a 5 gold bonus — teacher decides at approval.'

export const POP_UP_CARD_STEP2_RESOURCE_LINKS: { label: string; url: string }[] = [
  {
    label: 'UniPopCards free SVG collection',
    url: 'https://unipopcards.com/collections/free-pop-up-card-svg-collection-download-and-create-your-own-stunning-3d-cards',
  },
  {
    label: '3axis.co laser cut cards',
    url: 'https://3axis.co/laser-cut/cards',
  },
  {
    label: 'CutterCrafter popup card files',
    url: 'https://cuttercrafter.com/category/popup-cards',
  },
  {
    label: 'The Analytical Mommy Glowforge card',
    url: 'https://theanalyticalmommy.com/diy-mothers-day-pop-up-card-free-for-cricut-glowforge',
  },
]

/** Eight checklist lines (step 2 text describes approach; links render under this item in the UI). */
export const POP_UP_CARD_STEPS: readonly string[] = [
  'Step 1 — Interview your recipient or observe them. You do not have to tell them you are making them something. Watch and listen. Write down at least two specific things about them before opening any software — what they love, what makes them laugh, what most people do not notice about them. These go in your patent packet.',
  'Step 2 — Choose your approach. Use the resource links below (UniPopCards, 3axis.co, CutterCrafter, The Analytical Mommy). Pick references that fit your design — or plan a fully original design with no template.',
  'Step 3 — Set up your file in the Glowforge app. Go to app.glowforge.com and create a new design. Set material to 80lb Cardstock. Import your SVG. Set score lines to Score with speed maxed out. Set cut lines to Cut. Confirm both are correct before running anything.',
  'Step 4 — Do a test cut on scrap cardstock. Run a small section of the design on scrap material first. Check that score lines fold cleanly and cut lines go all the way through. Do not skip this step.',
  'Step 5 — Cut your card. Load your chosen colored cardstock. Run the full cut. If using multiple colors register carefully between cuts and do not move the cardstock.',
  'Step 6 — Assemble the card. Fold all score lines before gluing anything. Dry fit the whole card first. Glue layer by layer from back to front. Let each layer dry before adding the next.',
  'Step 7 — Write something inside. The card is not complete until something handwritten is inside. It must be specific to this person. It cannot be generic.',
  'Step 8 — Deliver it and photograph the moment. Give the card in person. Take a photo of yourself with the recipient or of them holding the card. Upload the photo to your patent packet. The submit button stays off until a photo is uploaded.',
]

export function isPopUpCardTile(tile: Pick<TileRow, 'guild' | 'skill_name'>): boolean {
  const g = (tile.guild ?? '').trim().toLowerCase()
  const s = (tile.skill_name ?? '').trim()
  return g === 'prism' && s === POP_UP_CARD_SKILL_NAME
}

/** Routes to `/patent-game-piece/:id` and `PersonalGamePiecePatentContent` (stepped layout). */
export function usesGamePieceStylePatentPage(tile: TileRow): boolean {
  return isPersonalGamePieceTile(tile) || isPopUpCardTile(tile)
}
