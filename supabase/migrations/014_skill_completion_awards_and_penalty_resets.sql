-- Record exact WP/gold awarded per completion at approval time,
-- and provide a teacher-only penalty reset RPC that deducts those recorded amounts.

alter table public.skill_completions
  add column if not exists wp_awarded integer,
  add column if not exists gold_awarded integer;

-- Populate awarded amounts at the moment a completion is approved.
create or replace function public.set_awards_on_skill_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wp integer;
begin
  if tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'approved' then
    if new.wp_awarded is null then
      select t.wp_value into v_wp from public.tiles t where t.id = new.tile_id;
      new.wp_awarded := coalesce(v_wp, 0);
    end if;
    if new.gold_awarded is null then
      new.gold_awarded := 10;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_set_awards_on_skill_approval on public.skill_completions;
create trigger tr_set_awards_on_skill_approval
  before update of status on public.skill_completions
  for each row
  when (old.status is distinct from new.status)
  execute function public.set_awards_on_skill_approval();

-- Award exactly what was recorded on the row.
create or replace function public.award_wp_on_skill_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'approved' then
    update public.profiles
    set
      wp = public.profiles.wp + coalesce(new.wp_awarded, 0),
      gold = public.profiles.gold + coalesce(new.gold_awarded, 0)
    where id = new.student_id;
  end if;
  return new;
end;
$$;

-- Ensure the existing trigger points at the updated function.
drop trigger if exists tr_award_wp_on_skill_approval on public.skill_completions;
create trigger tr_award_wp_on_skill_approval
  after update of status on public.skill_completions
  for each row
  when (old.status is distinct from new.status)
  execute function public.award_wp_on_skill_approval();

-- Teacher-only penalty reset: deduct (awarded + floor(awarded * penalty%)) and delete the completion.
create or replace function public.teacher_reset_skill_completion(p_completion_id uuid, p_penalty_percent integer default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_status text;
  v_wp_awarded integer;
  v_gold_awarded integer;
  v_pen integer := greatest(0, least(coalesce(p_penalty_percent, 0), 100));
  v_wp_pen integer;
  v_gold_pen integer;
  v_wp_total integer;
  v_gold_total integer;
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'not_teacher');
  end if;

  select sc.student_id, sc.status, sc.wp_awarded, sc.gold_awarded
    into v_student_id, v_status, v_wp_awarded, v_gold_awarded
  from public.skill_completions sc
  where sc.id = p_completion_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'not_approved');
  end if;

  if v_wp_awarded is null or v_gold_awarded is null then
    return jsonb_build_object('ok', false, 'error', 'missing_awarded_amounts');
  end if;

  v_wp_pen := floor((v_wp_awarded * v_pen) / 100.0);
  v_gold_pen := floor((v_gold_awarded * v_pen) / 100.0);
  v_wp_total := v_wp_awarded + v_wp_pen;
  v_gold_total := v_gold_awarded + v_gold_pen;

  update public.profiles
  set
    wp = greatest(0, public.profiles.wp - v_wp_total),
    gold = greatest(0, public.profiles.gold - v_gold_total)
  where id = v_student_id;

  delete from public.skill_completions where id = p_completion_id;

  return jsonb_build_object(
    'ok', true,
    'wp_awarded', v_wp_awarded,
    'gold_awarded', v_gold_awarded,
    'penalty_percent', v_pen,
    'wp_penalty', v_wp_pen,
    'gold_penalty', v_gold_pen,
    'wp_total_deducted', v_wp_total,
    'gold_total_deducted', v_gold_total
  );
end;
$$;

grant execute on function public.teacher_reset_skill_completion(uuid, integer) to authenticated;

