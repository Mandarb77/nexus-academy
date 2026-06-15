-- Void Tile 1 · The mark's origin: nameplate step in quest brief + checklist.

update public.tiles
set
  tile_description = $desc$Design your Maker's Mark in Carbide Create · cut it in Delrin on the CNC · this is the mark that goes on everything you make · get it right

After the mark is designed and cut in Delrin: Create a nameplate file: your first name, last initial, and your mark at 1.25", sized to fit a 2.5" × 1.1" wood blank. This goes on the wall in your row. It stays there all year.$desc$,
  steps = $steps$[
    {"description": "Design it, cut it on the CNC, document your iterations, and file your patent.", "requiresApproval": false},
    {"description": "Create a nameplate file: your first name, last initial, and your mark at 1.25\", sized to fit a 2.5\" × 1.1\" wood blank. This goes on the wall in your row. It stays there all year.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'void-01-marks-origin';
