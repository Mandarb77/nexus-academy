-- Void Navigators Tier 1 required #2 — "I Wanna Hold Your Hand" holder quest
-- Adds nullable wp_display / gold_display text columns (null = use numeric value as before).
-- Safe to apply even if 039 was never run; uses add column if not exists.

alter table public.tiles
  add column if not exists wp_display text,
  add column if not exists gold_display text;

insert into public.tiles (guild, skill_name, wp_value, gold_value, wp_display, gold_display, steps, checklist_footer_note)
values (
  'Void Navigators',
  'I Wanna Hold Your Hand',
  0,
  0,
  'WPT',
  'GDP',
  $steps$[
    {
      "description": "Step 1 — Choose the person and the object. Pick someone you know and the specific object you are making a holder for (hairbrush, dice tray, keys, etc.). Write the person's name and the object name before touching any tools.",
      "requiresApproval": false
    },
    {
      "description": "Step 2 — Measure the object. Using the appropriate measuring tool (ruler, calipers, or tape measure), record all critical dimensions in millimetres: length, width, and any depth or clearance you need to account for.",
      "requiresApproval": false
    },
    {
      "description": "Step 3 — Cut a prototype and test the fit. Build a rough version from scrap or cardboard first. Test that the object actually sits in or on the holder as intended, and note any adjustments needed before cutting final material.",
      "requiresApproval": false
    },
    {
      "description": "Step 4 — Choose and apply the appropriate finishing material. Select a finish that suits both the material and the recipient (sand, paint, stain, or leave raw). Apply it and document your choice in your plan packet.",
      "requiresApproval": false
    }
  ]$steps$::jsonb,
  'Tier 1 — Required. The second of three required Void quests.'
)
on conflict (guild, skill_name) do update set
  wp_display            = excluded.wp_display,
  gold_display          = excluded.gold_display,
  steps                 = excluded.steps,
  checklist_footer_note = excluded.checklist_footer_note;
