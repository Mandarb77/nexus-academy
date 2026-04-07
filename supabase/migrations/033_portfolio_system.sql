-- Portfolio PDF, makers mark, process photo, approval timestamps, teacher quote.

alter table public.profiles
  add column if not exists portfolio_quote text,
  add column if not exists makers_mark_url text;

comment on column public.profiles.portfolio_quote is
  'One-sentence quote chosen by the teacher for the student portfolio summary page.';

comment on column public.profiles.makers_mark_url is
  'Public URL of the student makers mark image (4:3), stored in makers-marks bucket.';

alter table public.patents
  add column if not exists process_upload_url text;

comment on column public.patents.process_upload_url is
  'Optional process/work-in-progress photo URL (4:3), patent-uploads bucket.';

alter table public.skill_completions
  add column if not exists approved_at timestamptz;

comment on column public.skill_completions.approved_at is
  'Set when status becomes approved; used for portfolio quest ordering.';

update public.skill_completions
set approved_at = created_at
where status = 'approved' and approved_at is null;

create or replace function public.set_skill_completion_approved_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    new.approved_at := coalesce(new.approved_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists tr_skill_completion_approved_at on public.skill_completions;
create trigger tr_skill_completion_approved_at
  before update on public.skill_completions
  for each row
  execute function public.set_skill_completion_approved_at();

-- Public bucket for student makers marks (same path pattern as patent-uploads).
insert into storage.buckets (id, name, public, file_size_limit)
values ('makers-marks', 'makers-marks', true, 10485760)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

drop policy if exists "Students upload own makers mark" on storage.objects;
create policy "Students upload own makers mark"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'makers-marks'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "Students update own makers mark" on storage.objects;
create policy "Students update own makers mark"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'makers-marks'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "Students delete own makers mark" on storage.objects;
create policy "Students delete own makers mark"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'makers-marks'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "Public read makers marks" on storage.objects;
create policy "Public read makers marks"
  on storage.objects for select to public
  using (bucket_id = 'makers-marks');
