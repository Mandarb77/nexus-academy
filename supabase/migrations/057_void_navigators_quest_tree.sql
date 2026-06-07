-- Void Navigators quest tree seed (slug upsert). Gating via unlock_after_slugs.
-- CNC / Carbide Create guild — five tiles, two gates, one boss.
--
-- Tile 4 (stretch) is visible from day one — no unlock_after_slugs (optional, not locked).
-- Boss unlocks after BOTH gates (AND), same pattern as Forge / Silicon.

-- ---------------------------------------------------------------------------
-- Remove legacy Void Navigators curriculum only (no slug). Prod FKs may not CASCADE.
-- ---------------------------------------------------------------------------

delete from public.patents
where tile_id in (
  select id from public.tiles where guild = 'Void Navigators' and slug is null
);

delete from public.skill_completions
where tile_id in (
  select id from public.tiles where guild = 'Void Navigators' and slug is null
);

delete from public.tiles
where guild = 'Void Navigators'
  and slug is null;

-- ---------------------------------------------------------------------------
-- Seed: 8 Void Navigators tiles
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
  subtitle,
  checklist_footer_note,
  chips,
  steps,
  unlock_after_slugs,
  unlock_after_any_slugs
)
values
  (
    'Void Navigators',
    'Tile 1 · The mark''s origin',
    'void-01-marks-origin',
    1,
    'required',
    true,
    10,
    3,
    false,
    'Design your Maker''s Mark in Carbide Create · cut it in Delrin on the CNC · this is the mark that goes on everything you make · get it right',
    'Your mark — cut in Delrin; this is the signature that goes on everything you make.',
    null,
    null,
    $chips$[
      {"label": "V-carve op", "kind": "technique"},
      {"label": "Contour op", "kind": "technique"},
      {"label": "Toolpath", "kind": "technique"},
      {"label": "Simulate", "kind": "technique"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it on the CNC, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{}',
    '{}'
  ),
  (
    'Void Navigators',
    'Tile 2 · First cut for someone',
    'void-02-first-cut',
    2,
    'required',
    true,
    10,
    3,
    false,
    'V-carve a sign, blank, or board for a named recipient · learn the feed, the depth, the wood · simple geometry · one material · the recipient is the constraint',
    'A named recipient — simple geometry, one material; they are the constraint.',
    null,
    null,
    $chips$[
      {"label": "V-carve op", "kind": "technique"},
      {"label": "Text tool", "kind": "technique"},
      {"label": "Vector import", "kind": "technique"},
      {"label": "Simulate", "kind": "technique"},
      {"label": "Thingiverse · Printables", "kind": "resource"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it on the CNC, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{void-01-marks-origin}',
    '{}'
  ),
  (
    'Void Navigators',
    'Tile 3 · Inlay · the competence gate',
    'void-03-inlay-gate',
    3,
    'required',
    true,
    10,
    3,
    false,
    'Two materials · one flush surface · the tool curve is the test · the pocket and the piece have to fit · not close · fit',
    'A named recipient — pocket and inlay piece must fit, not merely come close.',
    null,
    'this is where you find out if the machine does what you think it does',
    $chips$[
      {"label": "Pocket op", "kind": "technique"},
      {"label": "Contour op", "kind": "technique"},
      {"label": "Dogbone", "kind": "technique"},
      {"label": "Toolpath", "kind": "technique"},
      {"label": "VCarve option", "kind": "fusion_option"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it on the CNC, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{void-02-first-cut}',
    '{}'
  ),
  (
    'Void Navigators',
    'Tile 4 · Three bears',
    'void-04-three-bears',
    4,
    'stretch',
    false,
    6,
    13,
    false,
    'Three different wood species · curves that mate at the joint · kerf is the design challenge · each piece fits the next · the negative space of one is the positive space of another',
    'Named recipient — three species, joints that mate; kerf is the design challenge.',
    'e.g. mama bear + daddy bear + baby bear · walnut, maple, cherry',
    null,
    $chips$[
      {"label": "Vector draw", "kind": "technique"},
      {"label": "Contour op", "kind": "technique"},
      {"label": "Dogbone", "kind": "technique"},
      {"label": "VCarve option", "kind": "fusion_option"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it on the CNC, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{}',
    '{}'
  ),
  (
    'Void Navigators',
    'Tile 5 · Restore or replace',
    'void-05-restore-replace',
    5,
    'required',
    true,
    10,
    3,
    false,
    'Find something worn, broken, or missing that belongs somewhere · make it again · the object has a place to go back to · the recipient is the test · not just the cut',
    'Someone with a real worn, broken, or missing piece — the object must go back where it belongs.',
    null,
    null,
    $chips$[
      {"label": "V-carve op", "kind": "technique"},
      {"label": "Contour op", "kind": "technique"},
      {"label": "Toolpath", "kind": "technique"},
      {"label": "chalkboard first", "kind": "resource"},
      {"label": "Granite Hills signs ×8", "kind": "resource"},
      {"label": "trail markers", "kind": "resource"},
      {"label": "worn room plaques", "kind": "resource"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it on the CNC, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{void-03-inlay-gate}',
    '{}'
  ),
  (
    'Void Navigators',
    'Gate A · Joinery',
    'void-gate-a-joinery',
    6,
    'tier2',
    false,
    10,
    22,
    false,
    'Two parts that fit and function together · designed for the joint, not just the surface',
    'A named recipient — two parts that fit and function together.',
    'e.g. box · sliding lid · tool organizer · game',
    null,
    $chips$[
      {"label": "Pocket op", "kind": "technique"},
      {"label": "Dogbone", "kind": "technique"},
      {"label": "VCarve option", "kind": "fusion_option"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it on the CNC, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{void-03-inlay-gate}',
    '{}'
  ),
  (
    'Void Navigators',
    'Gate B · Imported 3D relief',
    'void-gate-b-3d-relief',
    7,
    'tier2',
    false,
    10,
    22,
    false,
    'Bring external 3D data into Carbide Create · execute the texture faithfully on the machine',
    'A named recipient — external 3D data executed faithfully on the machine.',
    'e.g. topographic map · baseball with laces · STL of a dog''s face',
    null,
    $chips$[
      {"label": "3D roughing", "kind": "technique"},
      {"label": "3D finish", "kind": "technique"},
      {"label": "VCarve Pro", "kind": "fusion_option"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it on the CNC, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{void-03-inlay-gate}',
    '{}'
  ),
  (
    'Void Navigators',
    'Boss fight · Student proposed',
    'void-boss',
    8,
    'boss',
    false,
    15,
    35,
    false,
    'Name the thing. Name the recipient. Name a partner if you want one. 90-second conversation. No written proposal. Patent sheet is the only artifact.',
    'Name the recipient as part of the 90-second pitch.',
    null,
    null,
    $chips$[
      {"label": "any tools welcome", "kind": "resource"},
      {"label": "any guild welcome", "kind": "resource"},
      {"label": "4×8 CNC welcome", "kind": "resource"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Design it, cut it on the CNC, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb,
    '{void-gate-a-joinery,void-gate-b-3d-relief}',
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
  subtitle = excluded.subtitle,
  checklist_footer_note = excluded.checklist_footer_note,
  chips = excluded.chips,
  steps = excluded.steps,
  unlock_after_slugs = excluded.unlock_after_slugs,
  unlock_after_any_slugs = excluded.unlock_after_any_slugs;
