-- Void Navigators Tile 4 · Three bears: quest brief + eleven checklist steps.

update public.tiles
set
  tile_description = $desc$You've made a piece fit. Now make three pieces fit each other — and make the materials part of the meaning.

Three wood species. Three pieces whose curves mate at every joint. The negative space of one piece is the positive space of the next — they lock together without fasteners, held by the precision of the cut and the design of the curve.

The kerf is the design challenge. The saw blade removes material, and that removed material lives somewhere in your joints. Design the curves knowing the kerf exists — account for it before you cut, not after.

The species you choose matter. Walnut, maple, cherry — each one reads differently next to the others. The contrast is part of the object. Choose three that earn their place next to each other, and choose a recipient who will notice.$desc$,
  steps = $steps$[
    {"description": "Name the person and why three contrasting wood species is right for this object — write it in your journal.", "requiresApproval": false},
    {"description": "Choose three species that will contrast visually. Sketch the three-piece composition — where do the curves meet?", "requiresApproval": false},
    {"description": "Design all three pieces in the same Carbide Create file so the joints are designed relative to each other, not guessed at separately.", "requiresApproval": false},
    {"description": "Account for kerf in your joint curves. The tool removes material — the mating curves need to be designed knowing that.", "requiresApproval": false},
    {"description": "Choose your stock. Confirm you have all three species before cutting anything.", "requiresApproval": false},
    {"description": "Cut a test set in scrap or cheap material first. Do the joints mate? Do the curves flow the way you intended?", "requiresApproval": false},
    {"description": "Adjust the joint design if needed. Recut the test set.", "requiresApproval": false},
    {"description": "When the test set is right: cut your final pieces in the chosen species.", "requiresApproval": false},
    {"description": "Dry-fit all three. No glue until the fit is confirmed.", "requiresApproval": false},
    {"description": "Finish and assemble.", "requiresApproval": false},
    {"description": "Photograph the finished piece with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'void-04-three-bears';
