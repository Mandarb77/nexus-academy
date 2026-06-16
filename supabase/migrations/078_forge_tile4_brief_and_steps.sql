-- Forge Tile 4 · the thing that moves: quest brief + eight checklist steps.

update public.tiles
set
  tile_description = $desc$You've already solved fit. Now solve motion.

Design something with a hinge, a rotation, an articulation, a snap — some part of it has to move, and the movement has to mean something for the person it's for. A drawer that slides smooth for someone who's tired of fighting their desk. A pet tag that swings so the engraving always faces out. A sign that spins because they like watching things spin.

The trap here is building motion to show off the technique. Don't. The motion exists because it serves them — if you can't say why the movement matters to this specific person, it's a gimmick, not a gift.$desc$,
  steps = $steps$[
    {"description": "Name the person and the motion their object needs — write it in your journal before opening any software.", "requiresApproval": false},
    {"description": "Sketch how the moving parts connect. Where's the pivot, the hinge, the rail?", "requiresApproval": false},
    {"description": "Model the moving parts in TinkerCAD with enough clearance to actually move — too tight and it binds, too loose and it wobbles.", "requiresApproval": false},
    {"description": "Print a quick test of just the moving joint before printing the whole object.", "requiresApproval": false},
    {"description": "Test the motion. Smooth? Catches? Too loose?", "requiresApproval": false},
    {"description": "Adjust clearance and reprint the joint if needed.", "requiresApproval": false},
    {"description": "Print the full object once the motion works.", "requiresApproval": false},
    {"description": "Photograph the finished piece in motion, with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'forge-04-thing-that-moves';
