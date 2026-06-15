-- Folded Path Tile 6 · Every Color in Its Place: replace placeholder checklist with seven steps.

update public.tiles
set steps = $steps$[
  {"description": "Plan your full image before opening Cricut Design Space — sketch it and label which color is which layer.", "requiresApproval": false},
  {"description": "Build each color as a separate layer in Cricut Design Space. No combined paths.", "requiresApproval": false},
  {"description": "Cut your first layer on scrap material and apply it to your surface.", "requiresApproval": false},
  {"description": "Cut your second layer and lay it against the first — does it register? If not, adjust before cutting final.", "requiresApproval": false},
  {"description": "Cut and apply each layer in order, checking registration as you go.", "requiresApproval": false},
  {"description": "If a layer doesn't line up, it isn't done. Recut it.", "requiresApproval": false},
  {"description": "Photograph the finished piece with the person it's for.", "requiresApproval": false}
]$steps$::jsonb
where slug = 'folded-06-every-color-in-place';
