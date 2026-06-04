-- WP / Gold scale on tiles + semester gold reset
--
-- SCHEMA FACTS (verified from migrations 003, 031, 037, 038):
--   • Tile payout columns: wp_value, gold_value (NOT wp_awarded on tiles).
--   • skill_completions.wp_awarded / gold_awarded are snapshots at approval time;
--     set_awards_on_skill_approval() copies from tiles.wp_value / tiles.gold_value.
--   • No tier / is_core / type columns existed before this migration.
--
-- DESIGN:
--   • quest_kind classifies each tile for bulk defaults; wp_value / gold_value remain
--     editable per row (Quest Builder + SQL) without code changes.
--   • WP → rank (never spent). Gold → shop. Required tiles: low gold on purpose.

-- ---------------------------------------------------------------------------
-- 1) Classification column(s)
-- ---------------------------------------------------------------------------

alter table public.tiles
  add column if not exists quest_kind text not null default 'required'
    check (quest_kind in ('required', 'stretch', 'tier2', 'boss')),
  add column if not exists is_core boolean not null default false;

comment on column public.tiles.quest_kind is
  'Payout band: required (T1 core), stretch (T1 optional), tier2, boss. wp_value/gold_value are authoritative for awards.';
comment on column public.tiles.is_core is
  'True for Tier 1 required core quests (quest_kind = required and flagged core).';

-- ---------------------------------------------------------------------------
-- 2) Classify seeded / known quests (adjust rows here before apply)
-- ---------------------------------------------------------------------------

-- Void Navigators
update public.tiles
set quest_kind = 'required', is_core = true
where guild = 'Void Navigators'
  and skill_name = 'Make a Profile-Cut Coaster for Someone';

update public.tiles
set quest_kind = 'stretch', is_core = false
where guild = 'Void Navigators'
  and skill_name = 'I Wanna Hold Your Hand';

-- Folded Path
update public.tiles
set quest_kind = 'stretch', is_core = false
where guild = 'Folded Path'
  and skill_name = 'Design Your Personal Sticker';

update public.tiles
set quest_kind = 'tier2', is_core = false
where guild = 'Folded Path'
  and skill_name = 'Design a T-Shirt for Someone In the Room';

-- Forge — capstone-style optional depth
update public.tiles
set quest_kind = 'stretch', is_core = false
where guild = 'Forge'
  and skill_name = 'Design Your Personal Game Piece';

-- Prism pop-up card (community depth quest)
update public.tiles
set quest_kind = 'tier2', is_core = false
where guild = 'Prism'
  and skill_name = 'Make a Pop-Up Card for Someone at Kents Hill';

-- All other seeded Forge / Prism intro skills → required core
update public.tiles
set quest_kind = 'required', is_core = true
where guild in ('Forge', 'Prism')
  and skill_name not in ('Design Your Personal Game Piece', 'Make a Pop-Up Card for Someone at Kents Hill');

-- Quest Builder / unknown tiles: default already 'required', is_core false.
-- After review, set is_core = true on additional required core rows if needed:
-- update public.tiles set is_core = true where quest_kind = 'required' and guild = 'Forge';

-- ---------------------------------------------------------------------------
-- 3) Apply scale to wp_value / gold_value from quest_kind
-- ---------------------------------------------------------------------------

update public.tiles
set
  wp_value = case quest_kind
    when 'required' then 10
    when 'stretch'  then 6
    when 'tier2'    then 10
    when 'boss'     then 15
  end,
  gold_value = case quest_kind
    when 'required' then 3
    when 'stretch'  then 13
    when 'tier2'    then 22
    when 'boss'     then 35
  end;

-- Optional: clear display overrides where numeric scale is now canonical
-- update public.tiles set wp_display = null, gold_display = null
-- where guild = 'Void Navigators' and skill_name = 'I Wanna Hold Your Hand';

-- ---------------------------------------------------------------------------
-- 4) Semester gold reset (teacher-triggered; WP unchanged)
-- ---------------------------------------------------------------------------

create or replace function public.preview_semester_gold_reset()
returns table (
  student_id uuid,
  display_name text,
  email text,
  gold_before integer,
  gold_after integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then
    raise exception 'Teacher only';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.email,
    p.gold,
    floor(p.gold * 0.5)::integer
  from public.profiles p
  where p.role = 'student'
  order by coalesce(p.display_name, p.email, p.id::text);
end;
$$;

create or replace function public.teacher_semester_gold_reset()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_teacher() then
    raise exception 'Teacher only';
  end if;

  update public.profiles
  set gold = floor(gold * 0.5)
  where role = 'student';

  get diagnostics v_count = row_count;

  return jsonb_build_object(
    'students_updated', v_count,
    'rule', 'gold = floor(gold * 0.5); wp unchanged'
  );
end;
$$;

grant execute on function public.preview_semester_gold_reset() to authenticated;
grant execute on function public.teacher_semester_gold_reset() to authenticated;
