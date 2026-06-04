/**
 * Emits supabase/migrations/047_backfill_tile_content_from_code.sql from live TS canonical copy.
 * Run: npx tsx scripts/generate-tile-backfill-migration.ts
 */
import { writeFileSync } from 'fs'
import { join } from 'path'
import { PERSONAL_GAME_PIECE_STEPS } from '../src/lib/personalGamePieceSteps'
import {
  POP_UP_CARD_SKILL_NAME,
  POP_UP_CARD_STEPS,
  POP_UP_CARD_RECIPIENT_GUIDANCE,
  POP_UP_CARD_ORIGINAL_BONUS_NOTE,
  POP_UP_CARD_STEP2_RESOURCE_LINKS,
} from '../src/lib/popUpCardQuest'
import { STICKER_STEPS } from '../src/lib/stickerSteps'
import {
  VOID_TILE1_SKILL_NAME,
  VOID_TILE1_STEPS,
  VOID_TILE1_RECIPIENT_GUIDANCE,
  VOID_TILE1_CHECKLIST_FOOTER,
} from '../src/lib/voidTile1Proto'
import {
  T_SHIRT_QUEST_SKILL_NAME,
  T_SHIRT_QUEST_STEPS,
  T_SHIRT_QUEST_CHECKLIST_FOOTER,
} from '../src/lib/tShirtQuestSteps'

const TINKERCAD_JOIN_URL = 'https://www.tinkercad.com/joinclass/2XTJEL26G'
const TINKERCAD_TEMPLATE_URL =
  'https://www.tinkercad.com/things/1v3brIkBiqu/edit?returnTo=%2Fclassrooms%2F7CUhdwU3tyT%2Factivities%2FkSIm4lUkPQI&sharecode=DX6LI_t08XwEVWpoDJ2Puk_CeJgr5t7fhARIwRkhF2Q'
const TINKERCAD_LOCKED_BASE_URL = 'https://www.tinkercad.com/things/1v3brIkBiqu-game-clip2'

const GAME_PIECE_REPLAY_NOTE =
  'This quest can be completed again for bonus WP as you improve your TinkerCAD skills. Each version must be a meaningful improvement, not a re-print.'

const GAME_PIECE_SKILL = 'Design Your Personal Game Piece'
const STICKER_SKILL = 'Design Your Personal Sticker'

const VOID_HOLDER_STEPS = [
  { description: 'Choose the person and the item.', requiresApproval: false },
  { description: 'Measure the item in millimeters. All the dimensions!', requiresApproval: false },
  {
    description: 'Cut a prototype and test the fit with the actual object.',
    requiresApproval: false,
  },
  { description: 'Choose your stock — wood, Delrin, or acrylic.', requiresApproval: false },
] as const

function stepsFromLines(lines: readonly string[]) {
  return lines.map((description) => ({ description, requiresApproval: false }))
}

function sqlJson(value: unknown): string {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`
}

function sqlText(value: string | null): string {
  if (value === null) return 'null'
  return `'${value.replace(/'/g, "''")}'`
}

type RowPatch = {
  guild: string
  skill_name: string
  steps?: unknown
  ledger_resources?: unknown
  recipient_guidance?: string | null
  checklist_footer_note?: string | null
  tile_description?: string | null
}

function upsertBlock(patch: RowPatch): string {
  const dataKeys = (Object.keys(patch) as (keyof RowPatch)[]).filter(
    (k) => k !== 'guild' && k !== 'skill_name',
  )
  const insertCols = ['guild', 'skill_name', ...dataKeys]
  const insertVals = [
    sqlText(patch.guild),
    sqlText(patch.skill_name),
    ...dataKeys.map((k) => {
      if (k === 'steps' || k === 'ledger_resources') return sqlJson(patch[k])
      return sqlText((patch[k] as string | null) ?? null)
    }),
  ]
  const sets = dataKeys.map((k) => `  ${k} = excluded.${k}`).join(',\n')

  return `
insert into public.tiles (${insertCols.join(', ')})
values (${insertVals.join(', ')})
on conflict (guild, skill_name) do update set
${sets};`
}

