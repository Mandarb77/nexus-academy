-- Add a student archive flag for learners who should no longer appear in the teacher roster.
-- This does not delete auth users, profiles, patents, inventory, or completion history.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'removed_from_class_at'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'archived_from_class_at'
  ) then
    alter table public.profiles
      rename column removed_from_class_at to archived_from_class_at;
  end if;
end;
$$;

alter table public.profiles
  add column if not exists archived_from_class_at timestamptz;

comment on column public.profiles.archived_from_class_at is
  'When set, teacher roster hides this archived student without deleting their account or history.';

create or replace function public.prevent_student_profile_admin_edits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_teacher() then
    new.role := old.role;
    new.archived_from_class_at := old.archived_from_class_at;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_student_profile_admin_edits on public.profiles;
create trigger prevent_student_profile_admin_edits
  before update on public.profiles
  for each row
  execute function public.prevent_student_profile_admin_edits();
