-- Student-facing Glowforge language → Thunder Bolt / LightBurn.
-- Historical migration files keep Glowforge text for reference; this only updates live rows.
-- Field Guide Glowforge materials link is archived (not deleted) so teachers can restore later.

-- Prism platform chips on guild tiles
update public.tiles
set chips = replace(chips::text, '"label": "Glowforge"', '"label": "Thunder Bolt"')::jsonb
where chips::text like '%"label": "Glowforge"%';

-- Any remaining checklist / brief copy (e.g. Void nameplate cut step)
update public.tiles
set
  tile_description = replace(coalesce(tile_description, ''), 'Glowforge', 'Thunder Bolt laser'),
  steps = replace(
    replace(
      steps::text,
      'on the Glowforge',
      'on the Thunder Bolt laser'
    ),
    'Glowforge',
    'Thunder Bolt laser'
  )::jsonb
where coalesce(tile_description, '') like '%Glowforge%'
   or steps::text like '%Glowforge%';

-- Patent resource buttons (if any still name Glowforge)
update public.tiles
set ledger_resources = replace(
  replace(ledger_resources::text, 'Glowforge card', 'laser-cut card'),
  'Glowforge',
  'Thunder Bolt'
)::jsonb
where ledger_resources::text like '%Glowforge%';

-- Hide Glowforge Field Guide link from students; keep row for later
update public.learn_tool_resources
set
  status = 'archived',
  updated_at = now()
where status = 'approved'
  and (
    title ilike '%glowforge%'
    or description ilike '%glowforge%'
    or url ilike '%glowforge%'
  );
