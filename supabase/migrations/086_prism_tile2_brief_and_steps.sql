-- Prism Tile 2 · The Story Object: quest brief + eight checklist steps.

update public.tiles
set
  tile_description = $desc$Your own nameplate was simple — name, mark, done. This one isn't allowed to be.

Make a name permanent for someone else, but this time you have to use a Cuttle technique you didn't use on your own plate. Text that follows a curve instead of a straight line. A shape filled with a pattern instead of a solid cut. A layered design instead of a flat one. Pick something new and make it count.

One design decision — the technique, the material, the placement — has to exist specifically because of who this person is. Not because it looked good. Because it's them.$desc$,
  steps = $steps$[
    {"description": "Name the person and what you're making for them — write it in your journal.", "requiresApproval": false},
    {"description": "Name the Cuttle technique you're using that you didn't use on your own nameplate. Write down why it fits this design.", "requiresApproval": false},
    {"description": "Decide the one design choice that exists specifically because of who they are.", "requiresApproval": false},
    {"description": "Sketch the layout before opening Cuttle.xyz.", "requiresApproval": false},
    {"description": "Build the design in Cuttle.xyz using your chosen technique. Export as SVG.", "requiresApproval": false},
    {"description": "Test cut or engrave on scrap material first.", "requiresApproval": false},
    {"description": "Run your final piece.", "requiresApproval": false},
    {"description": "Photograph the finished piece with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'prism-02-the-story-object';
