-- Paste into Supabase Dashboard → SQL Editor → Run
-- Project: nexus academy (ezjjehppuefzzromlbrk)
-- Migrations 083 + 084

-- 083: Prism Tile 1 · Your Name on the Wall
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

-- 084: Void Tile 1 · design constraints + pending resource
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

-- Mark migrations applied (run after both UPDATEs succeed)
insert into supabase_migrations.schema_migrations (version)
values ('083'), ('084')
on conflict (version) do nothing;

-- Verify
select slug, skill_name, jsonb_array_length(steps) as steps
from public.tiles
where slug in ('prism-01-a-name-worth-keeping', 'void-01-marks-origin');
