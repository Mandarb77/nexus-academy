-- Tool glossary: kid-facing hints for tile tool-chips (lookup by tool_name; software disambiguates).

create table if not exists public.tool_glossary (
  id uuid primary key default gen_random_uuid(),
  tool_name text not null,
  software text not null,
  hint text not null default '',
  active boolean not null default true,
  unique (tool_name)
);

create index if not exists tool_glossary_software_idx on public.tool_glossary (software);
create index if not exists tool_glossary_active_idx on public.tool_glossary (active) where active;

comment on table public.tool_glossary is
  'Hints for quest tile tool-chips; tool_name must match chip label exactly.';
comment on column public.tool_glossary.software is
  'CAD/app family (e.g. Tinkercad, Fusion 360) — disambiguates if labels overlap across guilds.';
comment on column public.tool_glossary.hint is
  'Short kid-facing “what does this do”; editable in teacher Tool glossary page.';

alter table public.tool_glossary enable row level security;

drop policy if exists "Authenticated read tool glossary" on public.tool_glossary;
create policy "Authenticated read tool glossary"
  on public.tool_glossary for select to authenticated using (true);

drop policy if exists "Teachers manage tool glossary" on public.tool_glossary;
create policy "Teachers manage tool glossary"
  on public.tool_glossary for all to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

-- ---------------------------------------------------------------------------
-- Seed: Forge guild / Tinkercad (first draft — refine via /teacher/tools)
-- ---------------------------------------------------------------------------

insert into public.tool_glossary (tool_name, software, hint, active)
values
  (
    'Scale',
    'Tinkercad',
    'Resize an object. Corner handles resize proportionally; side handles stretch one dimension. Hold Shift to lock proportions.',
    true
  ),
  (
    'Align',
    'Tinkercad',
    'Snap objects into line. Select two or more, hit Align, click the guide dots to line them up by edge or center. Stops you eyeballing it.',
    true
  ),
  (
    'Hole',
    'Tinkercad',
    'Turn any shape into a subtractor. Mark a shape as a "hole," group it with a solid, and it carves itself out. This is how you make pockets, slots, and recesses.',
    true
  ),
  (
    'Group',
    'Tinkercad',
    'Combine objects into one — merges solids, or applies holes to solids. The core Tinkercad move; almost everything ends in a Group.',
    true
  ),
  (
    'Ruler',
    'Tinkercad',
    'Drop it on the workplane to see exact dimensions and type precise measurements. The difference between "about right" and "fits."',
    true
  ),
  (
    'Rotate',
    'Tinkercad',
    'Spin an object around an axis. Grab the curved arrows; snap to angles or type an exact degree.',
    true
  ),
  (
    'Mirror',
    'Tinkercad',
    'Flip an object to make its reverse. Use it for left/right pairs and symmetric parts.',
    true
  ),
  (
    'Workplane',
    'Tinkercad',
    'Move your "ground" onto any surface. Drop a new workplane on the side or top of an object to build directly on that face instead of the floor.',
    true
  ),
  (
    'Bevel',
    'Tinkercad',
    'Round or angle a sharp edge. Softens corners — better feel in the hand, fewer print artifacts.',
    true
  ),
  (
    'Shell',
    'Tinkercad',
    'Hollow out a solid so it has walls and an opening. Saves material and makes lids, boxes, and enclosures possible.',
    true
  ),
  (
    'Extrude',
    'Tinkercad',
    'Push a 2D shape up into 3D. Pull a flat profile into a solid with height.',
    true
  ),
  (
    'Sketch (SVG)',
    'Tinkercad',
    'Import a 2D vector file (SVG) and extrude it. How a logo, a maker''s mark, or a custom outline becomes a 3D object.',
    true
  )
on conflict (tool_name) do update set
  software = excluded.software,
  hint = excluded.hint,
  active = excluded.active;
