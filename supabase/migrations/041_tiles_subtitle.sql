-- Add nullable subtitle column to tiles; shown as hover tooltip on quest title cards.
-- Null on existing tiles = no tooltip. Set for Void Tile 2 only for now.

alter table public.tiles
  add column if not exists subtitle text;

update public.tiles
set subtitle = 'Make a holder for an object somebody has — a hairbrush holder, dice tray, key holder, and more.'
where guild = 'Void Navigators'
  and skill_name = 'I Wanna Hold Your Hand';
