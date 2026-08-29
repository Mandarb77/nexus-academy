-- Prism Tile 1: cardboard is the reworkable prototype (unlimited recuts).
-- Void Tile 1: birch nameplate is earned after the Delrin CNC cut.
-- Single DO block so `supabase db query --file` can apply it.

do $$
begin
  update public.tiles
  set
    tile_description = $desc$Your Maker's Mark starts here. Design it in Cuttle.xyz — this is the signature that will go on everything you make. Then it goes to work for the first time, on the laser.

Design a nameplate for your spot on the wall board: first name, last initial, and your mark, sized to 2.5" × 1.1". You will cut it in cardboard on the Thunder Bolt laser. That is a real cut, on purpose, in a material that lets you try again. This is not a lesser version of the nameplate. This is how you prove the design and the toolpaths before anything is meant to last.

Cut, look at it, recut. Cheap material means a miss costs nothing and another pass is expected. Each cardboard attempt is the work of this tile — not a placeholder you rush past.

When the cardboard plate is actually right, that is this quest. The birch version comes later, after this mark has been carried through the CNC in Void and confirmed to transfer. Completing this tile means the prototype is solid enough to take with you — not that the wall is finished in wood.

Settings, focus, and the first cut — Mr. Cook will walk you through it. After that, recut as many times as you need before you submit.$desc$,
    recipient_guidance = 'You — your name and your mark, proven in cardboard. Birch comes later, after the mark holds up in Void.',
    checklist_footer_note = 'Recut the cardboard as many times as you need. Do not submit this checklist until the plate is actually right — another pass is the work, not a failure.',
    steps = $steps$[
      {"description": "Open Cuttle.xyz and design your Maker's Mark — your initials, a symbol, something geometric. It has to read at small size and work as a stamp. (Mr. Cook will walk the whole class through this the first time.)", "requiresApproval": false},
      {"description": "Mr. Cook will set your canvas to the nameplate size, 2.5\" × 1.1\", and show you how — a quick \"watch me once.\"", "requiresApproval": false},
      {"description": "Add your first name and last initial with the text tool, and arrange them next to your mark so everything fits inside the 2.5\" × 1.1\" area. Move by dragging, resize by pulling the corners. Nothing crosses the edge — the laser cuts off anything that hangs over.", "requiresApproval": false},
      {"description": "Check it at full size: name spelled right, nothing past the edge. If something is off, that is information — recutting cardboard is how this tile works, not a failure.", "requiresApproval": false},
      {"description": "Download your layout as an SVG (File → Download). An SVG stores your design as lines the laser can follow — that's what the laser's software needs.", "requiresApproval": false},
      {"description": "Bring it to Mr. Cook. Together you'll open it in LightBurn and run it on cardboard — your first laser cut, side by side. Look at the plate. Recut until it is actually right. There is no limit on cardboard passes; each one counts as progress.", "requiresApproval": false},
      {"description": "Mount the cardboard nameplate on the wall board. That is your spot for now. Birch replaces it later, after Void, once this design has earned the material that lasts.", "requiresApproval": false}
    ]$steps$::jsonb
  where slug = 'prism-01-a-name-worth-keeping';

  update public.tiles
  set
    tile_description = $desc$This is your Maker's Mark — the signature that goes on everything you make here. Every piece you give away, every Patent you file, every slot you stamp on the wall. Get it right.

Your mark has to work at 1.25" diameter. Simple reads better than complicated at that size. Test it small before you cut it.

You already designed it in Cuttle.xyz (Prism). Export it as an SVG and bring it into Carbide Create for the toolpath. Mr. Cook will walk you through the Carbide side. Your job now is the cut — the physical Delrin stamp.

You already worked the cut constraints into this mark back in Prism — this is just your chance to confirm it's still good before it's permanent.

Once the Delrin stamp is cut and the mark has proven it can transfer, you earn the birch nameplate. Cut the same layout you already proved in cardboard: first name, last initial, and your mark, sized to 2.5" × 1.1", on 1/8" birch plywood. Swap it onto the wall in place of the cardboard. That is the permanent one — not another prototype.$desc$,
    steps = $steps$[
      {"description": "Open your Maker's Mark in Cuttle.xyz — the one you already designed. Check it against what a CNC cut needs: does it still read at 1.25\" diameter? Any sharp points, thin protrusions, or tight inside corners that could bend or snap when cut? If so, round them now. You're refining a mark that already exists, not starting over.", "requiresApproval": false},
      {"description": "In Cuttle.xyz, prepare your existing Maker's Mark for the CNC: confirm it still fits within a 1.25\" diameter circle. You're not building a new design — you're getting this one ready to cut in Delrin.", "requiresApproval": false},
      {"description": "Check your design for three things before exporting: line depth deep enough to read as a stamp, line weight thick enough - at least .05in - to survive cutting, and no sharp corners or thin points. If anything is thin or pointed, round it now — fixing it after cutting means starting over.", "requiresApproval": false},
      {"description": "Check it at actual size — zoom to 100% on screen, or hold it up on paper. Does it still read? Adjust if not.", "requiresApproval": false},
      {"description": "Export your mark as an SVG file.", "requiresApproval": false},
      {"description": "Open Carbide Create. Import your SVG. Mr. Cook will walk you through the toolpath setup.", "requiresApproval": false},
      {"description": "Simulate the cut before running it. Check depth and tool clearance.", "requiresApproval": false},
      {"description": "Cut your mark in Delrin on the CNC.", "requiresApproval": false},
      {"description": "Photograph your finished Delrin stamp.", "requiresApproval": false},
      {"description": "Cut your nameplate in 1/8\" birch plywood — first name, last initial, and your mark, 2.5\" × 1.1\", the same layout you proved in cardboard. This is the earned cut. The design already worked; now it gets the material that lasts.", "requiresApproval": false},
      {"description": "Mount the birch nameplate on the wall board, replacing the cardboard. That is your permanent spot.", "requiresApproval": false}
    ]$steps$::jsonb
  where slug = 'void-01-marks-origin';

  update public.patents p
  set checklist_state = p.checklist_state || jsonb '[false, false]'
  from public.tiles t
  where t.id = p.tile_id
    and t.slug = 'void-01-marks-origin'
    and p.checklist_state is not null
    and jsonb_typeof(p.checklist_state) = 'array'
    and jsonb_array_length(p.checklist_state) = 9;
end;
$$;
