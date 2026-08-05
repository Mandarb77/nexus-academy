-- Prism Tile 4 · Light and Shadow: rewrite quest brief, one-line summary, and ten steps.
-- Content only — gating, WP/gold, Patent fields, and step count (10) unchanged.
--
-- Brief formatting: tile_description is plain text. PatentLedger renders it with
-- white-space: pre-line, so blank lines and • bullets keep list structure without HTML.

update public.tiles
set
  tile_description = $desc$Everything you've made so far looks basically the same whether it's sitting in a dark room or under a bright lamp. This one won't.

You've seen this before, even if you never thought about it. A jack-o'-lantern is boring in daylight and incredible at night. Blinds throw stripes across a wall in the afternoon and nothing at all at 9 p.m. Hold your phone flashlight flat against a wall and every scratch and bump jumps out — point it straight on and the wall looks smooth again. Light hitting a thing from a certain direction, at a certain time, is what makes it look like something.

People build for this on purpose, and the laser is one of the best tools for it:

• A cut-through mandala — thin wood or acrylic cut into a dense pattern. Flat and unremarkable lying on a table. Hang it in a window and it throws the whole pattern across the floor.
• A layered diorama — four or five panels, each cut with a different piece of a scene, stacked with gaps between them and lit from behind. Trees in front, hills behind, moon at the back. The gaps are what make it read as depth.
• An engraved portrait or map — thousands of tiny burned dots at different densities. Under flat overhead light it's a gray smudge. Under a lamp raking in from the side, the texture catches and the image appears.
• A shadow panel — deep cuts in a standing piece, positioned so the shadow it throws is the actual design, not the object itself.
• A lamp or luminary — a box or cylinder with a light inside, cut so the light escapes only where you decided it should.

The laser gives you three moves to work with: cut all the way through so light passes and glows, engrave shallow so lines only show when light comes in low from the side, or cut deep enough to throw real shadows that move as the sun does.

Here's the catch: it only works in the light you designed it for. Put it somewhere else and it's just a piece of wood.

So you have to know where it's going to live before you design it. A desk with a lamp on the left. A window that gets sun in the afternoon. A room where the light is flat and overhead. That place, and that light, are part of the assignment — name both on your Patent before you open any software, not after.$desc$,
  recipient_guidance = 'Design for one specific spot and one specific light — name both on the Patent.',
  steps = $steps$[
    {"description": "Name three things in your journal before you open anything: the person, the exact spot the object will sit, and the light you're designing for. All three, in writing.", "requiresApproval": false},
    {"description": "Go look at that spot at the time of day the light is right. Watch how it falls. Is it coming from the side, from behind, from above? Harsh or soft?", "requiresApproval": false},
    {"description": "Pick how your object uses that light: light shines through it, light rakes across it from the side, or it casts a shadow onto something else. Your material choice follows from this.", "requiresApproval": false},
    {"description": "Sketch it knowing the light. Which cut-through parts will glow? Which engraved parts will catch shadow? How deep does each need to be?", "requiresApproval": false},
    {"description": "Build the design in Cuttle.xyz. Export as SVG.", "requiresApproval": false},
    {"description": "Set up your toolpath in LightBurn. Both cut depth and engrave settings matter here — this isn't a \"cut and done\" job.", "requiresApproval": false},
    {"description": "Test on scrap in the same material. Then physically carry that test piece to the actual spot and look at it in the actual light. Does it do what you pictured?", "requiresApproval": false},
    {"description": "Fix what's off — deeper, shallower, denser, different design. Expect this step. Almost nobody nails it first try.", "requiresApproval": false},
    {"description": "Cut the real one.", "requiresApproval": false},
    {"description": "Photograph it in the light it was made for, with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'prism-04-light-and-shadow';
