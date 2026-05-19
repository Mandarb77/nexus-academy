-- Void Navigators Tier 1 required #1 — profile-cut coaster (prototype seed)
-- UI copy: src/lib/voidTile1Proto.ts | Handoff + challenges: docs/void-tile1-prototype.md
-- Safe to paste in SQL Editor even if migrations 031/034 were never applied.

alter table public.tiles
  add column if not exists gold_value integer not null default 10,
  add column if not exists steps jsonb;

alter table public.tiles
  add column if not exists checklist_footer_note text;

insert into public.tiles (guild, skill_name, wp_value, gold_value, steps, checklist_footer_note)
values (
  'Void Navigators',
  'Make a Profile-Cut Coaster for Someone',
  25,
  15,
  $steps$[
    {
      "description": "Step 1 — Name your recipient and capture specifics. Before any software, write who you are making this for (person or pet) and at least two details that will shape the profile design — a hobby, a posture, something only you noticed. These notes belong in your plan packet.",
      "requiresApproval": false
    },
    {
      "description": "Step 2 — Sketch the profile and your maker's mark on paper. Your gift is a flat-profile piece: one clear silhouette or symbol from the side, plus a small maker's mark that shows you made it. Get a quick teacher check before you build the CAM file.",
      "requiresApproval": false
    },
    {
      "description": "Step 3 — Choose one material. Pick a single stock for this quest (hardwood, plywood, or shop-approved acrylic). Write which material you are using and why it fits your recipient — one material only for this prototype.",
      "requiresApproval": false
    },
    {
      "description": "Step 4 — Build your CAM file for a profile cut. Vector profile for the coaster footprint, include your maker's mark in the file, and set cut/score for your one material. Keep it coaster-sized — a flat gift, not a sculpture.",
      "requiresApproval": false
    },
    {
      "description": "Step 5 — Test on scrap. Run a test profile cut on scrap of the same material. Check that the silhouette reads, the mark is legible, and edges are safe. Do not skip this step.",
      "requiresApproval": false
    },
    {
      "description": "Step 6 — Cut the final coaster. Run your approved file on the real stock. Sand or finish only as allowed for that material in the shop.",
      "requiresApproval": false
    },
    {
      "description": "Step 7 — Deliver it. Give the coaster to your recipient in person when you can. Take a photo of them with the gift (or holding it) for your patent packet.",
      "requiresApproval": false
    },
    {
      "description": "Step 8 — Upload your delivery photo. Attach the delivery photo to your patent packet. Final submit stays locked until the photo is uploaded.",
      "requiresApproval": false
    }
  ]$steps$::jsonb,
  'Tier 1 — Required (prototype). This is the first of three required Void quests. Stretch and later tiers stay locked until the full guild ships.'
)
on conflict (guild, skill_name) do update set
  wp_value = excluded.wp_value,
  gold_value = excluded.gold_value,
  steps = excluded.steps,
  checklist_footer_note = excluded.checklist_footer_note;
