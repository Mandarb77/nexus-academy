-- Void Tile 1 · The mark's origin: nameplate checklist steps moved to Prism Tile 1.
-- Keep steps 1–8 and the final photograph step (now step 9). Do not touch tile_description.

update public.tiles
set steps = $steps$[
  {"description": "Sketch at least three mark ideas on paper before opening any software. Avoid sharp points, thin protrusions, and tight inside corners — anything narrow or pointed is likely to bend or snap when pressed into wood. Round it instead.", "requiresApproval": false},
  {"description": "Open Cuttle.xyz and build your chosen design. Keep it within a 1.25\" diameter circle.", "requiresApproval": false},
  {"description": "Check your design for three things before exporting: line depth deep enough to read as a stamp, line weight thick enough - at least .05in - to survive cutting, and no sharp corners or thin points. If anything is thin or pointed, round it now — fixing it after cutting means starting over.", "requiresApproval": false},
  {"description": "Test your mark at actual size — print it or zoom to 100% on screen. Does it still read? Adjust if not.", "requiresApproval": false},
  {"description": "Export your mark as an SVG file.", "requiresApproval": false},
  {"description": "Open Carbide Create. Import your SVG. Mr. Cook will walk you through the toolpath setup.", "requiresApproval": false},
  {"description": "Simulate the cut before running it. Check depth and tool clearance.", "requiresApproval": false},
  {"description": "Cut your mark in Delrin on the CNC.", "requiresApproval": false},
  {"description": "Photograph your finished Delrin stamp.", "requiresApproval": false}
]$steps$::jsonb
where slug = 'void-01-marks-origin';

-- Remap checklist_state: keep slots 1–8, drop nameplate slots 9–10, keep photograph (old slot 11) as new slot 9.
update public.patents p
set checklist_state = (
  select coalesce(jsonb_agg(elem order by ord), '[]'::jsonb)
  from (
    select elem, ord
    from jsonb_array_elements(p.checklist_state) with ordinality as t(elem, ord)
    where ord <= 8
    union all
    select elem, 9::bigint as ord
    from jsonb_array_elements(p.checklist_state) with ordinality as t(elem, ord)
    where ord = 11
  ) kept
)
from public.tiles t
where t.id = p.tile_id
  and t.slug = 'void-01-marks-origin'
  and p.checklist_state is not null
  and jsonb_typeof(p.checklist_state) = 'array'
  and jsonb_array_length(p.checklist_state) >= 11;
