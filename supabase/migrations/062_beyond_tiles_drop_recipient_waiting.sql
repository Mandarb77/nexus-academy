-- Beyond the Tiles — remove recipient_waiting (no longer used in UI).

alter table public.beyond_tiles
  drop column if exists recipient_waiting;
