-- Add steps (JSONB array of {description, requiresApproval}) and gold_value to tiles.
-- Existing tiles keep steps = null (their steps are defined in frontend code).
-- gold_value overrides the flat 10-gold default for custom quests.
alter table public.tiles
  add column if not exists gold_value integer not null default 10,
  add column if not exists steps jsonb;

-- Teachers need to insert and update tiles.
drop policy if exists "Teachers can insert tiles" on public.tiles;
create policy "Teachers can insert tiles"
  on public.tiles for insert to authenticated
  with check (public.is_teacher());

drop policy if exists "Teachers can update tiles" on public.tiles;
create policy "Teachers can update tiles"
  on public.tiles for update to authenticated
  using (public.is_teacher());

drop policy if exists "Teachers can delete tiles" on public.tiles;
create policy "Teachers can delete tiles"
  on public.tiles for delete to authenticated
  using (public.is_teacher());
