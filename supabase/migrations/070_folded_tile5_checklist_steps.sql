-- Folded Path Tile 5 · Complicated and Beautiful: replace placeholder checklist with six steps.

update public.tiles
set steps = $steps$[
  {"description": "Name the technique that scared you and write down why — before opening any software.", "requiresApproval": false},
  {"description": "Find a reference or tutorial for the technique. Add it to the Field Guide if it helped.", "requiresApproval": false},
  {"description": "Do a test run on scrap material before committing to your final piece.", "requiresApproval": false},
  {"description": "Expect it to fail the first time. Note what happened and adjust.", "requiresApproval": false},
  {"description": "Build your final piece in your chosen material.", "requiresApproval": false},
  {"description": "Photograph the finished piece with the person it's for.", "requiresApproval": false}
]$steps$::jsonb
where slug = 'folded-05-complicated-beautiful';
