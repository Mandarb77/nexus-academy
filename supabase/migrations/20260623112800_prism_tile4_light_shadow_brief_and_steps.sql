-- Prism Tile 4 · Light and Shadow: quest brief + ten checklist steps.

update public.tiles
set
  tile_description = $desc$Every object you've made so far looks the same in any light. This one doesn't.

The laser can cut and engrave at depths and densities that only reveal themselves under specific light conditions — a raking light that catches engraved texture, a backlit panel where the cut areas glow and the solid areas don't, a shadow box where the depth of the relief changes what's visible as the sun moves. The object is designed for a specific place and a specific quality of light. In that light, it's the thing you intended. In any other light, it's just a piece of wood or acrylic.

This requires knowing where the object is going to live. A desk lamp that rakes across from the left. A window that lets afternoon light through. A room where the overhead light is diffuse and flat. The place and the light are part of the design brief — name them on the Patent before you start designing, not after.$desc$,
  steps = $steps$[
    {"description": "Name the person, the specific place the object will live, and the light condition you're designing for — write all three in your journal before opening any software.", "requiresApproval": false},
    {"description": "Visit or observe that place at the time of day when the light condition is right. Study how the light moves across surfaces. What angles, what intensity, what direction?", "requiresApproval": false},
    {"description": "Decide how your object will use that light — backlit, raking, reflected, cast shadow. The material choice follows from this decision.", "requiresApproval": false},
    {"description": "Sketch the design knowing the light condition. What cuts glow? What engraved areas catch shadow? What depths matter?", "requiresApproval": false},
    {"description": "Build your design in Cuttle.xyz. Export as SVG.", "requiresApproval": false},
    {"description": "Set up your toolpath in Glowforge — cut depth and engrave settings both matter here.", "requiresApproval": false},
    {"description": "Test cut on scrap in the same material. Bring the test piece to the actual location and check it under the actual light condition. Does it do what you intended?", "requiresApproval": false},
    {"description": "Adjust depth, density, or design based on what you see in the real light.", "requiresApproval": false},
    {"description": "Cut your final piece.", "requiresApproval": false},
    {"description": "Photograph the object in the light condition it was designed for, with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'prism-04-light-and-shadow';
