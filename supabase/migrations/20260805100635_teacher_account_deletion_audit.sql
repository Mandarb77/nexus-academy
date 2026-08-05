-- Immutable snapshots of teacher-initiated student account deletions.
-- The deleted student intentionally has no foreign key: their auth/profile rows no longer exist.

create table public.teacher_account_deletions (
  id uuid primary key default gen_random_uuid(),
  deleted_by uuid references public.profiles (id) on delete set null,
  deleted_by_email text not null,
  student_id uuid not null,
  student_email text not null,
  student_display_name text,
  created_at timestamptz not null default now()
);

create index teacher_account_deletions_created_at_idx
  on public.teacher_account_deletions (created_at desc);

alter table public.teacher_account_deletions enable row level security;

create policy teacher_account_deletions_teacher_select
  on public.teacher_account_deletions
  for select
  to authenticated
  using (public.is_teacher());

grant select on public.teacher_account_deletions to authenticated;

comment on table public.teacher_account_deletions is
  'Audit snapshots for permanent student Auth deletions initiated by teachers.';
