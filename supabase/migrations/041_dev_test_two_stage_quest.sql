-- Dev-only test quest: two teacher-gated steps before final skill completion (see DevTestTwoStageQuestContent).
-- 1) Allow patents.stage = test_step1 for Step 1 pending review (Step 2 uses stage = packet as usual).
-- 2) Insert fixed-id tile so the app can reference it in local dev (wp/gold = 1 each).

alter table public.patents drop constraint if exists patents_stage_check;

alter table public.patents
  add constraint patents_stage_check
  check (stage in ('plan', 'packet', 'test_step1'));

insert into public.tiles (id, guild, skill_name, wp_value, gold_value)
values (
  'f0000001-0001-4001-8001-000000000001'::uuid,
  'Forge',
  'Test Quest — Two Stage',
  1,
  1
)
on conflict (guild, skill_name) do update
  set wp_value = excluded.wp_value,
      gold_value = excluded.gold_value;
