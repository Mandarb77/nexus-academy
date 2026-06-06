-- Forge: optional stretch branch after Gate A — heat-set threaded inserts.
-- flow_in_style drives dashed/solid skill-tree connectors (no hardcoded forge slugs in UI).

alter table public.tiles
  add column if not exists flow_in_style text;

comment on column public.tiles.flow_in_style is
  'Skill-tree connector before this tile: dashed-optional (optional branch) or solid (main path).';

-- Make room between Gate A (6) and Gate B; boss moves to 9.
update public.tiles set sort_order = 9 where slug = 'forge-boss';
update public.tiles set sort_order = 8 where slug = 'forge-gate-b-reverse-engineer';
update public.tiles set flow_in_style = 'solid' where slug = 'forge-gate-b-reverse-engineer';

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
  unlock_after_any_slugs,
  flow_in_style
)
values (
  'Forge',
  'Tile 6 · heat and set',
  'forge-06-heat-and-set',
  7,
  'stretch',
  false,
  6,
  13,
  false,
  'Press brass threaded inserts into a printed part using a soldering iron · two parts, one mechanical joint',
  'The connection has to hold under real load · for a named person · the function is the test',
  'e.g. bolted enclosure · adjustable mount · removable lid with screws',
  'What would have failed if you''d just glued it?',
  $chips$[
    {"label": "Bevel", "kind": "tinkercad_tool"},
    {"label": "Shell", "kind": "tinkercad_tool"},
    {"label": "Extrude", "kind": "tinkercad_tool"},
    {"label": "Hole", "kind": "tinkercad_tool"},
    {"label": "Align", "kind": "tinkercad_tool"},
    {"label": "Fusion 360 option", "kind": "fusion_option"}
  ]$chips$::jsonb,
  $steps$[
    {"description": "Build it, document your iterations, and file your patent.", "requiresApproval": false}
  ]$steps$::jsonb,
  '{forge-gate-a-cross-guild}',
  '{}',
  'dashed-optional'
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
  unlock_after_any_slugs = excluded.unlock_after_any_slugs,
  flow_in_style = excluded.flow_in_style;
