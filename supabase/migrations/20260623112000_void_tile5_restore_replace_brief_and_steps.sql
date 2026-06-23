-- Void Navigators Tile 5 · Restore or replace: quest brief + ten checklist steps.

update public.tiles
set
  tile_description = $desc$Something is worn, broken, or missing — and it belongs somewhere specific.

Not a generic replacement. Not a new version of something. The original had a place — a shelf it supported, a sign that named a room, a piece of furniture that held something — and that place is still waiting. Your job is to understand what the original did, well enough to make something that goes back there and works.

This is different from making something new because the design already exists. Your job is to read it from what's left — the wear patterns, the mounting holes, the dimensions of the space it used to fill — and rebuild it faithfully enough that the place doesn't know the difference.

The recipient is the test. If the piece goes back where it belongs and does what the original did, the tile is done. If it doesn't fit, the tile isn't done yet.$desc$,
  steps = $steps$[
    {"description": "Find the worn, broken, or missing piece — and confirm it has a specific place it belongs. Write what that place is and who it belongs to in your journal.", "requiresApproval": false},
    {"description": "Study what's left of the original — wear patterns, mounting points, dimensions, material. Measure everything that tells you what the original was.", "requiresApproval": false},
    {"description": "Sketch the replacement before opening any software.", "requiresApproval": false},
    {"description": "Build your design in Carbide Create. Match the original's dimensions and function — not just its appearance.", "requiresApproval": false},
    {"description": "Choose a material appropriate to the original and the place it's going back to.", "requiresApproval": false},
    {"description": "Simulate the toolpath. Check that the piece will fit the space it's returning to.", "requiresApproval": false},
    {"description": "Cut a test piece in scrap first if the fit is critical.", "requiresApproval": false},
    {"description": "Cut the final piece.", "requiresApproval": false},
    {"description": "Install it in its place. Does it fit? Does it do what the original did?", "requiresApproval": false},
    {"description": "Photograph the finished piece installed in its place, with the person it belongs to.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'void-05-restore-replace';
