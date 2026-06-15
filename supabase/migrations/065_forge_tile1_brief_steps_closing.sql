-- Forge Tile 1 · the mark's home: quest brief + seven checklist steps (replaces placeholder step).

update public.tiles
set
  tile_description = $desc$Your Maker's Mark is the signature that goes on everything you make here. This is the tool that lets you use it.

Design a holder that fits your stamp (1.25" diameter × 0.2" deep recess) and feels right in your hand — something you'd actually reach for, not something you'd leave in a drawer. The holder is how you sign your work. Make it worth picking up.

The outer shape, the weight, the feel, the form — all yours. The only constraint is the recess that holds the stamp and the hand that holds the holder.

One thought worth sitting with: if you design the recess so the stamp sits flush and reversible, you get two marks for free — the stamp face for pressing into soft material, and the back of the stamp resting in the recess for embossing. A positive and a negative. Both are your mark. Whether you build for that or not is your call.

Make it represent you. Make it special. A tube that fits is not enough.$desc$,
  steps = $steps$[
    {"description": "Measure your Maker's Mark stamp (1.25\" diameter × 0.2\" depth).", "requiresApproval": false},
    {"description": "Sketch the outer shape of the holder before opening TinkerCAD — think about how it will feel in your hand.", "requiresApproval": false},
    {"description": "Model the holder in TinkerCAD with the recess sized to your stamp.", "requiresApproval": false},
    {"description": "Confirm dimensions — max 3\" diameter × 4\" tall.", "requiresApproval": false},
    {"description": "Show the teacher your design before printing.", "requiresApproval": false},
    {"description": "Print. If it fails, note what changed and try again.", "requiresApproval": false},
    {"description": "Photograph the finished holder with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'forge-01-marks-home';
