-- Dev two-stage test quest (tile 30): Step 1 uses patents.stage = 'test_step1'.
-- Safe if 041 already applied; fixes projects where 041 was skipped or the constraint was recreated.

alter table public.patents drop constraint if exists patents_stage_check;

alter table public.patents
  add constraint patents_stage_check
  check (stage in ('plan', 'packet', 'test_step1'));
