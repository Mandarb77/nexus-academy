-- Forge Tile 3 · two parts, one fit · the gate: quest brief + eight checklist steps.

update public.tiles
set
  tile_description = $desc$Two pieces. One fit. This is where Forge stops being forgiving.

A coaster doesn't care if your tolerance is off by half a millimeter. A lid does. Design two parts that have to mate — a box and its lid, a cap and its base, a pin and its slot, a press fit that snaps and holds. Print them. They probably won't fit the first time. That's not failure, that's the gate doing its job.

Iterate until the fit is intentional — not "it sort of goes together if you push hard enough," but the fit you designed for, on purpose, repeatable.$desc$,
  steps = $steps$[
    {"description": "Decide what your two parts are and who the finished pair is for — write it in your journal.", "requiresApproval": false},
    {"description": "Sketch both parts together on paper, showing where they meet.", "requiresApproval": false},
    {"description": "Model both pieces in TinkerCAD in the same file, so the fit is designed relative to itself, not guessed at separately.", "requiresApproval": false},
    {"description": "Choose a tolerance gap between the mating surfaces — research typical 3D print tolerances if you're not sure where to start.", "requiresApproval": false},
    {"description": "Print both pieces. Test the fit.", "requiresApproval": false},
    {"description": "If it's too tight, too loose, or doesn't mate at all — adjust the tolerance and reprint. This is expected. Document what you changed.", "requiresApproval": false},
    {"description": "Confirm the fit is intentional: it works the same way every time, not by luck.", "requiresApproval": false},
    {"description": "Photograph the finished mated pieces with the person they're for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'forge-03-two-parts-gate';
