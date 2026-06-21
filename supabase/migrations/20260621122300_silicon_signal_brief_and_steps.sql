-- Silicon Covenant SIGNAL: quest brief + seven checklist steps.

update public.tiles
set
  tile_description = $desc$Most tools in this workshop push back immediately. Wood resists the blade. Plastic warps under heat. You feel it in your hands.

A micro:bit doesn't push back. You write code, you upload it, and the device does exactly what you told it to do — not what you meant, not what you intended, exactly what you wrote. If it does the wrong thing, that's information. You told it the wrong thing.

SIGNAL is the simplest version of this: one device, one output, no sensing. Make it do one thing for one person. A light that blinks in a pattern. A sound that plays when it powers on. A display that shows a message. The output is yours to choose — the person receiving it is not optional.

Breadboard is fine. A rough enclosure is fine. This is about writing code that does what you meant it to do, not about making it look finished yet.$desc$,
  steps = $steps$[
    {"description": "Name the person and what you want the device to do for them — write it in your journal before opening MakeCode.", "requiresApproval": false},
    {"description": "Open MakeCode and build the simplest possible version of your idea — one output, nothing else.", "requiresApproval": false},
    {"description": "Upload to the micro:bit. Does it do what you wrote, or what you meant?", "requiresApproval": false},
    {"description": "If it's wrong, read your code before changing anything. Find where the gap is between what you wrote and what you wanted.", "requiresApproval": false},
    {"description": "Fix it. Upload again. Repeat until the device does exactly what you intended.", "requiresApproval": false},
    {"description": "Give it to the person it's for. Rough enclosure is fine — the behavior is what matters at this stage.", "requiresApproval": false},
    {"description": "Photograph the finished device with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'silicon-01-signal';
