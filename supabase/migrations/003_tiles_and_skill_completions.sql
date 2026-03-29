-- Tiles (skill tree) and per-student completion requests.
-- If you already have skill_completions with a different shape, migrate data before applying.

create table if not exists public.tiles (
  id uuid primary key default gen_random_uuid(),
  guild text not null,
  skill_name text not null,
  wp_value integer not null default 10,
  unique (guild, skill_name)
);

alter table public.tiles enable row level security;

drop policy if exists "Authenticated users can read tiles" on public.tiles;
create policy "Authenticated users can read tiles"
  on public.tiles for select
  to authenticated
  using (true);

insert into public.tiles (guild, skill_name, wp_value) values
  ('Forge', 'Navigate TinkerCAD', 10),
  ('Forge', 'Create a model', 10),
  ('Forge', 'Export STL file', 10),
  ('Forge', 'Check size before printing', 10),
  ('Forge', 'Design for 3D printing', 10),
  ('Prism', 'Vector vs raster', 10),
  ('Prism', 'Create shapes in Cuttle', 10),
  ('Prism', 'Label cut and engrave lines', 10),
  ('Prism', 'Glowforge safe operation', 10),
  ('Prism', 'Run a test cut', 10)
on conflict (guild, skill_name) do nothing;

create table if not exists public.skill_completions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  tile_id uuid not null references public.tiles (id) on delete cascade,
  skill_key text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'returned')),
  created_at timestamptz not null default now(),
  unique (student_id, tile_id)
);

create index if not exists skill_completions_student_id_idx on public.skill_completions (student_id);
create index if not exists skill_completions_tile_id_idx on public.skill_completions (tile_id);

alter table public.skill_completions enable row level security;

drop policy if exists "Users read own skill completions" on public.skill_completions;
drop policy if exists "Users insert own skill completions" on public.skill_completions;
drop policy if exists "Students read own skill completions" on public.skill_completions;
drop policy if exists "Students insert own skill completions" on public.skill_completions;
drop policy if exists "Teachers read skill completions" on public.skill_completions;
drop policy if exists "Teachers update skill completions" on public.skill_completions;

create policy "Students read own skill completions"
  on public.skill_completions for select
  using (auth.uid() = student_id);

create policy "Students insert own skill completions"
  on public.skill_completions for insert
  with check (auth.uid() = student_id);

create policy "Students update returned to pending"
  on public.skill_completions for update
  using (auth.uid() = student_id and status = 'returned')
  with check (auth.uid() = student_id and status = 'pending');

create policy "Teachers read skill completions"
  on public.skill_completions for select
  using (public.is_teacher());

create policy "Teachers update skill completions"
  on public.skill_completions for update
  using (public.is_teacher())
  with check (public.is_teacher());
