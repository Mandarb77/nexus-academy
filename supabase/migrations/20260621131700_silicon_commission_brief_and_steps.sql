-- Silicon Covenant COMMISSION · the gate: quest brief + ten checklist steps.

update public.tiles
set
  tile_description = $desc$Every device you've built so far has gone to someone who already knew you — a friend, a family member, someone who would be generous with a version one.

This one goes to someone who can say no.

Find a person outside your immediate circle with a real need a device could meet. A teacher. A staff member. Someone at a community partner. Someone who will tell you honestly if what you built doesn't work for them — because they have no reason to be polite about it.

At least one draft gets rejected. That's not a failure condition — it's the requirement. A recipient who says "this isn't quite right" and explains why is giving you something more valuable than a recipient who says "thanks, it's great." Design from their feedback, not around it.

The component you choose has to serve them — not demonstrate what you've learned. If you're using a particular sensor because it's interesting, that's the wrong reason. If you're using it because their situation requires it, that's the right reason.

Arduino unlocks here if the project demands it.$desc$,
  steps = $steps$[
    {"description": "Find the recipient — someone outside your immediate circle with a real need. Contact them before designing anything.", "requiresApproval": false},
    {"description": "Learn the need. Ask questions. Take notes in your journal. What does their situation actually require?", "requiresApproval": false},
    {"description": "Write your stated behavior sentence before building: \"This device will [do X] when [condition Y], for [recipient] because [their specific need].\"", "requiresApproval": false},
    {"description": "Choose components that serve the need — not components that demonstrate your knowledge.", "requiresApproval": false},
    {"description": "Build a first version. Show it to the recipient.", "requiresApproval": false},
    {"description": "Get their honest feedback. If they say it works perfectly, ask harder questions — \"what would make it better for you?\" A rejected draft is required.", "requiresApproval": false},
    {"description": "Redesign based on their feedback. Build the second version.", "requiresApproval": false},
    {"description": "Solder the final version.", "requiresApproval": false},
    {"description": "Give it to the recipient.", "requiresApproval": false},
    {"description": "Photograph the finished device with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'silicon-gate-commission';
