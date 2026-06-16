-- Forge Tile 6 · heat and set: quest brief, resource link, eight checklist steps.

update public.tiles
set
  tile_description = $desc$Screws don't hold in plastic. Thread a screw directly into a 3D-printed hole and after a few uses the threads strip out — the plastic can't take repeated stress.

A heat-set insert solves this. It's a small brass piece with threads on the inside and a knurled pattern on the outside. You heat it with a soldering iron and press it into a slightly undersized hole in your printed part — the heat melts the plastic just enough for the insert to sink in and fuse permanently. Once it's set, you have a real metal thread that can be screwed and unscrewed as many times as you want.

This matters because it's the difference between a part that holds together once and a part that holds together for years. Anything with a removable lid, a panel that opens, or a piece that needs real mechanical strength benefits from this.

Watch a quick video before you start — search "heat set insert 3D print tutorial" or check the Field Guide. Seeing it done once makes the whole process obvious.$desc$,
  ledger_resources = $resources$[
    {"label": "How heat-set inserts work (3 min)", "url": "https://m.youtube.com/watch?v=hwq15qH-4x4"}
  ]$resources$::jsonb,
  checklist_footer_note = null,
  steps = $steps$[
    {"description": "Name the object and the person it's for — write it in your journal.", "requiresApproval": false},
    {"description": "Design your part with a hole sized for your heat-set insert — check the insert size against your printed material thickness.", "requiresApproval": false},
    {"description": "Print the part.", "requiresApproval": false},
    {"description": "Set your soldering iron to the right temperature for your insert and plastic — look this up, it varies by material.", "requiresApproval": false},
    {"description": "Heat and press the insert into the hole slowly and evenly. Don't rush it.", "requiresApproval": false},
    {"description": "Let it cool, then test the screw. Does it thread in cleanly and hold?", "requiresApproval": false},
    {"description": "Assemble the full mechanical joint and test it under real load — does it survive actual use, not just a gentle screw-in?", "requiresApproval": false},
    {"description": "Photograph the finished piece with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'forge-06-heat-and-set';
