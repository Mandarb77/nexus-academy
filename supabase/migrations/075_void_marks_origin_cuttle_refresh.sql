-- Void Tile 1 · The mark's origin: quest brief, ten checklist steps, Cuttle + Carbide resources.

update public.tiles
set
  tile_description = $desc$This is your Maker's Mark — the signature that goes on everything you make here. Every piece you give away, every Patent you file, every slot you stamp on the wall. Get it right.

Your mark has to work at 1.25" diameter. Simple reads better than complicated at that size. Geometric, initials, a symbol — yours to decide. But test it small before you cut it.

You'll design it in Cuttle.xyz, export it as an SVG, and bring it into Carbide Create for the toolpath. Mr. Cook will walk you through the Carbide side. Your job is the design.

When the mark is done, you'll also create a nameplate file: your first name, last initial, and your mark at 1.25", sized to fit a 2.5" × 1.1" wood blank. That goes on the wall in your row. It stays there all year.$desc$,
  steps = $steps$[
    {"description": "Sketch at least three mark ideas on paper before opening any software. Simple reads better than complicated at 1.25\".", "requiresApproval": false},
    {"description": "Open Cuttle.xyz and build your chosen design. Keep it within a 1.25\" diameter circle.", "requiresApproval": false},
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
    {"label": "Download Carbide Create", "url": "https://carbide3d.com/carbidecreate/"},
    {"label": "V-carve inlay start to finish", "url": "https://www.youtube.com/watch?v=241eTfM1Dss"}
  ]$resources$::jsonb
where slug = 'void-01-marks-origin';
