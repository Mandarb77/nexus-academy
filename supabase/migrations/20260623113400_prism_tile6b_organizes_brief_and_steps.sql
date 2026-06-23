-- Prism Tile 6B · The Thing That Organizes: quest brief + eleven checklist steps.

update public.tiles
set
  tile_description = $desc$Everyone has a drawer they don't open all the way because things fall into the back. A desk where the cables live in a pile. A shelf where tools slide around because nothing holds them in place. A bag where everything sinks to the bottom.

Find that place. Find that person. Then measure it.

Not estimate — measure. The drawer is 14.5 inches wide, not "about a foot." The cable is 8mm in diameter, not "medium-sized." The laser cuts to the millimeter, which means your design can fit the actual space exactly — but only if your measurements are exact first.

This is where Prism's precision means something practical. A laser-cut organizer that fits a specific drawer, holds specific objects, and actually gets used is a different object than one that was designed to look like an organizer. The difference is in the measuring.$desc$,
  steps = $steps$[
    {"description": "Find the person and the specific chaos — a real drawer, desk, bag, or shelf. Write what's actually in it in your journal before you design anything.", "requiresApproval": false},
    {"description": "Measure everything that matters — the space itself and the objects it needs to hold. Write the measurements down. Not estimates.", "requiresApproval": false},
    {"description": "Sketch the organizer based on your measurements. Where do things go? What holds them in place?", "requiresApproval": false},
    {"description": "Build your design in Cuttle.xyz using your actual measurements. Account for the material thickness — laser-cut acrylic or wood has a real thickness that affects how pieces fit together.", "requiresApproval": false},
    {"description": "Export as SVG.", "requiresApproval": false},
    {"description": "Set up your toolpath in Glowforge.", "requiresApproval": false},
    {"description": "Test cut a section in scrap material. Does it fit the space? Do the objects sit the way you intended?", "requiresApproval": false},
    {"description": "Adjust dimensions if anything doesn't fit. Recut.", "requiresApproval": false},
    {"description": "Cut your final piece.", "requiresApproval": false},
    {"description": "Install it in the actual space with the actual objects. Does it work?", "requiresApproval": false},
    {"description": "Photograph the finished organizer in use, with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'prism-path-b-thing-that-organizes';
