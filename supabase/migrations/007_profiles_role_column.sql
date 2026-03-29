-- Add profiles.role (default student) and switch teacher RLS to profiles.role via public.is_teacher().
-- Safe to run on projects that already have profiles without this column.

alter table public.profiles
  add column if not exists role text not null default 'student';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('student', 'teacher'));
  end if;
end $$;

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

drop policy if exists "Teachers can read all profiles" on public.profiles;
create policy "Teachers can read all profiles"
  on public.profiles for select
  using (public.is_teacher());

drop policy if exists "Teachers read skill completions" on public.skill_completions;
create policy "Teachers read skill completions"
  on public.skill_completions for select
  using (public.is_teacher());

drop policy if exists "Teachers update skill completions" on public.skill_completions;
create policy "Teachers update skill completions"
  on public.skill_completions for update
  using (public.is_teacher())
  with check (public.is_teacher());

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
