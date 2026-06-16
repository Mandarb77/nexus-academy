-- Forge Gate A · the cross-guild fit: quest brief + nine checklist steps.

update public.tiles
set
  tile_description = $desc$Two machines. Two materials. One object that doesn't exist until both halves meet.

The CNC cuts. The printer prints. Wood and plastic, Delrin and PLA, whatever you choose — but the two pieces have to come together with the same intention as Tile 3's gate, except now you're designing across two completely different processes that don't talk to each other. The CNC doesn't know what the printer is going to do. You're the only thing connecting them.

Two shapes this can take. A split — two halves that interlock, like a yin-yang. Or an inlay — the CNC cuts a pocket, the printer makes a piece that sits inside it, flush. A 3D-printed cat set into a coaster the CNC routed. Either way, the fit has to survive translation — what's exact on a CNC toolpath isn't automatically exact on a print bed.$desc$,
  steps = $steps$[
    {"description": "Name the object and the recipient — write it in your journal before opening any software.", "requiresApproval": false},
    {"description": "Decide your shape: a split (two interlocking halves) or an inlay (a pocket and a piece that fills it). Decide which half is cut and which is printed, and why each material suits its role.", "requiresApproval": false},
    {"description": "Model both pieces in the same file if possible, so the fit is designed once, not guessed at twice.", "requiresApproval": false},
    {"description": "Confirm your tolerance plan accounts for both processes — CNC tolerances and print tolerances are not the same.", "requiresApproval": false},
    {"description": "Cut your CNC piece. Print your Forge piece.", "requiresApproval": false},
    {"description": "Test the fit. Document what doesn't match and why.", "requiresApproval": false},
    {"description": "Adjust whichever piece is easier to iterate — usually the printed one — and reprint or recut as needed.", "requiresApproval": false},
    {"description": "Confirm the fit is intentional and repeatable, not a lucky alignment.", "requiresApproval": false},
    {"description": "Photograph the finished object, assembled, with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'forge-gate-a-cross-guild';
