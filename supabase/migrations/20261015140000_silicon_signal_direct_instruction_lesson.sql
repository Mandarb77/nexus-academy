-- SIGNAL (silicon-01-signal): teacher-led MakeCode lesson.
-- Keep name/slug. Drop recipient / enclosure language. Lesson pages live in app code.

update public.tiles
set
  tile_description = $desc$Your first micro:bit program. Write code that makes the screen change when you shake it and makes buttons A and B play two different sounds. Your teacher walks you through it.$desc$,
  recipient_guidance = null,
  chips = $chips$[{"label": "micro:bit", "kind": "platform"}]$chips$::jsonb,
  steps = '[]'::jsonb,
  record_prompts = null,
  checklist_footer_note = null
where slug = 'silicon-01-signal';
