-- Forge Tile 1 · the mark's home: replace 7 checklist steps with 8.
-- Brief, gating, WP/gold, and Patent fields unchanged.
-- Design intent: quest ends at validated STL + teacher design check — printing is
-- separately gated. Step 8 is post-unlock guidance only (fit test / photo after print).
--
-- Remap in-progress checklist_state (7 → 8): keep measure/sketch/model/size/teacher/photo;
-- insert unset slots for new recess + STL export; drop the old "Print" tick.

update public.tiles
set steps = $steps$[
  {"description": "Measure your Maker's Mark stamp: 1.25\" across, 0.2\" thick. Write it down. This is the one measurement that has to be exact.", "requiresApproval": false},
  {"description": "Sketch the outer shape on paper before opening anything — think about how it sits in the hand of the person it's for, not just how it looks.", "requiresApproval": false},
  {"description": "In TinkerCAD, build the outer body of the holder. If you've never used TinkerCAD, do the short built-in tutorial first — it teaches the only three moves you need: add a shape, resize it, and subtract one shape from another.", "requiresApproval": false},
  {"description": "Make the recess: drop in a cylinder 1.25\" wide and 0.2\" tall, set it to \"hole,\" and group it with your body to cut the pocket. Heads up — TinkerCAD works in millimeters, so 1.25\" = 31.75mm and 0.2\" = 5mm. Match those exactly or the stamp won't fit.", "requiresApproval": false},
  {"description": "Check your outer size stays under 3\" wide × 4\" tall.", "requiresApproval": false},
  {"description": "Export your design as an STL file (Export → .STL). That's the file the printer software needs.", "requiresApproval": false},
  {"description": "Show Mr. Cook your design and your STL file. This is your checkpoint — where your work gets checked and where printing gets unlocked.", "requiresApproval": false},
  {"description": "Once printing is unlocked for you, you'll open your STL in Bambu Studio, pick your filament (ask which one's loaded), slice it, and print. When it's done and cool, test the fit — if the stamp doesn't sit right, adjust in TinkerCAD and reprint. Almost nobody nails the fit first try. Then photograph the finished holder, stamp in place, with the person it's for.", "requiresApproval": false}
]$steps$::jsonb
where slug = 'forge-01-marks-home';

-- Remap existing 7-slot checklist arrays onto the new 8-slot order.
update public.patents p
set checklist_state = jsonb_build_array(
  coalesce(p.checklist_state->0, 'false'::jsonb),
  coalesce(p.checklist_state->1, 'false'::jsonb),
  coalesce(p.checklist_state->2, 'false'::jsonb),
  'false'::jsonb,
  coalesce(p.checklist_state->3, 'false'::jsonb),
  'false'::jsonb,
  coalesce(p.checklist_state->4, 'false'::jsonb),
  coalesce(p.checklist_state->6, 'false'::jsonb)
)
from public.tiles t
where t.id = p.tile_id
  and t.slug = 'forge-01-marks-home'
  and p.checklist_state is not null
  and jsonb_typeof(p.checklist_state) = 'array'
  and jsonb_array_length(p.checklist_state) = 7;
