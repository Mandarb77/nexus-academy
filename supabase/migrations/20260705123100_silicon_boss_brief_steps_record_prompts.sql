-- Silicon Covenant YOUR CALL (boss): quest brief, ten checklist steps, Record panel overrides.

update public.tiles
set
  tile_description = $desc$No tile tells you what to make. No checklist tells you what to sense. This is the one where you walk up to Mr. Cook and pitch.

Name the thing. Name who it's for. Name a partner if you want one. Ninety seconds, out loud, no written proposal. He'll say yes, no, or sharpen it on the spot. If he says yes, you're building it.

Silicon addition: before full approval, name the hardest part of what you're proposing and show you've already touched it — a sketch, a test circuit, a line of code that does the thing you're most unsure about. Electronics ambition isn't legible from a description alone.

Choose the platform that serves the recipient, not the platform that's comfortable. micro:bit if it fits. Arduino if the project demands it. ESP32 if the situation calls for it and the network supports it. Any platform is welcome here. The Patent sheet is the only artifact.

By now you've made devices that speak, listen, respond to combined conditions, and serve someone outside your circle. You know what Silicon can do. The only thing standing between you and this tile is deciding what's actually worth building — and having the nerve to say it out loud.$desc$,
  steps = $steps$[
    {"description": "Decide what you're making, who it's for, and whether you want a partner — before you walk up to pitch.", "requiresApproval": false},
    {"description": "Identify the hardest part of your proposed device. Touch it before the pitch — a sketch, a test circuit, a line of code that does the thing you're least sure about.", "requiresApproval": false},
    {"description": "Pitch it. Ninety seconds. Name the thing, the recipient, the partner if any, and the hardest part you've already touched.", "requiresApproval": false},
    {"description": "If approved: write your stated behavior sentence before building anything. \"This device will [do X] when [condition Y].\"", "requiresApproval": false},
    {"description": "Choose your platform based on what the project requires, not what you're most comfortable with.", "requiresApproval": false},
    {"description": "Build it. Iterate. The stated behavior sentence is still the standard.", "requiresApproval": false},
    {"description": "Test it in the context it's meant for — with the actual recipient if possible.", "requiresApproval": false},
    {"description": "Solder the final version.", "requiresApproval": false},
    {"description": "Give it to the person it's for.", "requiresApproval": false},
    {"description": "Photograph the finished device with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb,
  record_prompts = $prompts$[
    {
      "rowNum": "v",
      "field": "field_3",
      "label": "What did you make, and why was it worth making?",
      "hint": "Not what it is — why it deserved to exist. What would have been lost if you hadn't built it?",
      "required": true
    },
    {
      "rowNum": "vi",
      "field": "field_4",
      "label": "What was the hardest part — and how did you get past it?",
      "hint": "Not what failed. The thing you had to actually figure out. The moment where you didn't know yet and then you did.",
      "required": true
    },
    {
      "rowNum": "vii",
      "field": "field_5",
      "label": "Choose one — pick the question that's harder for you to answer. Answer that one.",
      "hint": "— What do you know how to build now that you didn't know how to build at the start of the year? · — What would you build next if you could build anything?",
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
where slug = 'silicon-boss';
