-- Void Navigators Tile 4 (Three bears) — gate after Tile 3 competence gate.

update public.tiles
set unlock_after_slugs = '{void-03-inlay-gate}'
where slug = 'void-04-three-bears';
