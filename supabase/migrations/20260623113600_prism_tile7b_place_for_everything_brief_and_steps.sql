-- Prism Tile 7B · A Place for Everything: quest brief + twelve checklist steps.

update public.tiles
set
  tile_description = $desc$6B organized a space. This one is for a single object that deserves better than a drawer.

A collection of pens someone actually uses. A set of woodworking chisels that always end up loose in a toolbox. A camera that lives in a bag because there's nowhere specific for it to go. A deck of cards that gets bent because nothing holds it square. Something that has a regular life in someone's hands and no real home to come back to.

The design starts with the object, not with a shape you like. Every dimension serves the thing being stored — the depth of the pocket, the angle of the hold, the way the object sits when it's at rest. If you could swap the object for a different object without changing the design, the design isn't done yet. It has to be specific to this thing, for this person.

Name the object and why it deserves a place. That goes on the Patent.$desc$,
  steps = $steps$[
    {"description": "Name the person and the specific object that needs a home — write both in your journal. Why does this object deserve a dedicated place?", "requiresApproval": false},
    {"description": "Study how the object is used and how it rests. What orientation does it naturally sit in? What parts need to be accessible? What parts can be supported?", "requiresApproval": false},
    {"description": "Measure the object precisely — every dimension that will affect the design.", "requiresApproval": false},
    {"description": "Sketch the storage piece around those measurements. Every dimension should be traceable back to the object.", "requiresApproval": false},
    {"description": "Build your design in Cuttle.xyz using your measurements. Account for material thickness in any joints or walls.", "requiresApproval": false},
    {"description": "Export as SVG.", "requiresApproval": false},
    {"description": "Set up your toolpath in Glowforge.", "requiresApproval": false},
    {"description": "Test cut in scrap material. Does the object actually sit the way you intended? Is it stable? Is it accessible?", "requiresApproval": false},
    {"description": "Adjust dimensions if anything doesn't fit or function correctly. Recut.", "requiresApproval": false},
    {"description": "Cut your final piece in your chosen material.", "requiresApproval": false},
    {"description": "Give it to the person with the object inside it.", "requiresApproval": false},
    {"description": "Photograph the finished piece with the object in place, with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'prism-path-b-place-for-everything';
