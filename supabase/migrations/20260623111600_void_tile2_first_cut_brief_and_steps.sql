-- Void Navigators Tile 2 · First cut for someone: quest brief + nine checklist steps.

update public.tiles
set
  tile_description = $desc$Your mark is cut. Now you cut something for someone else.

A sign, a blank, a board — simple geometry, one material, one named person. This is your first real cut for a recipient, which means the design has to respond to them, not just to what's easy to cut. A name, an image, a shape that means something to this specific person. The recipient is the constraint.

V-carve or contour — Mr. Cook will walk you through the toolpath if it's your first time. Your job is the design and the person behind it.$desc$,
  steps = $steps$[
    {"description": "Name the person and what you're making for them — write it in your journal before opening any software.", "requiresApproval": false},
    {"description": "Sketch your design on paper. Simple geometry reads better on wood than complex geometry — design for the material.", "requiresApproval": false},
    {"description": "Build your design in Cuttle.xyz. Export as SVG.", "requiresApproval": false},
    {"description": "Import into Carbide Create. Set up your toolpath — V-carve or contour. Ask Mr. Cook if it's your first toolpath setup.", "requiresApproval": false},
    {"description": "Simulate before cutting. Does the toolpath do what you intended?", "requiresApproval": false},
    {"description": "Select your wood. One material, appropriate for the recipient and the design.", "requiresApproval": false},
    {"description": "Run the cut.", "requiresApproval": false},
    {"description": "Sand and finish if the piece needs it before giving.", "requiresApproval": false},
    {"description": "Photograph the finished piece with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'void-02-first-cut';
