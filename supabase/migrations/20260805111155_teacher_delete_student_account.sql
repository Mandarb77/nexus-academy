-- Permanent student-account deletion support.
--
-- The Edge Function deletes the auth user with an admin client. These cascades
-- ensure the profile and all student-owned rows disappear in the same database
-- transaction. The audit row intentionally has no FK to the deleted student.

create table public.account_deletion_log (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  student_display_name text,
  student_email text,
  deleted_by uuid references public.profiles (id) on delete set null,
  status text not null default 'requested'
    check (status in ('requested', 'completed', 'partial', 'failed')),
  storage_objects_deleted integer not null default 0
    check (storage_objects_deleted >= 0),
  error_message text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create index account_deletion_log_requested_at_idx
  on public.account_deletion_log (requested_at desc);

create index account_deletion_log_student_id_idx
  on public.account_deletion_log (student_id);

alter table public.account_deletion_log enable row level security;

create policy account_deletion_log_teacher_select
  on public.account_deletion_log
  for select
  to authenticated
  using (public.is_teacher());

grant select on public.account_deletion_log to authenticated;

-- These constraints were created without an ON DELETE action in older
-- migrations. They otherwise block auth.admin.deleteUser() whenever the
-- student has progress.
alter table public.skill_completions
  drop constraint if exists skill_completions_student_id_fkey;
alter table public.skill_completions
  add constraint skill_completions_student_id_fkey
  foreign key (student_id) references public.profiles (id) on delete cascade;

alter table public.patents
  drop constraint if exists patents_student_id_fkey;
alter table public.patents
  add constraint patents_student_id_fkey
  foreign key (student_id) references public.profiles (id) on delete cascade;

alter table public.gold_purchases
  drop constraint if exists gold_purchases_student_id_fkey;
alter table public.gold_purchases
  add constraint gold_purchases_student_id_fkey
  foreign key (student_id) references public.profiles (id) on delete cascade;
