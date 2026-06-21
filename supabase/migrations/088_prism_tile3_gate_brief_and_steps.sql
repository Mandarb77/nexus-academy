-- Prism Tile 3 · Layers of Meaning · the gate: quest brief + nine checklist steps.

update public.tiles
set
  tile_description = $desc$One name. One story object. You've made things that stand alone. This one can't.

Design something built from multiple pieces — layered, stacked, assembled — where no single piece means anything by itself. Pull one piece out and the whole thing should fall apart, not just look less finished. The meaning lives in how the pieces relate, not in any one of them.

This is the gate because the laser punishes bad planning here in a way it hasn't yet. Every layer has to register against the others — line up, align, sit exactly where the layer before it expects. Design the whole stack before you cut anything. A kid who cuts layer one and figures out layer two later is going to be recutting layer one.$desc$,
  steps = $steps$[
    {"description": "Name the person and what the finished piece will mean to them — write it in your journal.", "requiresApproval": false},
    {"description": "Decide how many layers or pieces you need, and what each one contributes that the others don't.", "requiresApproval": false},
    {"description": "Design the full stack in Cuttle.xyz before cutting anything — every layer in relation to every other layer.", "requiresApproval": false},
    {"description": "Mark or design registration points so layers align consistently when assembled.", "requiresApproval": false},
    {"description": "Test cut on scrap material — does the alignment actually work?", "requiresApproval": false},
    {"description": "Adjust your registration if layers don't sit where you intended.", "requiresApproval": false},
    {"description": "Cut your final layers.", "requiresApproval": false},
    {"description": "Assemble. Confirm: does removing any one piece break the meaning, not just the look?", "requiresApproval": false},
    {"description": "Photograph the finished, assembled piece with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'prism-03-layers-of-meaning';
