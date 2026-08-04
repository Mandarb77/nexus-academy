/*
 * Fran/Barry purchase “moments” shown after Trade (Supply) or on Kit cards.
 *
 * Copy is authored with “Marcus” as a stand-in student. Call sites pass the
 * preferred first name so `withName` personalizes before display — keeps DB/static
 * strings stable while voice stays personal.
 */

import type { ShopCatalogItem } from '../types/shopCatalog'
import { personalizeMarcusCopy } from './preferredFirstName'

const FALLBACK_PURCHASE_MOMENT = `Fran writes it in the ledger.
(Barry, from the back, somewhere.)`

export const LOCKED_SHOP_REQUEST_MOMENT = `Fran writes Marcus's request in the ledger.
"I'll let Mr. Cook know. He'll get back to you."
(Barry, from the back: "He's good about responding.")`

/** Prefer preferred first name; fall back to soft “friend” so copy never shows blank. */
function withName(text: string, firstName?: string | null): string {
  if (!firstName?.trim()) return personalizeMarcusCopy(text, 'friend')
  return personalizeMarcusCopy(text, firstName)
}

const MOMENTS_BY_KEY: Record<string, string> = {
  pick_class_playlist: `Fran writes Marcus into the ledger.
(Barry, from the back: "Keep it clean, kid.")
(Fran: "He knows, Barry.")`,
  snack: `Fran reaches under the counter without looking.
(Barry, from the back: "Sage will recover.")
(Fran: "Sage doesn't care, Barry.")
(Barry: "Sage doesn't.")`,
  opt_out_cleaning_session: `Fran writes it in the ledger. "Five gold. Someone else does your share."
(Barry, from somewhere: "We're not your mother.")`,
  sit_teacher_chair: `Fran writes Marcus into the ledger without looking up.
"The chair. Don't lean back too far. The wheels are particular."
(Barry, from the back: "He's fixed those wheels twice.")`,
  rename_laser_cutter_week: `Fran picks up the pen. "Make it good, kid. Mr. Cook has veto power. He has used it."
(Barry, from the back: "It was The Slice Lord, Fran.")
(Fran: "Either way.")`,
  temporary_shop_title: `Fran picks up the pen and writes the title into the ledger. She does not editorialize.
(Barry, from the back: "Doesn't matter what she writes. It still ends up in the system.")`,
  lab_tools_homework: `Fran slides something across the counter. "One gold. Use the lab. Bring the tools back."
(Barry, from the back, grunts.)`,
  one_tardy_pass_under_15: `Fran: "Thirty-five gold to be late."
(Barry, from the back: "By less than fifteen minutes.")
(Fran: "We don't make the prices.")
(Barry: "We make the prices, Fran.")
(Fran: "Hush.")`,
  sound_effect_button: `Fran: "Eight gold to make a noise."
(Barry, from the back, vaguely: "Sure.")`,
  decorate_workshop_corner: `Fran writes it in the ledger.
(Barry, from the back: "Make it good or don't bother.")`,
  scrap_bin_pass: `Fran: "Five minutes. Five gold."
What you find is yours.`,
  standard_lumber_small: `Fran writes Marcus into the ledger.
"Standard lumber. Take what you need from the rack by the window."`,
  standard_lumber_medium: `Fran writes Marcus into the ledger.
"Standard lumber. Take what you need from the rack by the window."`,
  standard_lumber_large: `Fran writes Marcus into the ledger.
"Standard lumber. Take what you need from the rack by the window."`,
  top_shelf_lumber_small: `Fran: "Marcus is getting top shelf."
(Barry, from the back: "Good choice. Walnut or cherry?")
(Fran: "He'll figure it out at the rack.")`,
  curly_maple_session: `Fran: "Marcus is getting top shelf."
(Barry, from the back: "Good choice. Walnut or cherry?")
(Fran: "He'll figure it out at the rack.")`,
  top_shelf_lumber_large: `Fran: "Marcus is getting top shelf."
(Barry, from the back: "Good choice. Walnut or cherry?")
(Fran: "He'll figure it out at the rack.")`,
  inlay_stock_small: `Fran writes Marcus into the ledger.
"Inlay piece. Small but valuable. Treat it that way."
(Barry, from the back: "Purpleheart oxidizes if you leave it in the sun. Just so you know.")`,
  inlay_stock_medium: `Fran writes Marcus into the ledger.
"Inlay piece. Small but valuable. Treat it that way."
(Barry, from the back: "Purpleheart oxidizes if you leave it in the sun. Just so you know.")`,
  story_wood: `*Card on the barn wood shelf, in Fran's handwriting: Each piece tagged. Read the tag. The wood was somewhere first.*
Fran, writing Marcus into the ledger.
(Barry, from the back: "Good.")`,
  live_edge_wood_blank: `Fran: "Marcus is going live-edge."
(Barry, from the back: "Bark on or bark off?")
(Fran: "He'll decide.")`,
  leather_offcut: `Fran: "Marcus is in the leather bin."
(Barry, from the back: "Real leather. Not vegan. Not bonded. Real.")`,
  specialty_filament_voucher: `Fran writes Marcus into the ledger.
(Barry, from the back: "The glow-in-the-dark stuff fades after about a year, kid. Just so you know.")`,
  filament_selection: `Fran writes Marcus into the ledger.
(Barry, from the back: "The glow-in-the-dark stuff fades after about a year, kid. Just so you know.")`,
  personal_project_pass: `Fran writes Marcus into the ledger. "Personal project. Got it."
(Barry, from the back: "What's he making?")
(Fran: "He didn't say.")
(Barry: "Fair enough.")`,
  evening_lab_session: `Fran writes Marcus into the ledger.
"Coordinate with Mr. Cook. He'll know when the lab is free."`,
  machine_priority_class_period: `Fran writes it in the ledger.
"You're first in line next class period. Don't make a thing of it."`,
  commission_token: `Fran writes Marcus into the ledger.
(Barry, from the back: "Who's he commissioning?")
(Fran: "That's his business, Barry.")`,
  sponsor_community_quest_materials: `Fran writes it in the ledger.
"Generous, kid. We see it."
(Barry, from the back, quietly: "We do.")`,
  twenty_dollar_run: `Fran: "Mr. Cook's run. He'll get what you need."
(Barry, from the back: "Make sure it's for something real. Mr. Cook doesn't run errands.")`,
  customize_canvas_apron: `Fran: "Marcus is doing the apron."
(Barry, from the back: "What's he putting on it?")
(Fran: "Whatever he wants. That's the point.")`,
  fran_barry_supply_apparel: `Fran writes Marcus into the pre-order book.
"Order goes in April. May delivery."
(Barry, from the back: "Once it's yours, it's yours.")`,
}

