-- Forge Boss fight · student proposed: quest brief, six checklist steps, Record panel overrides.

update public.tiles
set
  tile_description = $desc$No tile tells you what to make. No checklist tells you the steps. This is the one where you walk up to Mr. Cook and pitch.

Name the thing. Name who it's for. Name a partner if you want one. Ninety seconds, out loud, no written proposal. He'll say yes, no, or sharpen it on the spot. If he says yes, you're building it.

This works because by now you've made things, solved problems, and figured out what fails and what you do about it. The only thing standing between you and this tile is deciding what's actually worth making — and having the nerve to say it out loud.$desc$,
  steps = $steps$[
    {"description": "Decide what you're making, who it's for, and whether you want a partner — before you walk up to pitch.", "requiresApproval": false},
    {"description": "Pitch it. Ninety seconds. Name the thing, the recipient, the partner if any.", "requiresApproval": false},
    {"description": "If approved, plan your build — what tools, what materials, what order.", "requiresApproval": false},
    {"description": "Build it. Iterate as needed — this is the part you already know how to do.", "requiresApproval": false},
    {"description": "Test it in the context it's meant for.", "requiresApproval": false},
    {"description": "Photograph the finished piece with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb,
  record_prompts = $prompts$[
    {
      "rowNum": "v",
      "field": "field_3",
      "label": "What did you make, and why was it worth making?",
      "hint": "Not what it is — why it deserved to exist. What would have been lost if you hadn't made it?",
      "required": true
    },
    {
      "rowNum": "vi",
      "field": "field_4",
      "label": "What's the hardest thing you figured out — and how did you figure it out?",
      "hint": "Not what failed. What you had to actually solve.",
      "required": true
    },
    {
      "rowNum": "vii",
      "field": "field_5",
      "label": "Choose one — pick the question that's harder for you to answer. Answer that one.",
      "hint": "What do you know how to make now that you didn't know how to make at the start of the year? · What would you make next if you could make anything?",
      "required": true
    },
    {
      "rowNum": "viii",
      "field": "field_7",
      "label": "Did it land?",
      "hint": "What happened when you gave it away? What did you see?",
      "required": true
    }
  ]$prompts$::jsonb
where slug = 'forge-boss';
