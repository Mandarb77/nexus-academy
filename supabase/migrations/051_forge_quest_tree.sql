-- Forge guild quest tree: slug + chips + sort_order; replace legacy Forge rows.
-- Gating deferred. Path B: one placeholder patent step per tile.
-- STEP 6: Tile 1 recess depth seeded at 0.2" (authoritative for this tree).

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.tiles
  add column if not exists slug text,
  add column if not exists chips jsonb not null default '[]'::jsonb,
  add column if not exists sort_order integer not null default 0;

create unique index if not exists tiles_slug_key on public.tiles (slug);

comment on column public.tiles.slug is
  'Stable id for idempotent seeds and editor references (e.g. forge-01-marks-home).';
comment on column public.tiles.chips is
  'Tool/resource chips: [{ "label": string, "kind": "tinkercad_tool"|"resource"|"fusion_option" }].';
comment on column public.tiles.sort_order is
  'Display order within guild on skill tree (lower first).';

-- ---------------------------------------------------------------------------
-- Remove legacy Forge curriculum only (no slug). Prod FKs may not CASCADE.
-- ---------------------------------------------------------------------------

delete from public.patents
where tile_id in (
  select id from public.tiles where guild = 'Forge' and slug is null
);

delete from public.skill_completions
where tile_id in (
  select id from public.tiles where guild = 'Forge' and slug is null
);

delete from public.tiles
where guild = 'Forge'
  and slug is null;

-- ---------------------------------------------------------------------------
-- Seed: 8 Forge tiles
-- ---------------------------------------------------------------------------

