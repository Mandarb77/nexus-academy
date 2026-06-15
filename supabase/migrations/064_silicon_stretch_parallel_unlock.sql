-- Silicon Covenant: WHEN AND and UNDER THE SURFACE are parallel stretch tiles.
-- Both unlock after HONEST MACHINE · the gate (silicon-03); UNDER THE SURFACE no longer requires WHEN AND.

update public.tiles
set unlock_after_slugs = '{silicon-03-honest-machine}'
where slug = 'silicon-05-under-the-surface';
