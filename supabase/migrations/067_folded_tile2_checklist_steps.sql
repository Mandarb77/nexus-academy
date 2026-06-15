-- Folded Path Tile 2 · Made for Someone: replace placeholder checklist with six steps.

update public.tiles
set steps = $steps$[
  {"description": "Sketch your design on paper before opening Cricut Design Space.", "requiresApproval": false},
  {"description": "Identify which two Cricut operations you'll use — cut, score, draw, or perforate — and why each one serves the design.", "requiresApproval": false},
  {"description": "Build your design in Cricut Design Space.", "requiresApproval": false},
  {"description": "Do a test cut on scrap material before cutting your final piece.", "requiresApproval": false},
  {"description": "Cut, weed, and assemble your final piece.", "requiresApproval": false},
  {"description": "Photograph the finished piece with the person it's for.", "requiresApproval": false}
]$steps$::jsonb
where slug = 'folded-02-made-for-someone';
