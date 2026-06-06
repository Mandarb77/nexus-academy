-- Quest unlock: tile stays locked until all listed prerequisite slugs are teacher-approved.

alter table public.tiles
  add column if not exists unlock_after_slugs text[] not null default '{}';

comment on column public.tiles.unlock_after_slugs is
  'Prerequisite tile slugs; student must have approved skill_completions on all before opening this quest.';

-- Forge guild (Tier 1 gate = tile 3; Tier 2 gates parallel; boss needs both Tier 2)
update public.tiles set unlock_after_slugs = '{}' where slug = 'forge-01-marks-home';
update public.tiles set unlock_after_slugs = '{forge-01-marks-home}' where slug = 'forge-02-fits-a-thing';
update public.tiles set unlock_after_slugs = '{forge-02-fits-a-thing}' where slug = 'forge-03-two-parts-gate';
update public.tiles set unlock_after_slugs = '{forge-03-two-parts-gate}' where slug = 'forge-04-thing-that-moves';
update public.tiles set unlock_after_slugs = '{forge-04-thing-that-moves}' where slug = 'forge-05-borrowed-changed';
update public.tiles set unlock_after_slugs = '{forge-03-two-parts-gate}' where slug = 'forge-gate-a-cross-guild';
update public.tiles set unlock_after_slugs = '{forge-03-two-parts-gate}' where slug = 'forge-gate-b-reverse-engineer';
update public.tiles set unlock_after_slugs = '{forge-gate-a-cross-guild,forge-gate-b-reverse-engineer}' where slug = 'forge-boss';

-- Silicon Covenant (same shape)
update public.tiles set unlock_after_slugs = '{}' where slug = 'silicon-01-signal';
update public.tiles set unlock_after_slugs = '{silicon-01-signal}' where slug = 'silicon-02-listener';
update public.tiles set unlock_after_slugs = '{silicon-02-listener}' where slug = 'silicon-03-honest-machine';
update public.tiles set unlock_after_slugs = '{silicon-03-honest-machine}' where slug = 'silicon-04-when-and';
update public.tiles set unlock_after_slugs = '{silicon-04-when-and}' where slug = 'silicon-05-under-the-surface';
update public.tiles set unlock_after_slugs = '{silicon-03-honest-machine}' where slug = 'silicon-gate-commission';
update public.tiles set unlock_after_slugs = '{silicon-03-honest-machine}' where slug = 'silicon-gate-field-work';
update public.tiles set unlock_after_slugs = '{silicon-gate-commission,silicon-gate-field-work}' where slug = 'silicon-boss';
