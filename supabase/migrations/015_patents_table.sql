-- Patent Packet answers for checklist-based skills.

create table if not exists public.patents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  tile_id uuid not null references public.tiles (id) on delete cascade,
  field_1 text not null,
  field_2 text not null,
  field_3 text not null,
  field_4 text not null,
  created_at timestamptz not null default now()
);

create index if not exists patents_student_id_idx on public.patents (student_id);
create index if not exists patents_tile_id_idx on public.patents (tile_id);

alter table public.patents enable row level security;

drop policy if exists "Students read own patents" on public.patents;
create policy "Students read own patents"
  on public.patents for select
  using (auth.uid() = student_id);

drop policy if exists "Students insert own patents" on public.patents;
create policy "Students insert own patents"
  on public.patents for insert
  with check (auth.uid() = student_id);

drop policy if exists "Teachers read patents" on public.patents;
create policy "Teachers read patents"
  on public.patents for select
  using (public.is_teacher());

-- Link the specific patent packet used for a completion.
alter table public.skill_completions
  add column if not exists patent_id uuid references public.patents (id) on delete set null;

create index if not exists skill_completions_patent_id_idx on public.skill_completions (patent_id);

