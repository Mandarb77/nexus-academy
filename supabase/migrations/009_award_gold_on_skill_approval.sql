-- On pending → approved: add that tile's wp_value to profile.wp (unchanged intent) and +10 gold.

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
    update public.profiles
    set
      wp = public.profiles.wp + coalesce(pts, 0),
      gold = public.profiles.gold + 10
    where id = new.student_id;
  end if;
  return new;
end;
$$;
