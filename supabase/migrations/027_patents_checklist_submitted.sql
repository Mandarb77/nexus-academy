-- Gate "final patent questions" behind an explicit checklist submission from the student.

alter table public.patents
  add column if not exists checklist_submitted boolean not null default false;

comment on column public.patents.checklist_submitted is
  'True after the student submits the checklist step; unlocks final patent questions in the app.';
