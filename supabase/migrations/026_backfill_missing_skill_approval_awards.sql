-- One-time backfill for skill_completions that reached status = 'approved' but never
-- credited the student (wp_awarded and gold_awarded both null under the old triggers).
-- Idempotent: only touches rows that still have both award columns null.

with broken as (
  select
    sc.student_id,
    coalesce(t.wp_value, 0) as row_wp,
    10 as row_gold
  from public.skill_completions sc
  join public.tiles t on t.id = sc.tile_id
  where sc.status = 'approved'
    and sc.wp_awarded is null
    and sc.gold_awarded is null
),
totals as (
  select student_id, sum(row_wp) as add_wp, sum(row_gold) as add_gold
  from broken
  group by student_id
)
update public.profiles p
set
  wp = p.wp + t.add_wp,
  gold = p.gold + t.add_gold
from totals t
where p.id = t.student_id;

update public.skill_completions sc
set
  wp_awarded = coalesce(t.wp_value, 0),
  gold_awarded = 10
from public.tiles t
where sc.tile_id = t.id
  and sc.status = 'approved'
  and sc.wp_awarded is null
  and sc.gold_awarded is null;
