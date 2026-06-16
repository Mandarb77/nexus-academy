-- Forge Gate B · reverse engineer + replace: quest brief + nine checklist steps.

update public.tiles
set
  tile_description = $desc$Somewhere, something is broken. A drawer pull snapped off. A toy lost a wheel. A coffee maker's lid clip cracked and now it doesn't latch. The original part is gone, but the object it belonged to still needs it.

Find that thing. Not a stand-in, not something you're imagining — a real broken or missing part in a real person's life, in use, right now. Measure what's left. Study how it used to work. Model a replacement that does the same job the original did — same fit, same function, same stress it has to survive.

This is reverse engineering, not redesigning. You're not improving on the original — you're figuring out exactly what it was doing and rebuilding that. The test isn't "does it look like the part." The test is "does it work in context" — does the drawer pull again, does the toy roll again, does the lid latch again.

Best candidates are outside your immediate circle — a teacher's stapler, a neighbor's mailbox flag, something at Balsam House. The further from your own stuff, the more real the investigation.$desc$,
  steps = $steps$[
    {"description": "Find a real broken or missing part — write down who it belongs to and what it used to do, in your journal.", "requiresApproval": false},
    {"description": "Examine what's left of the original, or study how the object works without it.", "requiresApproval": false},
    {"description": "Measure everything that matters — dimensions, attachment points, load direction.", "requiresApproval": false},
    {"description": "Sketch the replacement before opening TinkerCAD.", "requiresApproval": false},
    {"description": "Model the replacement to match the original's function, not just its appearance.", "requiresApproval": false},
    {"description": "Print a test version if you're unsure about fit or strength.", "requiresApproval": false},
    {"description": "Install the part in its actual context. Does it work the way the original did?", "requiresApproval": false},
    {"description": "If it fails under real use, note what broke and redesign.", "requiresApproval": false},
    {"description": "Photograph the finished part installed and working, with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'forge-gate-b-reverse-engineer';
