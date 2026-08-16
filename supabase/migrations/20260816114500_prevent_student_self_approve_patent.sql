-- Students may edit their own patent rows, but they must not flip status to approved.
-- Teacher Return → student Resubmit must land in pending for staff review.

create or replace function public.prevent_student_self_approve_patent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    if auth.uid() is not null
       and auth.uid() = new.student_id
       and not public.is_teacher() then
      raise exception 'Students cannot approve a patent';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_prevent_student_self_approve_patent on public.patents;
create trigger tr_prevent_student_self_approve_patent
  before update of status on public.patents
  for each row
  execute function public.prevent_student_self_approve_patent();
