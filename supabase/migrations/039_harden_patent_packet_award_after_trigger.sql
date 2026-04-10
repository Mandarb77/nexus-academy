-- Reinforce WP/gold grants: the AFTER trigger must never credit profiles for patent-linked
-- completions unless the linked patent row is in `packet` stage (final submission), even if a
-- stray BEFORE trigger or manual update incorrectly set wp_awarded / gold_awarded.

create or replace function public.award_wp_on_skill_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.status = 'approved'
     and old.status is distinct from 'approved'
  then
    if new.patent_id is not null then
      if not exists (
        select 1
        from public.patents p
        where p.id = new.patent_id
          and lower(trim(coalesce(p.stage, ''))) = 'packet'
      ) then
        return new;
      end if;
    end if;

    if new.wp_awarded is not null
       and new.gold_awarded is not null
    then
      update public.profiles
         set wp   = wp   + coalesce(new.wp_awarded, 0),
             gold = gold + coalesce(new.gold_awarded, 0)
       where id = new.student_id;
    end if;
  end if;
  return new;
end;
$$;
