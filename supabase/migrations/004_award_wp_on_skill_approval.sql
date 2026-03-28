-- When a teacher sets status from pending → approved, add the tile's wp_value to the student's profile.wp.

create or replace function public.award_wp_on_skill_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pts integer;
begin
  if tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'approved' then
    select t.wp_value into pts from public.tiles t where t.id = new.tile_id;
    if pts is not null then
      update public.profiles
      set wp = public.profiles.wp + pts
      where id = new.student_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_award_wp_on_skill_approval on public.skill_completions;
create trigger tr_award_wp_on_skill_approval
  after update of status on public.skill_completions
  for each row
  when (old.status is distinct from new.status)
  execute function public.award_wp_on_skill_approval();

-- Optional: live WP updates on the student home screen (enable Realtime for table public.profiles in Dashboard).
