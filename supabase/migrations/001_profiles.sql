-- Run this in the Supabase SQL Editor (or via Supabase CLI) once per project.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email text,
  wp integer not null default 0,
  gold integer not null default 0,
  rank text not null default 'Initiate'
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Teachers (JWT app_metadata.role = 'teacher') can read all profiles for classroom tools.
create policy "Teachers can read all profiles"
  on public.profiles for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, wp, gold, rank)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Student'
    ),
    0,
    0,
    'Initiate'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Teacher accounts: Dashboard → Authentication → Users → pick user → App Metadata → { "role": "teacher" }
