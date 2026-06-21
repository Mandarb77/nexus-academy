-- Folded Path Tile 1 · First Cut: quest brief + eight checklist steps.

update public.tiles
set
  tile_description = $desc$Cut vinyl. Put it on something you actually use — a water bottle, a binder, your laptop, a notebook. This is your first time touching the Cricut, so the goal isn't ambition. It's understanding what the machine does.

Cut, score, weed, transfer — four different things, four different jobs. A cut separates material. A score creases it without cutting through. Weeding removes the parts of your design you don't want. Transfer moves your design from the mat to the surface it's going to live on. You'll use at least cut and weed here; score and transfer come later as your designs get more complex.

The design is yours. So is the object it's going on. Low stakes, real machine time — this is where you learn what Folded Path actually does.$desc$,
  steps = $steps$[
    {"description": "Pick something you use every day that you want to put vinyl on.", "requiresApproval": false},
    {"description": "Sketch your design idea before opening Cricut Design Space.", "requiresApproval": false},
    {"description": "Build your design in Cricut Design Space.", "requiresApproval": false},
    {"description": "Set your material and cut settings for vinyl — check the Cricut settings guide if you're not sure.", "requiresApproval": false},
    {"description": "Cut your design.", "requiresApproval": false},
    {"description": "Weed your design — remove everything that isn't part of the final image.", "requiresApproval": false},
    {"description": "Transfer your design onto your object using transfer tape.", "requiresApproval": false},
    {"description": "Photograph your finished object.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'folded-01-first-cut';
