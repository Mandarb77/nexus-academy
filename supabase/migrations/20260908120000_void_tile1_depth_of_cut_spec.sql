-- Void Tile 1: depth of cut is a hard spec (1.5mm / 0.06"), not a by-eye check.

update public.tiles
set
  tile_description = $desc$This is your Maker's Mark — the signature that goes on everything you make here. Every piece you give away, every Patent you file, every slot you stamp on the wall. Get it right.

Your mark has to work at 1.25" diameter. Simple reads better than complicated at that size. Test it small before you cut it.

You already designed it in Cuttle.xyz (Prism). Export it as an SVG and bring it into Carbide Create for the toolpath. Mr. Cook will walk you through the Carbide side. Your job now is the cut — the physical Delrin stamp.

Depth of cut is a spec, not a judgment call: 1.5mm (0.06"). That number is what "the toolpaths are actually right" means. A cut that looks fine by eye but is not 1.5mm (0.06") is not right.

You already worked the cut constraints into this mark back in Prism — this is just your chance to confirm it's still good before it's permanent.

Once the Delrin stamp is cut and the mark has proven it can transfer, you earn the birch nameplate. Cut the same layout you already proved in cardboard: first name, last initial, and your mark, sized to 2.5" × 1.1", on 1/8" birch plywood. Swap it onto the wall in place of the cardboard. That is the permanent one — not another prototype.$desc$,
  steps = $steps$[
    {"description": "Open your Maker's Mark in Cuttle.xyz — the one you already designed. Check it against what a CNC cut needs: does it still read at 1.25\" diameter? Any sharp points, thin protrusions, or tight inside corners that could bend or snap when cut? If so, round them now. You're refining a mark that already exists, not starting over.", "requiresApproval": false},
    {"description": "In Cuttle.xyz, prepare your existing Maker's Mark for the CNC: confirm it still fits within a 1.25\" diameter circle. You're not building a new design — you're getting this one ready to cut in Delrin.", "requiresApproval": false},
    {"description": "Check your design for three things before exporting: line depth deep enough to read as a stamp, line weight thick enough - at least .05in - to survive cutting, and no sharp corners or thin points. If anything is thin or pointed, round it now — fixing it after cutting means starting over.", "requiresApproval": false},
    {"description": "Check it at actual size — zoom to 100% on screen, or hold it up on paper. Does it still read? Adjust if not.", "requiresApproval": false},
    {"description": "Export your mark as an SVG file.", "requiresApproval": false},
    {"description": "Open Carbide Create. Import your SVG. Mr. Cook will walk you through the toolpath setup. The depth of cut must be 1.5mm (0.06\") — that is the spec, not a suggestion.", "requiresApproval": false},
    {"description": "Simulate the cut before running it. Confirm depth of cut is 1.5mm (0.06\") and check tool clearance. Looking fine by eye is not enough — the spec is the proof the toolpaths are actually right.", "requiresApproval": false},
    {"description": "Cut your mark in Delrin on the CNC.", "requiresApproval": false},
    {"description": "Photograph your finished Delrin stamp.", "requiresApproval": false},
    {"description": "Cut your nameplate in 1/8\" birch plywood — first name, last initial, and your mark, 2.5\" × 1.1\", the same layout you proved in cardboard. This is the earned cut. The design already worked; now it gets the material that lasts.", "requiresApproval": false},
    {"description": "Mount the birch nameplate on the wall board, replacing the cardboard. That is your permanent spot.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'void-01-marks-origin';
