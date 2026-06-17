-- Void Tile 1 · The mark's origin: design-constraint checklist steps + pending resource button.

update public.tiles
set
  steps = $steps$[
    {"description": "Sketch at least three mark ideas on paper before opening any software. Avoid sharp points, thin protrusions, and tight inside corners — anything narrow or pointed is likely to bend or snap when pressed into wood. Round it instead.", "requiresApproval": false},
    {"description": "Open Cuttle.xyz and build your chosen design. Keep it within a 1.25\" diameter circle.", "requiresApproval": false},
    {"description": "Check your design for three things before exporting: line depth deep enough to read as a stamp, line weight thick enough - at least .05in - to survive cutting, and no sharp corners or thin points. If anything is thin or pointed, round it now — fixing it after cutting means starting over.", "requiresApproval": false},
    {"description": "Test your mark at actual size — print it or zoom to 100% on screen. Does it still read? Adjust if not.", "requiresApproval": false},
    {"description": "Export your mark as an SVG file.", "requiresApproval": false},
    {"description": "Open Carbide Create. Import your SVG. Mr. Cook will walk you through the toolpath setup.", "requiresApproval": false},
    {"description": "Simulate the cut before running it. Check depth and tool clearance.", "requiresApproval": false},
    {"description": "Cut your mark in Delrin on the CNC.", "requiresApproval": false},
    {"description": "In Cuttle.xyz, create your nameplate file: first name, last initial, your mark at 1.25\", sized to 2.5\" × 1.1\". Export as SVG.", "requiresApproval": false},
    {"description": "Hand the nameplate file to Mr. Cook. He'll cut it on the Glowforge. It goes on the wall in your row.", "requiresApproval": false},
    {"description": "Photograph your finished Delrin stamp.", "requiresApproval": false}
  ]$steps$::jsonb,
  ledger_resources = $resources$[
    {"label": "Open Cuttle.xyz", "url": "https://cuttle.xyz/"},
    {"label": "Mark design constraints (video — coming soon)", "pending": true},
    {"label": "Download Carbide Create", "url": "https://carbide3d.com/carbidecreate/"},
    {"label": "V-carve inlay start to finish", "url": "https://www.youtube.com/watch?v=241eTfM1Dss"}
  ]$resources$::jsonb
where slug = 'void-01-marks-origin';
