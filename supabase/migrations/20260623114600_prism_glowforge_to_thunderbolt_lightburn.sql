-- Prism-only language update: Glowforge machine -> Thunder Bolt laser; software/setup -> LightBurn.

update public.tiles
set
  tile_description = replace(tile_description, 'Glowforge', 'Thunder Bolt laser'),
  steps = replace(
    replace(
      steps::text,
      'Set up your toolpath in Glowforge',
      'Set up your toolpath in LightBurn'
    ),
    'Bring the file to Mr. Cook for your first Glowforge settings walkthrough.',
    'Bring the file to Mr. Cook for your first LightBurn settings walkthrough.'
  )::jsonb
where guild = 'Prism'
  and (
    coalesce(tile_description, '') like '%Glowforge%'
    or steps::text like '%Glowforge%'
  );
