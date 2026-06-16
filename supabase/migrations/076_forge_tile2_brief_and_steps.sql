-- Forge Tile 2 · a thing that fits a thing: quest brief + seven checklist steps.

update public.tiles
set
  tile_description = $desc$Someone in your life owns something that doesn't have a home. A charger that rolls off the desk. A pair of glasses with nowhere to sit. A multitool that lives in a junk drawer. Find that thing. Measure it. Build it a home that fits — not close, fits.

This is the first time tolerance matters. A holder that's 2mm too small won't take the object. A holder that's 2mm too big lets it rattle around. Get it right by measuring twice, modeling once, and printing a test before you commit.$desc$,
  steps = $steps$[
    {"description":"Find a real object a named person owns that needs a home — measure it with calipers or a ruler, not by eye.","requiresApproval":false},
    {"description":"Write the measurements down in your journal before opening TinkerCAD.","requiresApproval":false},
    {"description":"Model the holder with a small tolerance — start tight, you can always loosen it.","requiresApproval":false},
    {"description":"Print a quick test version. Bambu printers can do fast, lower-quality prototype prints — look up \"Bambu Studio draft mode\" or \"Bambu fast print settings\" if you want to test the fit without waiting for a full-quality print.","requiresApproval":false},
    {"description":"Test the fit with the actual object. Too tight or too loose? Adjust.","requiresApproval":false},
    {"description":"Print your final version.","requiresApproval":false},
    {"description":"Photograph the finished holder with the object in it, with the person it's for.","requiresApproval":false}
  ]$steps$::jsonb
where slug = 'forge-02-fits-a-thing';

