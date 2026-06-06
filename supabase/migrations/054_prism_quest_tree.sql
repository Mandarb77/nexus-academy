-- Prism Order quest tree seed (slug upsert). Gating via unlock_after_slugs.
-- Guild column: 'Prism' (skill tree section key; display name "Prism Order" in welcome copy).
-- Tools: laser cutter / Glowforge / Cuttle (chips: platform + technique).
--
-- Tier 2: Preservation (6A→7A) and Utility (6B→7B) paths — no branch column; student picks one track.
-- Boss unlocks after ONE path capstone (7A OR 7B) via unlock_after_any_slugs.

alter table public.tiles
  add column if not exists unlock_after_any_slugs text[] not null default '{}';

comment on column public.tiles.unlock_after_any_slugs is
  'Prerequisite slugs; student needs teacher-approved completion on ANY ONE listed slug (OR).';

-- ---------------------------------------------------------------------------
-- Remove legacy Prism curriculum only (no slug). Prod FKs may not CASCADE.
-- ---------------------------------------------------------------------------

delete from public.patents
where tile_id in (
  select id from public.tiles where guild = 'Prism' and slug is null
);

delete from public.skill_completions
where tile_id in (
  select id from public.tiles where guild = 'Prism' and slug is null
);

delete from public.tiles
where guild = 'Prism'
  and slug is null;

