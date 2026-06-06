-- Silicon Covenant quest tree seed (slug upsert). Gating deferred. Path B placeholder step.
-- Patent additions (Stated Behavior, code snapshot) deferred — no tile-specific field mechanism yet.

insert into public.tiles (
  guild,
  skill_name,
  slug,
  sort_order,
  quest_kind,
  is_core,
  wp_value,
  gold_value,
  level4_eligible,
  tile_description,
  recipient_guidance,
  chips,
  steps
)
values
  (
    'Silicon Covenant',
    'SIGNAL',
    'silicon-01-signal',
    1,
    'required',
    true,
    10,
    3,
    false,
    'Make a device that does one thing — output only, no sensing. Make it speak. Breadboard is fine. A rough enclosure is fine.',
    'A named person in your life. Immediate gift.',
    $chips$[
      {"label": "micro:bit", "kind": "platform"},
      {"label": "breadboard OK", "kind": "technique"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Build it, test the loop, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb
  ),
  (
    'Silicon Covenant',
    'LISTENER',
    'silicon-02-listener',
    2,
    'required',
    true,
    10,
    3,
    false,
    'Make a device that responds to one input. Sensor in, output out — one loop. Make it listen. Breadboard still fine.',
    'A named person — same as Signal or someone new.',
    $chips$[
      {"label": "micro:bit", "kind": "platform"},
      {"label": "breadboard OK", "kind": "technique"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Build it, test the loop, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb
  ),
  (
    'Silicon Covenant',
    'HONEST MACHINE · the gate',
    'silicon-03-honest-machine',
    3,
    'required',
    true,
    10,
    3,
    false,
    'A sensor-driven device whose behavior you state in one sentence BEFORE the demo — ''This device will [do X] when [condition Y].'' The gate is whether the device matches the statement. Soldered. Permanent. This is where the machine does what you told it, not what you meant.',
    'A named person. This is the off-ramp tile — if you can''t close the loop between intention and behavior, that''s an honest thing to learn here.',
    $chips$[
      {"label": "micro:bit", "kind": "platform"},
      {"label": "soldered", "kind": "technique"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Build it, test the loop, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb
  ),
  (
    'Silicon Covenant',
    'WHEN AND',
    'silicon-04-when-and',
    4,
    'stretch',
    false,
    6,
    13,
    false,
    'A device that acts on combined conditions — two sensors, or sensor + timer, or sensor + state. The logic gets deeper, not the hardware.',
    'A named person — the combined conditions serve them specifically.',
    $chips$[
      {"label": "micro:bit", "kind": "platform"},
      {"label": "soldered", "kind": "technique"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Build it, test the loop, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb
  ),
  (
    'Silicon Covenant',
    'UNDER THE SURFACE',
    'silicon-05-under-the-surface',
    5,
    'stretch',
    false,
    6,
    13,
    false,
    'Rebuild a prior project with deliberate improvement. Name what got better and why. Craft depth, not new scope.',
    'Same recipient as the original project.',
    $chips$[
      {"label": "micro:bit", "kind": "platform"},
      {"label": "soldered", "kind": "technique"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Build it, test the loop, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb
  ),
  (
    'Silicon Covenant',
    'COMMISSION',
    'silicon-gate-commission',
    6,
    'tier2',
    false,
    10,
    22,
    false,
    'A device with an external sensor or response (beyond the base platform), for someone outside your pre-loaded circle who can say no. At least one rejected draft. Component choice must serve the recipient, not demonstrate the component.',
    'Found by you — someone outside your immediate circle who can decline your design.',
    $chips$[
      {"label": "micro:bit", "kind": "platform"},
      {"label": "Arduino unlocked", "kind": "platform"},
      {"label": "soldered", "kind": "technique"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Build it, test the loop, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb
  ),
  (
    'Silicon Covenant',
    'FIELD WORK',
    'silicon-gate-field-work',
    7,
    'tier2',
    false,
    10,
    22,
    false,
    'A device with an external sensor or response, where the need was learned from real contact with a community member or organization. Component choice serves the recipient, not the demo.',
    'A community member or organization — the need comes from real contact, not assumption.',
    $chips$[
      {"label": "micro:bit", "kind": "platform"},
      {"label": "Arduino unlocked", "kind": "platform"},
      {"label": "soldered", "kind": "technique"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Build it, test the loop, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb
  ),
  (
    'Silicon Covenant',
    'YOUR CALL',
    'silicon-boss',
    8,
    'boss',
    false,
    15,
    35,
    false,
    'Student-proposed. Name the thing, name the recipient, name a partner if you want one. 90-second conversation, no written proposal. Silicon addition: name the hardest part and show you''ve touched it before full approval — electronics ambition isn''t legible from a description alone. It runs. Patent sheet is the only artifact.',
    'Your choice — but it must be a named recipient.',
    $chips$[
      {"label": "any platform welcome", "kind": "platform"},
      {"label": "Arduino welcome", "kind": "platform"}
    ]$chips$::jsonb,
    $steps$[
      {"description": "Build it, test the loop, document your iterations, and file your patent.", "requiresApproval": false}
    ]$steps$::jsonb
  )
on conflict (slug) do update set
  guild = excluded.guild,
  skill_name = excluded.skill_name,
  sort_order = excluded.sort_order,
  quest_kind = excluded.quest_kind,
  is_core = excluded.is_core,
  wp_value = excluded.wp_value,
  gold_value = excluded.gold_value,
  level4_eligible = excluded.level4_eligible,
  tile_description = excluded.tile_description,
  recipient_guidance = excluded.recipient_guidance,
  chips = excluded.chips,
  steps = excluded.steps;
