-- Folded Path: Tiles 3 and 4 are open with no prerequisites.
-- Stretch and The Readfield Book still unlock after Tile 4 approval.

update public.tiles
set unlock_after_slugs = '{}'
where slug in (
  'folded-03-thing-that-moves',
  'folded-04-short-book-for-a-friend'
);