const MOMENTS_BY_NAME: Record<string, string> = {
  'pick the class playlist': MOMENTS_BY_KEY.pick_class_playlist,
  snack: MOMENTS_BY_KEY.snack,
  'opt out of a cleaning session': MOMENTS_BY_KEY.opt_out_cleaning_session,
  'sit in the teacher chair': MOMENTS_BY_KEY.sit_teacher_chair,
  'rename the laser cutter for a week': MOMENTS_BY_KEY.rename_laser_cutter_week,
  'give yourself a temporary shop title': MOMENTS_BY_KEY.temporary_shop_title,
  'lab tools for other-class homework': MOMENTS_BY_KEY.lab_tools_homework,
  'one tardy pass (under 15 minutes)': MOMENTS_BY_KEY.one_tardy_pass_under_15,
  'sound-effect button': MOMENTS_BY_KEY.sound_effect_button,
  'decorate a corner': MOMENTS_BY_KEY.decorate_workshop_corner,
  'scrap bin pass': MOMENTS_BY_KEY.scrap_bin_pass,
  'standard lumber - small': MOMENTS_BY_KEY.standard_lumber_small,
  'standard lumber - medium': MOMENTS_BY_KEY.standard_lumber_medium,
  'standard lumber - large': MOMENTS_BY_KEY.standard_lumber_large,
  'top shelf lumber - small': MOMENTS_BY_KEY.top_shelf_lumber_small,
  'top shelf lumber - medium': MOMENTS_BY_KEY.curly_maple_session,
  'top shelf lumber - large': MOMENTS_BY_KEY.top_shelf_lumber_large,
  'inlay stock - small': MOMENTS_BY_KEY.inlay_stock_small,
  'inlay stock - medium': MOMENTS_BY_KEY.inlay_stock_medium,
  'story wood': MOMENTS_BY_KEY.story_wood,
  'live-edge wood blank': MOMENTS_BY_KEY.live_edge_wood_blank,
  'leather offcut': MOMENTS_BY_KEY.leather_offcut,
  'specialty filament voucher': MOMENTS_BY_KEY.specialty_filament_voucher,
  'specialty filament': MOMENTS_BY_KEY.specialty_filament_voucher,
  'filament selection': MOMENTS_BY_KEY.filament_selection,
  'personal project pass': MOMENTS_BY_KEY.personal_project_pass,
  'evening lab session': MOMENTS_BY_KEY.evening_lab_session,
  'machine priority for a class period': MOMENTS_BY_KEY.machine_priority_class_period,
  'commission token': MOMENTS_BY_KEY.commission_token,
  "sponsor a classmate's community quest materials": MOMENTS_BY_KEY.sponsor_community_quest_materials,
  'the $20 run': MOMENTS_BY_KEY.twenty_dollar_run,
  'customize the canvas apron': MOMENTS_BY_KEY.customize_canvas_apron,
  "fran and barry's supply co. apparel": MOMENTS_BY_KEY.fran_barry_supply_apparel,
}

function normalizeShopName(name: string): string {
  return name.trim().toLowerCase().replace(/[—–]/g, '-').replace(/\s+/g, ' ')
}

export function purchaseMomentForItem(item: ShopCatalogItem, firstName?: string | null): string {
  const raw =
    item.purchase_moment_text?.trim() ||
    MOMENTS_BY_KEY[item.item_key] ||
    MOMENTS_BY_NAME[normalizeShopName(item.name)] ||
    FALLBACK_PURCHASE_MOMENT
  return withName(raw, firstName)
}

type KitShopItemRef = {
  item_key?: string | null
  name?: string | null
  purchase_moment_text?: string | null
}

export function purchaseMomentForKitItem(
  row: {
    item_name: string
    shop_items?: KitShopItemRef | KitShopItemRef[] | null
  },
  firstName?: string | null,
): string {
  const shopItem = Array.isArray(row.shop_items) ? row.shop_items[0] : row.shop_items
  const raw =
    shopItem?.purchase_moment_text?.trim() ||
    (shopItem?.item_key ? MOMENTS_BY_KEY[shopItem.item_key] : undefined) ||
    (shopItem?.name ? MOMENTS_BY_NAME[normalizeShopName(shopItem.name)] : undefined) ||
    MOMENTS_BY_NAME[normalizeShopName(row.item_name)] ||
    FALLBACK_PURCHASE_MOMENT
  return withName(raw, firstName)
}

export function lockedShopRequestMoment(firstName?: string | null): string {
  return withName(LOCKED_SHOP_REQUEST_MOMENT, firstName)
}
