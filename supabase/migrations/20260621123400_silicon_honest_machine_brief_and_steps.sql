-- Silicon Covenant HONEST MACHINE · the gate: quest brief + ten checklist steps.

update public.tiles
set
  tile_description = $desc$SIGNAL did one thing. LISTENER responded to the world. HONEST MACHINE is where you prove you meant it.

Before the demo, you write one sentence: "This device will [do X] when [condition Y]." That sentence is the standard. Not what you hoped it would do, not what it usually does — what it will do, stated in advance, in writing.

Then the teacher changes the condition. The device has to respond correctly.

This is the gate because intention is easy to claim after the fact. "I meant for it to do that" costs nothing. Writing it down before the demo costs something — it means you actually knew what you built, or you find out that you didn't.

Soldered. Permanent. The decision is made. This is the one you give away.$desc$,
  steps = $steps$[
    {"description": "Name the person and what the device will do for them — write it in your journal.", "requiresApproval": false},
    {"description": "Write your stated behavior sentence before the demo: \"This device will [do X] when [condition Y].\" Write it on a sticky note. This is the standard you'll be held to.", "requiresApproval": false},
    {"description": "Build the device. Sensor-driven, behavior matches your stated sentence.", "requiresApproval": false},
    {"description": "Test it yourself first — change the condition deliberately. Does it respond correctly every time, not just most of the time?", "requiresApproval": false},
    {"description": "Show Mr. Cook your stated behavior sentence before the demo begins.", "requiresApproval": false},
    {"description": "Demo: Mr. Cook changes the condition. The device responds — or it doesn't. If it doesn't, go back to step 3.", "requiresApproval": false},
    {"description": "When the device matches the statement reliably: solder it. The decision is permanent now.", "requiresApproval": false},
    {"description": "Transfer the stated behavior sentence to the Patent sheet.", "requiresApproval": false},
    {"description": "Give it to the person it's for.", "requiresApproval": false},
    {"description": "Photograph the finished device with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'silicon-03-honest-machine';
