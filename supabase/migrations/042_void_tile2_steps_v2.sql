-- Void Navigators Tile 2 — replace step text (v2)
update public.tiles
set steps = $steps$[
  { "description": "Choose the person and the item.", "requiresApproval": false },
  { "description": "Measure the item in millimeters. All the dimensions!", "requiresApproval": false },
  { "description": "Cut a prototype and test the fit with the actual object.", "requiresApproval": false },
  { "description": "Choose your stock — wood, Delrin, or acrylic.", "requiresApproval": false }
]$steps$::jsonb
where guild = 'Void Navigators'
  and skill_name = 'I Wanna Hold Your Hand';
