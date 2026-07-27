-- Prism Tile 1 + Void Tile 1: ownership of Maker's Mark creation.
-- Principle: Cuttle/Prism designs the mark; Void receives it and cuts Delrin.
--
-- Prism: replace 8 steps with 7 (supervised laser path; no separate scrap test-cut).
-- Brief unchanged (as requested for this pass).
-- Void: replace Step 1 only — constraints-check on existing mark, not invent-from-scratch.
-- Void steps 2–9 and brief unchanged in this migration.

-- ---------------------------------------------------------------------------
-- Prism Tile 1 · Your Name on the Wall
-- ---------------------------------------------------------------------------
update public.tiles
set steps = $steps$[
  {"description": "Open Cuttle.xyz and design your Maker's Mark — your initials, a symbol, something geometric. It has to read at small size and work as a stamp. (Mr. Cook will walk the whole class through this the first time.)", "requiresApproval": false},
  {"description": "Mr. Cook will set your canvas to the nameplate size, 2.5\" × 1.1\", and show you how — a quick \"watch me once.\"", "requiresApproval": false},
  {"description": "Add your first name and last initial with the text tool, and arrange them next to your mark so everything fits inside the 2.5\" × 1.1\" area. Move by dragging, resize by pulling the corners. Nothing crosses the edge — the laser cuts off anything that hangs over.", "requiresApproval": false},
  {"description": "Check it once at full size: name spelled right, nothing past the edge. Once it's cut, the wood is permanent — this is the last look.", "requiresApproval": false},
  {"description": "Download your layout as an SVG (File → Download). An SVG stores your design as lines the laser can follow — that's what the laser's software needs.", "requiresApproval": false},
  {"description": "Bring it to Mr. Cook. Together you'll open it in LightBurn, set it up, and run it on 1/8\" birch plywood — your first laser cut, side by side.", "requiresApproval": false},
  {"description": "Mount your finished nameplate on the wall board. Your spot, made permanent.", "requiresApproval": false}
]$steps$::jsonb
where slug = 'prism-01-a-name-worth-keeping';

-- Remap in-progress Prism checklists 8 → 7.
-- Old: open mark, canvas+name, check, export, LightBurn, scrap test, final cut, mount
-- New: design mark, canvas demo, arrange name, check, download SVG, supervised cut, mount
update public.patents p
set checklist_state = jsonb_build_array(
  coalesce(p.checklist_state->0, 'false'::jsonb),
  coalesce(p.checklist_state->1, 'false'::jsonb),
  coalesce(p.checklist_state->2, 'false'::jsonb),
  coalesce(p.checklist_state->2, 'false'::jsonb),
  coalesce(p.checklist_state->3, 'false'::jsonb),
  coalesce(p.checklist_state->6, coalesce(p.checklist_state->4, 'false'::jsonb)),
  coalesce(p.checklist_state->7, 'false'::jsonb)
)
from public.tiles t
where t.id = p.tile_id
  and t.slug = 'prism-01-a-name-worth-keeping'
  and p.checklist_state is not null
  and jsonb_typeof(p.checklist_state) = 'array'
  and jsonb_array_length(p.checklist_state) = 8;

-- ---------------------------------------------------------------------------
-- Void Tile 1 · The mark's origin — Step 1 only
-- ---------------------------------------------------------------------------
update public.tiles
set steps = jsonb_set(
  steps,
  '{0,description}',
  to_jsonb(
    'Open your Maker''s Mark in Cuttle.xyz — the one you already designed. Check it against what a CNC cut needs: does it still read at 1.25" diameter? Any sharp points, thin protrusions, or tight inside corners that could bend or snap when cut? If so, round them now. You''re refining a mark that already exists, not starting over.'::text
  )
)
where slug = 'void-01-marks-origin';
