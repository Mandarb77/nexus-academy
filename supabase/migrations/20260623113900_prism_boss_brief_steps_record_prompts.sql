-- Prism Boss fight · What Deserves to Be Remembered: quest brief, checklist steps, Panel iii prompts.

update public.tiles
set
  tile_description = $desc$No tile tells you what to make. No checklist tells you the steps. This is the one where you walk up to Mr. Cook and pitch.

Name the thing. Name who it's for. Name a partner if you want one. Ninety seconds, out loud, no written proposal. He'll say yes, no, or sharpen it on the spot. If he says yes, you're cutting it.

By now you've made names permanent, preserved things that were fading, organized spaces that needed order, designed for light conditions and borrowed from the worlds of the people you care about. You know what the laser can do. The only thing standing between you and this tile is deciding what actually deserves to be remembered — and having the nerve to say it out loud.$desc$,
  steps = $steps$[
    {"description": "Decide what you're making, who it's for, and whether you want a partner — before you walk up to pitch.", "requiresApproval": false},
    {"description": "Pitch it. Ninety seconds. Name the thing, the recipient, the partner if any.", "requiresApproval": false},
    {"description": "If approved: plan your build. What material, what process, what order.", "requiresApproval": false},
    {"description": "Build it. Iterate as needed.", "requiresApproval": false},
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
      "hint": "Not what failed. What you actually solved.",
      "required": true
    },
    {
      "rowNum": "vii",
      "field": "field_5",
      "label": "Choose one — pick the question that's harder for you to answer. Answer that one.",
      "hint": "— What do you know how to make now that you didn't know how to make at the start of the year? · — What would you make next if you could make anything?",
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
where slug = 'prism-boss';
