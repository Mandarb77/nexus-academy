-- Void Navigators Gate B · Imported 3D relief: quest brief + eleven checklist steps.

update public.tiles
set
  tile_description = $desc$Everything you've designed so far started as a flat vector — a line you drew that became a cut. This one starts somewhere else.

A topographic map. A photograph converted to depth. A 3D model of an object, a face, a place. Someone else made the data — your job is to bring it into Carbide Create, set up the 3D toolpaths that will execute it on the machine, and cut it faithfully enough that the result honors what the original was.

The challenge isn't designing — it's translating. The roughing pass removes material fast and leaves a stepped surface. The finishing pass follows the contours slowly and brings out the detail. The tool stepover controls how much detail survives. Too coarse and the surface looks machined. Fine enough and the wood starts to feel like the thing it's representing.

Choose your data because of the recipient. A topographic map of a place that matters to them. A relief of an image they'd recognize. Something that means something, executed in a material that will last.$desc$,
  steps = $steps$[
    {"description": "Name the person and what 3D data you're importing — write it in your journal. Why does this specific image or model matter to them?", "requiresApproval": false},
    {"description": "Find or create the 3D data — an STL file, a heightmap, or a relief image. Carbide Create Pro handles STL imports; standard Carbide Create handles heightmaps. Confirm which you have before proceeding.", "requiresApproval": false},
    {"description": "Import the data into Carbide Create. Check the orientation and scale — does it look right before you set up any toolpaths?", "requiresApproval": false},
    {"description": "Set up the roughing pass first. Choose a roughing tool and stepover appropriate for your material.", "requiresApproval": false},
    {"description": "Set up the finishing pass. Smaller stepover, smaller tool, slower feed. This pass is where the detail comes from.", "requiresApproval": false},
    {"description": "Simulate both passes. Watch carefully — the roughing pass should leave a stepped surface, the finishing pass should smooth it. If the finishing pass doesn't reach the detail you want, adjust the stepover.", "requiresApproval": false},
    {"description": "Choose your material. Grain direction affects how the finish pass reads — think about it before you cut.", "requiresApproval": false},
    {"description": "Run the roughing pass. Check the result before running the finishing pass.", "requiresApproval": false},
    {"description": "Run the finishing pass.", "requiresApproval": false},
    {"description": "Sand lightly if needed — not so much that you erase the relief.", "requiresApproval": false},
    {"description": "Photograph the finished piece with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'void-gate-b-3d-relief';