insert into public.tiles (
  guild,
  skill_name,
  slug,
  sort_order,
  quest_kind,
  is_core,
  wp_value,
  gold_value,
  level4_eligible,
  tile_description,
  recipient_guidance,
  chips,
  steps
)
values
  (
    'Forge',
    'Tile 1 · the mark''s home',
    'forge-01-marks-home',
    1,
    'required',
    true,
    10,
    3,
    false,
    'Design a holder for your Maker''s Mark (cut in Delrin or aluminum via CNC). 1.25" wide × 0.2" deep recess · any outer shape · max 3" dia × 4" tall.',
    'Name the person this holder is for — someone in your life.',
    $chips$[
      {"label": "Scale", "kind": "tinkercad_tool"},
      {"label": "Align", "kind": "tinkercad_tool"},
      {"label": "Hole", "kind": "tinkercad_tool"},
      {"label": "Group", "kind": "tinkercad_tool"},
      {"label": "Thingiverse · Printables", "kind": "resource"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Build it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb
  ),
  (
    'Forge',
    'Tile 2 · a thing that fits a thing',
    'forge-02-fits-a-thing',
    2,
    'required',
    true,
    10,
    3,
    false,
    'Print a holder sized to a real object a named person owns · measure first, model second. Tolerances appear for the first time · document your iterations.',
    'A named person who owns the real object you''re sizing the holder to.',
    $chips$[
      {"label": "Ruler", "kind": "tinkercad_tool"},
      {"label": "Rotate", "kind": "tinkercad_tool"},
      {"label": "Mirror", "kind": "tinkercad_tool"},
      {"label": "Workplane", "kind": "tinkercad_tool"},
      {"label": "Thingiverse · Printables", "kind": "resource"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Build it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb
  ),
  (
    'Forge',
    'Tile 3 · two parts, one fit · the gate',
    'forge-03-two-parts-gate',
    3,
    'required',
    true,
    10,
    3,
    false,
    'Model two pieces that must mate — lid + box, cap + base, pin + slot, press fit. Iterate until the fit is intentional, not accidental · this is where Forge takes you or doesn''t.',
    'Name who the mated pair is for — someone in your life.',
    $chips$[
      {"label": "Bevel", "kind": "tinkercad_tool"},
      {"label": "Shell", "kind": "tinkercad_tool"},
      {"label": "Extrude", "kind": "tinkercad_tool"},
      {"label": "Thingiverse · Printables", "kind": "resource"},
      {"label": "Fusion 360 option", "kind": "fusion_option"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Build it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb
  ),
  (
    'Forge',
    'Tile 4 · the thing that moves',
    'forge-04-thing-that-moves',
    4,
    'stretch',
    false,
    6,
    13,
    false,
    'Design a print with a hinge or motion built in · for a named person · the motion serves them. e.g. spinning wheel · rotating sign · articulated pet tag · drawer · snap fit lid.',
    'For a named person — the motion has to serve them, not just demonstrate the technique.',
    $chips$[
      {"label": "Bevel", "kind": "tinkercad_tool"},
      {"label": "Shell", "kind": "tinkercad_tool"},
      {"label": "Extrude", "kind": "tinkercad_tool"},
      {"label": "Sketch (SVG)", "kind": "tinkercad_tool"},
      {"label": "Thingiverse · Printables", "kind": "resource"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Build it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb
  ),
  (
    'Forge',
    'Tile 5 · borrowed and changed',
    'forge-05-borrowed-changed',
    5,
    'stretch',
    false,
    6,
    13,
    false,
    'Find something · take it apart · make it into something it wasn''t · for a named person. The test: could a stranger find the original on Thingiverse? If yes — go further. Scaling is not a modification. Adding your name is not a modification.',
    'For a named person.',
    $chips$[
      {"label": "Scale", "kind": "tinkercad_tool"},
      {"label": "Rotate", "kind": "tinkercad_tool"},
      {"label": "Bevel", "kind": "tinkercad_tool"},
      {"label": "Extrude", "kind": "tinkercad_tool"},
      {"label": "Sketch (SVG)", "kind": "tinkercad_tool"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Build it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb
  ),
  (
    'Forge',
    'Gate A · the cross-guild fit',
    'forge-gate-a-cross-guild',
    6,
    'tier2',
    false,
    10,
    22,
    false,
    'CNC cuts one half. Forge prints the other. Two materials · two tools · one intentional fit. e.g. yin-yang split in Delrin + PLA.',
    'A recipient for the finished object — name them before you start.',
    $chips$[
      {"label": "Fusion 360 option", "kind": "fusion_option"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Build it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb
  ),
  (
    'Forge',
    'Gate B · reverse engineer + replace',
    'forge-gate-b-reverse-engineer',
    7,
    'tier2',
    false,
    10,
    22,
    false,
    'Find something broken or missing in a real person''s life. Measure it · model it · print a replacement that works. Not decorative — functional. The part must perform in context.',
    'A real person with a real broken/missing thing — outside your immediate circle is ideal.',
    $chips$[
      {"label": "Fusion 360 option", "kind": "fusion_option"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Build it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb
  ),
  (
    'Forge',
    'Boss fight · student proposed',
    'forge-boss',
    8,
    'boss',
    false,
    15,
    35,
    false,
    'Name the thing. Name the recipient. Name a partner if you want one. 90-second conversation. No written proposal. Patent sheet is the only artifact.',
    'Name the recipient as part of the 90-second pitch.',
    $chips$[
      {"label": "any tools welcome", "kind": "resource"},
      {"label": "any guild welcome", "kind": "resource"},
      {"label": "Fusion 360 welcome", "kind": "fusion_option"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Build it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb
  )
on conflict (slug) do update set
  guild = excluded.guild,
  skill_name = excluded.skill_name,
  sort_order = excluded.sort_order,
  quest_kind = excluded.quest_kind,
  is_core = excluded.is_core,
  wp_value = excluded.wp_value,
  gold_value = excluded.gold_value,
  level4_eligible = excluded.level4_eligible,
  tile_description = excluded.tile_description,
  recipient_guidance = excluded.recipient_guidance,
  chips = excluded.chips,
  steps = excluded.steps;
