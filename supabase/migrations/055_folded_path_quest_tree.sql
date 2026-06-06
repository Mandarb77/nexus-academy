-- Folded Path quest tree seed (slug upsert). Gating via unlock_after_slugs.
-- Tools: Cricut / vinyl / paper engineering (chips: platform + technique).
--
-- STRETCH COUNT: No fixed stretch slot in schema — three stretch rows (tiles 4–6) use
-- quest_kind = 'stretch' and sort_order 4–6. Same pattern as linear Tier 1 on other guilds.
--
-- COLLABORATIVE (schema question): tiles has no solo/collaborative column. Tier 2
-- "The Readfield Book" is documented as a group project in tile_description and
-- recipient_guidance only. Add a column later if teacher UI needs to filter group quests.
--
-- Unlock: linear required 1→2→3 (gate); stretch 4→5→6; tier2 unlocks after gate (parallel
-- with stretch); boss after tier2.

-- ---------------------------------------------------------------------------
-- Remove legacy Folded Path curriculum only (no slug). Prod FKs may not CASCADE.
-- ---------------------------------------------------------------------------

delete from public.patents
where tile_id in (
  select id from public.tiles where guild = 'Folded Path' and slug is null
);

delete from public.skill_completions
where tile_id in (
  select id from public.tiles where guild = 'Folded Path' and slug is null
);

delete from public.tiles
where guild = 'Folded Path'
  and slug is null;

-- ---------------------------------------------------------------------------
-- Seed: 8 Folded Path tiles
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
    'Folded Path',
    'Tile 1 · First Cut',
    'folded-01-first-cut',
    1,
    'required',
    true,
    10,
    3,
    false,
    'Cut vinyl. Put it on something you use every day. Learn what the machine does — cut, score, weed, transfer. The design is yours. The recipient is you.',
    'You — put vinyl on something you use every day.',
    $chips$[
      {"label": "Cricut", "kind": "platform"},
      {"label": "vinyl", "kind": "technique"},
      {"label": "paper engineering", "kind": "technique"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut and weed it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{}',
    '{}'
  ),
  (
    'Folded Path',
    'Tile 2 · Made for Someone',
    'folded-02-made-for-someone',
    2,
    'required',
    true,
    10,
    3,
    false,
    'Make something flat for a named person using at least two Cricut operations. One design decision must exist specifically because of who they are. Name it on the Patent.',
    'A named person — at least two Cricut operations; one choice must be because of who they are.',
    $chips$[
      {"label": "Cricut", "kind": "platform"},
      {"label": "vinyl", "kind": "technique"},
      {"label": "paper engineering", "kind": "technique"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut and weed it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{folded-01-first-cut}',
    '{}'
  ),
  (
    'Folded Path',
    'Tile 3 · The Thing That Moves · the gate',
    'folded-03-thing-that-moves',
    3,
    'required',
    true,
    10,
    3,
    false,
    'Make something that folds, stands, opens, or closes. The mechanism has to work — decoration alone fails this tile. Score is load-bearing here, not ornamental. This is the gate.',
    'A named person — the fold or mechanism must actually work.',
    $chips$[
      {"label": "Cricut", "kind": "platform"},
      {"label": "vinyl", "kind": "technique"},
      {"label": "paper engineering", "kind": "technique"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut and weed it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{folded-02-made-for-someone}',
    '{}'
  ),
  (
    'Folded Path',
    'Tile 4 · One Shirt, One Person',
    'folded-04-one-shirt-one-person',
    4,
    'stretch',
    false,
    6,
    12,
    false,
    'Design and cut iron-on vinyl for one shirt for one specific person. One design decision that couldn''t belong to anyone else. Name it on the Patent. Not a template with a name swapped in.',
    'One specific person — one design decision that couldn''t belong to anyone else.',
    $chips$[
      {"label": "Cricut", "kind": "platform"},
      {"label": "vinyl", "kind": "technique"},
      {"label": "paper engineering", "kind": "technique"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut and weed it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{folded-03-thing-that-moves}',
    '{}'
  ),
  (
    'Folded Path',
    'Tile 5 · Complicated and Beautiful',
    'folded-05-complicated-beautiful',
    5,
    'stretch',
    false,
    6,
    12,
    false,
    'Pick a technique that scared you — a living hinge, a multi-layer cut, a pop-up mechanism, a pattern that has to register perfectly. Make it for someone. Name what scared you on the Patent.',
    'Someone in your life — name what scared you about the technique on the Patent.',
    $chips$[
      {"label": "Cricut", "kind": "platform"},
      {"label": "vinyl", "kind": "technique"},
      {"label": "paper engineering", "kind": "technique"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut and weed it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{folded-04-one-shirt-one-person}',
    '{}'
  ),
  (
    'Folded Path',
    'Tile 6 · Every Color in Its Place',
    'folded-06-every-color-in-place',
    6,
    'stretch',
    false,
    6,
    12,
    false,
    'Design a multi-color image where the layers have to fit each other perfectly. Each color is a separate cut. Each layer has to land where the last one left off. The registration is the craft — if it doesn''t line up, it isn''t done.',
    'Named recipient — registration must line up; if it doesn''t, it isn''t done.',
    $chips$[
      {"label": "Cricut", "kind": "platform"},
      {"label": "vinyl", "kind": "technique"},
      {"label": "paper engineering", "kind": "technique"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut and weed it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{folded-05-complicated-beautiful}',
    '{}'
  ),
  (
    'Folded Path',
    'The Readfield Book',
    'folded-tier2-readfield-book',
    7,
    'tier2',
    false,
    10,
    20,
    false,
    'A pop-up book made with a group for a classroom of real kids. Interview the teacher first — find out what the class loves, what would make them lean forward. The mechanism has to survive twenty pairs of hands. The story has to hold a room. This is a giving-window project — coordinate the visit before you cut the first page.',
    'A classroom of real kids — group project; interview the teacher and coordinate the visit before you cut.',
    $chips$[
      {"label": "Cricut", "kind": "platform"},
      {"label": "vinyl", "kind": "technique"},
      {"label": "paper engineering", "kind": "technique"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut and weed it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{folded-03-thing-that-moves}',
    '{}'
  ),
  (
    'Folded Path',
    'The Most Beautiful Thing You Know How to Make',
    'folded-boss',
    8,
    'boss',
    false,
    15,
    35,
    false,
    'You name it. You name who it''s for. Paper is the humblest material — what you do with it is the gift. Walk up and say it. If it''s worth making, we make it.',
    'You name it and who it''s for — paper is the material; what you do with it is the gift.',
    $chips$[
      {"label": "Cricut", "kind": "platform"},
      {"label": "vinyl", "kind": "technique"},
      {"label": "paper engineering", "kind": "technique"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut and weed it, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{folded-tier2-readfield-book}',
    '{}'
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