const patches: RowPatch[] = [
  {
    guild: 'Forge',
    skill_name: GAME_PIECE_SKILL,
    steps: stepsFromLines(PERSONAL_GAME_PIECE_STEPS),
    ledger_resources: [
      { label: 'Join TinkerCAD class — code: 2XTJEL26G', url: TINKERCAD_JOIN_URL },
      { label: 'Open TinkerCAD Template', url: TINKERCAD_TEMPLATE_URL },
      { label: 'Open locked base in TinkerCAD', url: TINKERCAD_LOCKED_BASE_URL },
    ],
    recipient_guidance: null,
    checklist_footer_note: GAME_PIECE_REPLAY_NOTE,
  },
  {
    guild: 'Prism',
    skill_name: POP_UP_CARD_SKILL_NAME,
    steps: stepsFromLines(POP_UP_CARD_STEPS),
    ledger_resources: POP_UP_CARD_STEP2_RESOURCE_LINKS,
    recipient_guidance: POP_UP_CARD_RECIPIENT_GUIDANCE,
    checklist_footer_note: POP_UP_CARD_ORIGINAL_BONUS_NOTE,
  },
  {
    guild: 'Folded Path',
    skill_name: STICKER_SKILL,
    steps: stepsFromLines(STICKER_STEPS),
    ledger_resources: [
      { label: 'Open Piskel', url: 'https://www.piskelapp.com/' },
      { label: 'Go to design.cricut.com', url: 'https://design.cricut.com' },
    ],
    recipient_guidance: null,
    checklist_footer_note: null,
  },
  {
    guild: 'Folded Path',
    skill_name: T_SHIRT_QUEST_SKILL_NAME,
    steps: T_SHIRT_QUEST_STEPS,
    checklist_footer_note: T_SHIRT_QUEST_CHECKLIST_FOOTER,
    recipient_guidance: null,
  },
  {
    guild: 'Void Navigators',
    skill_name: VOID_TILE1_SKILL_NAME,
    steps: VOID_TILE1_STEPS,
    recipient_guidance: VOID_TILE1_RECIPIENT_GUIDANCE,
    checklist_footer_note: VOID_TILE1_CHECKLIST_FOOTER,
  },
  {
    guild: 'Void Navigators',
    skill_name: 'I Wanna Hold Your Hand',
    steps: VOID_HOLDER_STEPS,
    checklist_footer_note: 'Tier 1 — Required. The second of three required Void quests.',
    recipient_guidance: null,
  },
]

/** Void holder row may be missing if 040 never ran — seed minimal row then patch. */
const voidHolderSeed = `
insert into public.tiles (guild, skill_name, wp_value, gold_value)
values ('Void Navigators', 'I Wanna Hold Your Hand', 0, 0)
on conflict (guild, skill_name) do nothing;
`

const header = `-- Backfill tile content from TypeScript canonical copy (byte-for-byte step text).
-- Generated by: npx tsx scripts/generate-tile-backfill-migration.ts
-- Do not hand-edit step strings here — change src/lib/*.ts and regenerate.
--
-- Checklist contract: patents.checklist_state[i] maps to tiles.steps[i].description order.
-- After apply, run: scripts/verify-patent-checklist-alignment.sql (must return 0 mismatches).

`

/** Legacy title variants still on some DBs — same 8 steps as canonical T-shirt quest. */
const tShirtLegacyAliases = `
update public.tiles
set
  steps = ${sqlJson(T_SHIRT_QUEST_STEPS)},
  checklist_footer_note = ${sqlText(T_SHIRT_QUEST_CHECKLIST_FOOTER)}
where guild = 'Folded Path'
  and skill_name <> ${sqlText(T_SHIRT_QUEST_SKILL_NAME)}
  and lower(skill_name) like '%t-shirt%'
  and lower(skill_name) like '%design%'
  and lower(skill_name) like '%someone%';
`

const body = voidHolderSeed + patches.map(upsertBlock).join('\n') + tShirtLegacyAliases

const verify = `
-- ── Post-apply verification (fails migration if any row mismatches) ──
do $$
declare
  v_bad integer;
begin
  select count(*) into v_bad
  from public.patents p
  join public.tiles t on t.id = p.tile_id
  where jsonb_typeof(p.checklist_state) = 'array'
    and jsonb_array_length(p.checklist_state) > 0
    and (
      t.steps is null
      or jsonb_typeof(t.steps) <> 'array'
      or jsonb_array_length(t.steps) <> jsonb_array_length(p.checklist_state)
    );

  if v_bad > 0 then
    raise exception 'checklist_state length mismatch for % patent row(s) — aborting', v_bad;
  end if;
end $$;
`

writeFileSync(
  join(process.cwd(), 'supabase/migrations/047_backfill_tile_content_from_code.sql'),
  header + body + verify,
)
console.log('Wrote supabase/migrations/047_backfill_tile_content_from_code.sql')
