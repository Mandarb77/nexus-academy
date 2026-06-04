-- Tile quest metadata + optional patent "Who taught you?"
-- Safe to apply on prod (additive columns).

alter table public.tiles
  add column if not exists tile_description text,
  add column if not exists recipient_guidance text,
  add column if not exists level4_eligible boolean not null default false,
  add column if not exists ledger_resources jsonb;

comment on column public.tiles.tile_description is
  'Student-facing quest brief on skill tree and patent plan panel.';
comment on column public.tiles.recipient_guidance is
  'Student-facing hint on patent plan panel (per-tile, teacher-authored).';
comment on column public.tiles.level4_eligible is
  'When true, quest can satisfy the level-4 A gate; independent of is_core and payouts.';
comment on column public.tiles.ledger_resources is
  'Optional [{label, url}] resource buttons on patent checklist (in addition to step resourceUrl).';

alter table public.patents
  add column if not exists field_6 text;

comment on column public.patents.field_6 is
  'Optional: Who taught you? (Record panel, student-authored).';
