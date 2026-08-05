-- Reconcile Maker's Mark hand-off across Prism → Void → Forge Tile 1 briefs.
-- Prism: design starts HERE (not "already exists").
-- Void: leave brief (nameplate paragraph already gone).
-- Forge: light nod to the stamp cut in Void.

update public.tiles
set tile_description = $desc$Your Maker's Mark starts here. Design it in Cuttle.xyz — this is the signature that will go on everything you make. Then it goes to work for the first time, on the laser.

Design a nameplate for your spot on the wall board: first name, last initial, and your mark, sized to 2.5" × 1.1", cut from 1/8" birch plywood on the Thunder Bolt laser. This is your first laser cut. Settings, material, focus — Mr. Cook will walk you through it the first time.

The laser doesn't forgive mistakes the way a 3D printer does. Once it's cut, that's the wood. Get the layout right in Cuttle.xyz before you run anything.$desc$
where slug = 'prism-01-a-name-worth-keeping';

-- Prism recipient framing is already correct; keep it.
update public.tiles
set recipient_guidance = 'You — your name and your mark, made permanent on the wall.'
where slug = 'prism-01-a-name-worth-keeping';

update public.tiles
set tile_description = $desc$Your Maker's Mark is the signature that goes on everything you make here. This is the tool that lets you use it — a holder for the Delrin stamp you cut in Void.

Design a holder that fits your stamp (1.25" diameter × 0.2" deep recess) and feels right in your hand — something you'd actually reach for, not something you'd leave in a drawer. The holder is how you sign your work. Make it worth picking up.

The outer shape, the weight, the feel, the form — all yours. The only constraint is the recess that holds the stamp and the hand that holds the holder.

One thought worth sitting with: if you design the recess so the stamp sits flush and reversible, you get two marks for free — the stamp face for pressing into soft material, and the back of the stamp resting in the recess for embossing. A positive and a negative. Both are your mark. Whether you build for that or not is your call.

Make it represent you. Make it special. A tube that fits is not enough.$desc$
where slug = 'forge-01-marks-home';
