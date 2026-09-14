-- Void Tile 1: Carbide step is screenshot + SVG, not an individual machine run.
-- Keep step count/order (checklist_state indexes).

update public.tiles
set steps = jsonb_set(
  jsonb_set(
    steps,
    '{5,description}',
    to_jsonb(
      'Open Carbide Create and import your SVG. Set depth of cut to 1.5mm (0.06"). Take a screenshot of the toolpath view that clearly shows that depth. That screenshot plus your SVG is the reviewed deliverable for this step — Mr. Cook merges everyone''s SVGs into one batch cut, so your individual G-code is not what runs on the machine.'::text
    )
  ),
  '{6,description}',
  to_jsonb(
    'Keep your SVG with that screenshot. Before you check this off, confirm the screenshot shows 1.5mm (0.06") in the toolpath view. You are turning in proof of the setup, not claiming your own toolpath will be sent to the CNC.'::text
  )
)
where slug = 'void-01-marks-origin'
  and jsonb_array_length(steps) >= 7;
