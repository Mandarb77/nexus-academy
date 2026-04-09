-- Patent quests: credit WP/gold only when the linked patent is in `packet` stage
-- (final submission). Plan and checklist teacher steps only touch `patents` and must
-- not trigger profile awards via `skill_completions`.

create or replace function public.set_awards_on_skill_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wp integer;
  v_gold integer;
begin
  if tg_op = 'UPDATE'
     and new.status = 'approved'
     and old.status is distinct from 'approved' then

    if new.patent_id is not null then
      if not exists (
        select 1
        from public.patents p
        where p.id = new.patent_id
          and lower(trim(coalesce(p.stage, ''))) = 'packet'
      ) then
        new.wp_awarded := null;
        new.gold_awarded := null;
        return new;
      end if;
    end if;

    if new.wp_awarded is null then
      select coalesce(t.wp_value, 0) into v_wp
      from public.tiles t
      where t.id = new.tile_id;
      new.wp_awarded := coalesce(v_wp, 0);
    end if;
    if new.gold_awarded is null then
      select coalesce(t.gold_value, 10) into v_gold
      from public.tiles t
      where t.id = new.tile_id;
      new.gold_awarded := coalesce(v_gold, 10);
    end if;
  end if;
  return new;
end;
$$;

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
     and new.wp_awarded is not null
     and new.gold_awarded is not null
  then
    update public.profiles
       set wp   = wp   + coalesce(new.wp_awarded, 0),
           gold = gold + coalesce(new.gold_awarded, 0)
     where id = new.student_id;
  end if;
  return new;
end;
$$;
