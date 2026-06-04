-- Verify every in-progress patent checklist_state array aligns with tiles.steps length.
-- Expect zero rows. Run after 047_backfill_tile_content_from_code.sql.

select
  p.id as patent_id,
  p.student_id,
  t.guild,
  t.skill_name,
  jsonb_array_length(p.checklist_state) as checklist_len,
  case
    when t.steps is null then null
    when jsonb_typeof(t.steps) = 'array' then jsonb_array_length(t.steps)
    else null
  end as steps_len
from public.patents p
join public.tiles t on t.id = p.tile_id
where jsonb_typeof(p.checklist_state) = 'array'
  and jsonb_array_length(p.checklist_state) > 0
  and (
    t.steps is null
    or jsonb_typeof(t.steps) <> 'array'
    or jsonb_array_length(t.steps) <> jsonb_array_length(p.checklist_state)
  )
order by t.guild, t.skill_name, p.created_at;
