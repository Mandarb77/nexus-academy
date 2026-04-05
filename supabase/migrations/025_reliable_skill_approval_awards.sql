-- Quest / skill approvals must always credit WP + gold. The previous triggers only
-- awarded on pending → approved and relied on BEFORE-assigned wp_awarded/gold_awarded
-- in the AFTER trigger. Broaden the transition (any non-approved → approved), derive
-- amounts with fallbacks from tiles + default gold, and backfill null award columns.

create or replace function public.set_awards_on_skill_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wp integer;
begin
  if tg_op = 'UPDATE'
     and new.status = 'approved'
     and old.status is distinct from 'approved' then
    if new.wp_awarded is null then
      select coalesce(t.wp_value, 0) into v_wp from public.tiles t where t.id = new.tile_id;
      new.wp_awarded := coalesce(v_wp, 0);
    end if;
    if new.gold_awarded is null then
      new.gold_awarded := 10;
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
declare
  v_wp integer;
  v_gold integer;
begin
  if tg_op = 'UPDATE'
     and new.status = 'approved'
     and old.status is distinct from 'approved' then
    select coalesce(t.wp_value, 0) into v_wp from public.tiles t where t.id = new.tile_id;
    v_wp := coalesce(new.wp_awarded, v_wp, 0);
    v_gold := coalesce(new.gold_awarded, 10);

    update public.profiles
    set
      wp = public.profiles.wp + v_wp,
      gold = public.profiles.gold + v_gold
    where id = new.student_id;

    update public.skill_completions sc
    set
      wp_awarded = coalesce(sc.wp_awarded, v_wp),
      gold_awarded = coalesce(sc.gold_awarded, v_gold)
    where sc.id = new.id
      and (sc.wp_awarded is null or sc.gold_awarded is null);
  end if;
  return new;
end;
$$;
