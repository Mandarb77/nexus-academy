-- 1) Remove duplicate WP/gold award triggers. Migration 029 added set_awards_before_skill_approval /
-- award_wp_after_skill_approval but did not drop legacy names from 004 / 014 (tr_award_wp_on_skill_approval,
-- tr_set_awards_on_skill_approval). Two AFTER triggers on the same transition doubled profile credits.
--
-- 2) Always set wp_awarded / gold_awarded from public.tiles (wp_value, gold_value) on approval — never
-- from the client — so payouts match the skill tree. Pop-up +5 gold checkbox removed from the app;
-- change the tile's gold_value if a quest should award more.

drop trigger if exists tr_set_awards_on_skill_approval on public.skill_completions;
drop trigger if exists tr_award_wp_on_skill_approval on public.skill_completions;
drop trigger if exists set_awards_before_skill_approval on public.skill_completions;
drop trigger if exists award_wp_after_skill_approval on public.skill_completions;
drop trigger if exists award_wp_on_skill_approval_trigger on public.skill_completions;
drop trigger if exists set_awards_on_skill_approval_trigger on public.skill_completions;
drop trigger if exists award_wp_trigger on public.skill_completions;

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

    select coalesce(t.wp_value, 0), coalesce(t.gold_value, 10)
      into v_wp, v_gold
    from public.tiles t
    where t.id = new.tile_id;

    new.wp_awarded := coalesce(v_wp, 0);
    new.gold_awarded := coalesce(v_gold, 10);
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

create trigger set_awards_before_skill_approval
  before update on public.skill_completions
  for each row execute function public.set_awards_on_skill_approval();

create trigger award_wp_after_skill_approval
  after update on public.skill_completions
  for each row execute function public.award_wp_on_skill_approval();
