-- Run this in the Supabase SQL Editor (or via Supabase CLI) once per project.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email text,
  wp integer not null default 0,
  gold integer not null default 0,
  rank text not null default 'Initiate',
  role text not null default 'student' check (role in ('student', 'teacher'))
);

alter table public.profiles enable row level security;

-- Used in RLS so policies can detect teachers without recursive profile checks.
create or replace function public.is_teacher()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select p.role = 'teacher' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Teachers can read all profiles"
  on public.profiles for select
  using (public.is_teacher());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, wp, gold, rank, role)
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
    'Initiate',
    'student'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Promote a user to teacher (see also migration 007 and project docs):
-- update public.profiles set role = 'teacher' where email = 'teacher@yourschool.edu';
