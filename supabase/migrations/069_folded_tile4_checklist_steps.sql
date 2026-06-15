-- Folded Path Tile 4 · One Shirt, One Person: replace placeholder checklist with eight steps.

update public.tiles
set steps = $steps$[
  {"description": "Name one design decision you're making specifically because of who this person is — write it down before opening any software.", "requiresApproval": false},
  {"description": "Build your design in Cricut Design Space. No templates with a name swapped in.", "requiresApproval": false},
  {"description": "Mirror your design before cutting — iron-on vinyl goes face down.", "requiresApproval": false},
  {"description": "Do a test cut on scrap vinyl before cutting your final piece.", "requiresApproval": false},
  {"description": "Weed carefully — iron-on is unforgiving once it's pressed.", "requiresApproval": false},
  {"description": "Press at the correct temperature and pressure for your shirt material. Check the Cricut heat guide.", "requiresApproval": false},
  {"description": "Peel and inspect. If it lifted, press again before it cools completely.", "requiresApproval": false},
  {"description": "Photograph the finished shirt with the person it's for.", "requiresApproval": false}
]$steps$::jsonb
where slug = 'folded-04-one-shirt-one-person';
