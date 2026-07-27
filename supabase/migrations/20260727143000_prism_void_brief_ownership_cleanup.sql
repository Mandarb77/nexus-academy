-- Prism + Void briefs and Void Step 2: finish ownership alignment.
-- Mark design = Prism/Cuttle. Physical Delrin stamp = Void/CNC. Nameplate = Prism (already).

update public.tiles
set tile_description = $desc$Your Maker's Mark already exists — you designed it in Cuttle.xyz. Now it goes to work for the first time, on the laser.

Design a nameplate for your spot on the wall board: first name, last initial, and your mark, sized to 2.5" × 1.1", cut from 1/8" birch plywood on the Thunder Bolt laser. This is your first laser cut. Settings, material, focus — Mr. Cook will walk you through it the first time.

The laser doesn't forgive mistakes the way a 3D printer does. Once it's cut, that's the wood. Get the layout right in Cuttle.xyz before you run anything.$desc$
where slug = 'prism-01-a-name-worth-keeping';

update public.tiles
set
  tile_description = $desc$This is your Maker's Mark — the signature that goes on everything you make here. Every piece you give away, every Patent you file, every slot you stamp on the wall. Get it right.

Your mark has to work at 1.25" diameter. Simple reads better than complicated at that size. Test it small before you cut it.

You already designed it in Cuttle.xyz (Prism). Export it as an SVG and bring it into Carbide Create for the toolpath. Mr. Cook will walk you through the Carbide side. Your job now is the cut — the physical Delrin stamp.$desc$,
  steps = jsonb_set(
    steps,
    '{1,description}',
    to_jsonb(
      'In Cuttle.xyz, prepare your existing Maker''s Mark for the CNC: confirm it still fits within a 1.25" diameter circle. You''re not building a new design — you''re getting this one ready to cut in Delrin.'::text
    )
  )
where slug = 'void-01-marks-origin';
