-- Prism Tile 1 · Your Name on the Wall: quest brief + recipient hint only (steps unchanged).

update public.tiles
set
  tile_description = $desc$Your Maker's Mark already exists — you designed it, you cut it in Delrin. Now it goes to work.

Design a nameplate for your spot on the wall board: first name, last initial, and your mark, sized to 2.5" × 1.1", cut from 1/8" birch plywood on the Glowforge. This is your first laser cut. Settings, material, focus — Mr. Cook will walk you through it the first time.

The laser doesn't forgive mistakes the way a 3D printer does. Once it's cut, that's the wood. Get the layout right in Cuttle.xyz before you run anything.$desc$,
  recipient_guidance = 'You — your name and your mark, made permanent on the wall.'
where slug = 'prism-01-a-name-worth-keeping';
