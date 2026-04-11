-- Dev-only test quest: two teacher-gated steps before final skill completion (see DevTestTwoStageQuestContent).
-- 1) Allow patents.stage = test_step1 for Step 1 pending review (Step 2 uses stage = packet as usual).
-- 2) Insert test tile (wp/gold = 1 each). The app matches this quest by tiles.id === '30'
--    (see DEV_TEST_TWO_STAGE_TILE_ID). If your DB uses UUID ids, set that constant to your row’s
--    UUID string or assign a tile id your API returns as "30".

alter table public.patents drop constraint if exists patents_stage_check;

alter table public.patents
  add constraint patents_stage_check
  check (stage in ('plan', 'packet', 'test_step1'));

insert into public.tiles (guild, skill_name, wp_value, gold_value)
values ('Forge', 'Test Quest — Two Stage', 1, 1)
on conflict (guild, skill_name) do update
  set wp_value = excluded.wp_value,
      gold_value = excluded.gold_value;
