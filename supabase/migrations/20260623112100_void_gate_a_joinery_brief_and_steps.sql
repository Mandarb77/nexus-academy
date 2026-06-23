-- Void Navigators Gate A · Joinery: quest brief + eleven checklist steps.

update public.tiles
set
  tile_description = $desc$Everything you've cut so far has been one piece — or pieces that sit next to each other. This one has to hold together under real use.

Joinery is how woodworkers connect two pieces without relying on glue alone. A box with a sliding lid. A tool organizer with a press-fit divider. A game with a base and a removable top. The joint is designed — it's not an afterthought after the shapes are done. The joint is the design problem.

Two parts that fit and function together, made for a named person who will actually use the object. The function is the test: does it open and close? Does it hold? Does it stay together when someone picks it up?

This gates the boss fight because it proves you can design for how an object behaves over time, not just how it looks when it's done.$desc$,
  steps = $steps$[
    {"description": "Name the person, the object, and what the joint needs to do — write it in your journal before opening any software.", "requiresApproval": false},
    {"description": "Decide the joint type: sliding lid, press fit, box joint, dado, or other. The joint should match the object's function — not just be the easiest joint to cut.", "requiresApproval": false},
    {"description": "Sketch both pieces together, showing how they connect. Where does the joint live? How does it move or hold?", "requiresApproval": false},
    {"description": "Design both pieces in the same Carbide Create file so the joint dimensions are designed relative to each other.", "requiresApproval": false},
    {"description": "Account for tolerance — the joint needs to work in real material, not just in the file.", "requiresApproval": false},
    {"description": "Simulate both toolpaths before cutting anything.", "requiresApproval": false},
    {"description": "Cut a test set in scrap material. Test the joint — does it function the way you intended?", "requiresApproval": false},
    {"description": "Adjust tolerance or design if needed. Recut.", "requiresApproval": false},
    {"description": "When the joint works reliably: cut your final pieces in your chosen material.", "requiresApproval": false},
    {"description": "Finish and assemble.", "requiresApproval": false},
    {"description": "Photograph the finished object functioning — open and closed if it moves — with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'void-gate-a-joinery';
