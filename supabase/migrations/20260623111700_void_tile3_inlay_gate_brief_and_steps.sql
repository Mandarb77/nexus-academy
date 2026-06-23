-- Void Navigators Tile 3 · Inlay · the competence gate: quest brief + ten checklist steps.

update public.tiles
set
  tile_description = $desc$Two tiles ago you cut a shape. One tile ago you cut something for someone. This tile asks whether the machine actually does what you think it does.

An inlay is two pieces: a pocket cut into one material, and a piece cut from another that has to sit inside it flush. The design looks simple. The execution isn't — because the tool that cuts the pocket has a radius, and that radius leaves a curve in every inside corner. A square pocket doesn't have square corners. It has rounded corners. The inlay piece has to account for that, or it won't fit.

This is the competence gate because it's the first time the gap between your drawing and your cut is load-bearing. Close isn't good enough. The piece has to fit — flush, stable, without gaps. The first attempt probably won't. That's not failure. That's the gate telling you something true about how the machine works.$desc$,
  steps = $steps$[
    {"description": "Name the person and what the inlaid object will be — write it in your journal.", "requiresApproval": false},
    {"description": "Choose two materials that will contrast when inlaid. Sketch the design.", "requiresApproval": false},
    {"description": "Build both pieces in Carbide Create — the pocket and the inlay piece — in the same file so dimensions are designed relative to each other.", "requiresApproval": false},
    {"description": "Add dogbone fillets to the inside corners of the pocket to account for the tool's radius. If you don't know what this means, look it up before cutting.", "requiresApproval": false},
    {"description": "Simulate both toolpaths. Check that the pocket depth matches the inlay piece's thickness.", "requiresApproval": false},
    {"description": "Cut the pocket first. Measure it — does it match your design?", "requiresApproval": false},
    {"description": "Cut the inlay piece. Test the fit dry — no glue yet.", "requiresApproval": false},
    {"description": "If it doesn't fit flush, identify whether the problem is the pocket, the inlay piece, or the corners. Adjust and recut.", "requiresApproval": false},
    {"description": "When the fit is right: glue the inlay, let it cure, sand flush.", "requiresApproval": false},
    {"description": "Photograph the finished piece with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'void-03-inlay-gate';
