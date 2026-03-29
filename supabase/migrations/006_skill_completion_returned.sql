-- Allow teachers to return submissions; students can resubmit (pending again) on the same row.

alter table public.skill_completions
  drop constraint if exists skill_completions_status_check;

alter table public.skill_completions
  add constraint skill_completions_status_check
  check (status in ('pending', 'approved', 'returned'));

drop policy if exists "Students update returned to pending" on public.skill_completions;
create policy "Students update returned to pending"
  on public.skill_completions for update
  using (auth.uid() = student_id and status = 'returned')
  with check (auth.uid() = student_id and status = 'pending');
