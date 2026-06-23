-- Prism Tile 5 · Borrowed and Changed: quest brief + nine checklist steps.

update public.tiles
set
  tile_description = $desc$Every design tradition borrows. The question is whether you changed it enough to make it yours — and whether the change serves the person it's for.

Find something that already lives in your recipient's world. A pattern from a fabric they wear. A symbol from a place that matters to them. An image they've had on their wall for years. Borrow it — then change it until it couldn't belong to anyone else. Not because you had to, but because the change is what makes it a gift rather than a copy.

The test is the Patent. You'll name the original source and describe what you changed and why. If the honest answer is "I scaled it and added their initials," it's not done yet. If the honest answer is "I took the curve from their grandmother's quilt pattern and built the whole piece around it because that quilt is the thing she talks about most," that's the tile.

The original source goes on the Patent. The change goes on the Patent. Both have to be real.$desc$,
  steps = $steps$[
    {"description": "Name the person and find the original source — something that already lives in their world. Write the source and why it belongs to them in your journal.", "requiresApproval": false},
    {"description": "Study the original. What makes it what it is — the pattern, the proportion, the line, the negative space?", "requiresApproval": false},
    {"description": "Decide what you're changing and why the change serves this specific recipient. Write it down before touching any software.", "requiresApproval": false},
    {"description": "Build the transformed design in Cuttle.xyz. The original should be recognizable as the starting point, but the result should be specific to this person.", "requiresApproval": false},
    {"description": "Export as SVG.", "requiresApproval": false},
    {"description": "Set up your toolpath in Glowforge. Choose material and settings appropriate to the design.", "requiresApproval": false},
    {"description": "Test cut on scrap. Does the transformed design read the way you intended?", "requiresApproval": false},
    {"description": "Cut your final piece.", "requiresApproval": false},
    {"description": "Photograph the finished piece with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'prism-05-borrowed-and-changed';
