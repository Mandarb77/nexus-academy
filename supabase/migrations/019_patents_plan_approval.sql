-- Patent packets now support Plan Approval before making begins.
-- Allows partial patent rows (field_2..4 nullable) and adds status/stage for teacher workflow.

alter table public.patents
  add column if not exists stage text not null default 'plan',
  add column if not exists status text not null default 'pending';

-- Allow partial plan submissions.
alter table public.patents
  alter column field_2 drop not null,
  alter column field_3 drop not null,
  alter column field_4 drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'patents_stage_check' and conrelid = 'public.patents'::regclass
  ) then
    alter table public.patents
      add constraint patents_stage_check check (stage in ('plan', 'packet'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'patents_status_check' and conrelid = 'public.patents'::regclass
  ) then
    alter table public.patents
      add constraint patents_status_check check (status in ('pending', 'approved', 'returned'));
  end if;
end $$;

create index if not exists patents_student_tile_stage_idx
  on public.patents (student_id, tile_id, stage, created_at desc);

drop policy if exists "Students update own patents" on public.patents;
create policy "Students update own patents"
  on public.patents for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists "Teachers update patents" on public.patents;
create policy "Teachers update patents"
  on public.patents for update
  using (public.is_teacher())
  with check (public.is_teacher());

