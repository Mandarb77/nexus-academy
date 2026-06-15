-- Folded Path Tile 3 · The Thing That Moves · the gate: replace placeholder checklist with seven steps.

update public.tiles
set steps = $steps$[
  {"description": "Decide what your mechanism does — folds, stands, opens, or closes — before opening any software.", "requiresApproval": false},
  {"description": "Sketch the mechanism on paper. Trace the fold or movement with your finger. If it doesn't work on paper it won't work in Cricut.", "requiresApproval": false},
  {"description": "Set your score lines in Cricut Design Space. Score is structural here — place it where the fold needs to happen.", "requiresApproval": false},
  {"description": "Do a test cut on scrap material. Fold it. Does the mechanism work?", "requiresApproval": false},
  {"description": "Iterate until the mechanism works reliably, not just once.", "requiresApproval": false},
  {"description": "Cut your final piece in your chosen material.", "requiresApproval": false},
  {"description": "Photograph the finished piece with the person it's for — open and closed if it moves.", "requiresApproval": false}
]$steps$::jsonb
where slug = 'folded-03-thing-that-moves';
