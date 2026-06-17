-- Prism Tile 1 · Your Name on the Wall: rename, quest brief, eight checklist steps.

update public.tiles
set
  skill_name = 'Tile 1 · Your Name on the Wall',
  tile_description = $desc$Your Maker's Mark already exists — you designed it, you cut it in Delrin. Now it goes to work.

Design a nameplate for your spot on the wall board: first name, last initial, and your mark, sized to 2.5" × 1.1", cut from 1/8" birch plywood on the Glowforge. This is your first laser cut. Settings, material, focus — Mr. Cook will walk you through it the first time.

The laser doesn't forgive mistakes the way a 3D printer does. Once it's cut, that's the wood. Get the layout right in Cuttle.xyz before you run anything.$desc$,
  steps = $steps$[
    {"description": "Open Cuttle.xyz and bring in your Maker's Mark design.", "requiresApproval": false},
    {"description": "Set your canvas to 2.5\" × 1.1\". Add your first name and last initial alongside your mark, arranged to fit within those dimensions.", "requiresApproval": false},
    {"description": "Check your layout against the 2.5\" × 1.1\" size before exporting — nothing should run past the edge.", "requiresApproval": false},
    {"description": "Export as SVG.", "requiresApproval": false},
    {"description": "Bring the file to Mr. Cook for your first Glowforge settings walkthrough.", "requiresApproval": false},
    {"description": "Test cut on scrap plywood if you're unsure about settings.", "requiresApproval": false},
    {"description": "Run your final piece on 1/8\" birch plywood, 2.5\" × 1.1\".", "requiresApproval": false},
    {"description": "Mount your nameplate on the wall board.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'prism-01-a-name-worth-keeping';
