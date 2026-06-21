-- Silicon Covenant WHEN AND: quest brief + eight checklist steps.

update public.tiles
set
  tile_description = $desc$HONEST MACHINE responded to one condition. This one responds to two.

Not a bigger device — more specific logic. A light sensor alone can tell you it's dark. A light sensor combined with a timer can tell you it's dark and it's been dark for ten minutes. That second device knows something the first one doesn't.

The combination has to come from the recipient, not from what sensors you happen to have available. What does this specific person's situation actually require two conditions to describe? Start there, then choose the sensors.$desc$,
  steps = $steps$[
    {"description": "Name the person and the two conditions their situation actually requires — write it in your journal. If you can't name why both conditions matter to them specifically, the combination isn't designed yet.", "requiresApproval": false},
    {"description": "Write your stated behavior sentence: \"This device will [do X] when [condition A] AND [condition B].\" More complex than HONEST MACHINE — make sure you can say it clearly before you build it.", "requiresApproval": false},
    {"description": "Build the combined logic in MakeCode. Test each condition separately first before testing them together.", "requiresApproval": false},
    {"description": "Upload and test the combined behavior. Does it trigger when both conditions are true? Does it stay quiet when only one is?", "requiresApproval": false},
    {"description": "Adjust thresholds until the behavior is reliable, not just occasional.", "requiresApproval": false},
    {"description": "Solder it.", "requiresApproval": false},
    {"description": "Give it to the person it's for.", "requiresApproval": false},
    {"description": "Photograph the finished device with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'silicon-04-when-and';