-- ---------------------------------------------------------------------------
-- Seed: 10 Prism tiles
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
  steps,
  unlock_after_slugs,
  unlock_after_any_slugs
)
values
  (
    'Prism',
    'Tile 1 · A Name Worth Keeping',
    'prism-01-a-name-worth-keeping',
    1,
    'required',
    true,
    10,
    3,
    false,
    'Make a name permanent in a material that deserves it. One design decision — proportion, material, form, placement — must exist specifically because of who this person is. Name it on the Patent.',
    'A named person — one design choice must exist because of who they are.',
    $chips$[
      {"label": "laser cutter", "kind": "technique"},
      {"label": "Glowforge", "kind": "platform"},
      {"label": "Cuttle", "kind": "platform"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{}',
    '{}'
  ),
  (
    'Prism',
    'Tile 2 · The Story Object',
    'prism-02-the-story-object',
    2,
    'required',
    true,
    10,
    3,
    false,
    'Make something that carries what the name can''t. The object must contain something true about this person that a stranger wouldn''t know — a date, a symbol, an image, a texture — chosen because you know them, not because it looked good. Name what you learned about them on the Patent.',
    'A named person — include something true about them that a stranger wouldn''t know.',
    $chips$[
      {"label": "laser cutter", "kind": "technique"},
      {"label": "Glowforge", "kind": "platform"},
      {"label": "Cuttle", "kind": "platform"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{prism-01-a-name-worth-keeping}',
    '{}'
  ),
  (
    'Prism',
    'Tile 3 · Layers of Meaning · the gate',
    'prism-03-layers-of-meaning',
    3,
    'required',
    true,
    10,
    3,
    false,
    'Multiple pieces. One artifact. The pieces must only make sense together — removing one should break the meaning, not just the aesthetics. This is the gate. Plan before you cut.',
    'A named person — the pieces must only make sense together.',
    $chips$[
      {"label": "laser cutter", "kind": "technique"},
      {"label": "Glowforge", "kind": "platform"},
      {"label": "Cuttle", "kind": "platform"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{prism-02-the-story-object}',
    '{}'
  ),
  (
    'Prism',
    'Tile 4 · Light and Shadow',
    'prism-04-light-and-shadow',
    4,
    'stretch',
    false,
    6,
    12,
    false,
    'Design for a specific quality of light in a specific place. The object should be different — better — in the light condition you designed for than in any other. Name the place and the light on the Patent.',
    'Design for a specific place and quality of light — name both on the Patent.',
    $chips$[
      {"label": "laser cutter", "kind": "technique"},
      {"label": "Glowforge", "kind": "platform"},
      {"label": "Cuttle", "kind": "platform"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{prism-03-layers-of-meaning}',
    '{}'
  ),
  (
    'Prism',
    'Tile 5 · Borrowed and Changed',
    'prism-05-borrowed-and-changed',
    5,
    'stretch',
    false,
    6,
    12,
    false,
    'Find something — a pattern, a form, an image — that already belongs to your recipient''s world. Change it enough that it couldn''t belong to anyone else. The original source goes on the Patent.',
    'Your recipient''s world — borrow and change until it couldn''t belong to anyone else.',
    $chips$[
      {"label": "laser cutter", "kind": "technique"},
      {"label": "Glowforge", "kind": "platform"},
      {"label": "Cuttle", "kind": "platform"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{prism-04-light-and-shadow}',
    '{}'
  ),
  (
    'Prism',
    'Tile 6A · The Archive',
    'prism-path-a-archive',
    6,
    'tier2',
    false,
    10,
    20,
    false,
    'Preserve something worth keeping before it''s gone. The recipient is time — you are making something that will outlast the thing you''re preserving. Name what would be lost without this object.',
    'Time is the recipient — name what would be lost without this object.',
    $chips$[
      {"label": "laser cutter", "kind": "technique"},
      {"label": "Glowforge", "kind": "platform"},
      {"label": "Cuttle", "kind": "platform"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{prism-03-layers-of-meaning}',
    '{}'
  ),
  (
    'Prism',
    'Tile 7A · Restore What Faded',
    'prism-path-a-restore-what-faded',
    7,
    'tier2',
    false,
    10,
    20,
    false,
    'Find something nearly lost — a photograph, a document, an object, a pattern — and bring it back in a material that won''t fade again. The original and the restoration both go on the Patent.',
    'Something nearly lost — original and restoration both go on the Patent.',
    $chips$[
      {"label": "laser cutter", "kind": "technique"},
      {"label": "Glowforge", "kind": "platform"},
      {"label": "Cuttle", "kind": "platform"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{prism-path-a-archive}',
    '{}'
  ),
  (
    'Prism',
    'Tile 6B · The Thing That Organizes',
    'prism-path-b-thing-that-organizes',
    8,
    'tier2',
    false,
    10,
    20,
    false,
    'Bring order to one specific person''s specific chaos. The object must fit their actual life — their actual drawer, their actual desk, their actual tools. Measure before you design.',
    'One specific person — fit their actual drawer, desk, or tools.',
    $chips$[
      {"label": "laser cutter", "kind": "technique"},
      {"label": "Glowforge", "kind": "platform"},
      {"label": "Cuttle", "kind": "platform"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{prism-03-layers-of-meaning}',
    '{}'
  ),
  (
    'Prism',
    'Tile 7B · A Place for Everything',
    'prism-path-b-place-for-everything',
    9,
    'tier2',
    false,
    10,
    20,
    false,
    'Storage designed for use, not for looking. Every dimension serves the thing being stored. Name the object being stored and why it deserves a place on the Patent.',
    'Name the object being stored and why it deserves a place.',
    $chips$[
      {"label": "laser cutter", "kind": "technique"},
      {"label": "Glowforge", "kind": "platform"},
      {"label": "Cuttle", "kind": "platform"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{prism-path-b-thing-that-organizes}',
    '{}'
  ),
  (
    'Prism',
    'What Deserves to Be Remembered?',
    'prism-boss',
    10,
    'boss',
    false,
    15,
    35,
    false,
    'You name it. You name who it''s for. You name what would be lost without it. Walk up and say it out loud. If the answer is good, we cut.',
    'You name it, who it''s for, and what would be lost without it.',
    $chips$[
      {"label": "laser cutter", "kind": "technique"},
      {"label": "Glowforge", "kind": "platform"},
      {"label": "Cuttle", "kind": "platform"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{}',
    '{prism-path-a-restore-what-faded,prism-path-b-place-for-everything}'
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
  steps = excluded.steps,
  unlock_after_slugs = excluded.unlock_after_slugs,
  unlock_after_any_slugs = excluded.unlock_after_any_slugs;
