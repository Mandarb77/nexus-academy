-- Store checklist step progress in the database so it is tied to the student's
-- user id and tile id. This prevents stale local state after a teacher reset.
alter table public.patents
  add column if not exists checklist_state jsonb not null default '[]'::jsonb;
