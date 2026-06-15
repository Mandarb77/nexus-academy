-- Folded Path boss · The Most Beautiful Thing You Know How to Make: checklist + Record panel overrides.

update public.tiles
set steps = $steps$[
  {"description": "Name the thing you're making and who it's for in your journal before touching any tools.", "requiresApproval": false},
  {"description": "Name the technique or material that makes this the hardest thing you know how to make — write that down too.", "requiresApproval": false},
  {"description": "Prototype the most difficult part first. Don't start at the beginning if the middle is what might fail.", "requiresApproval": false},
  {"description": "Iterate until it's right, not until it's done.", "requiresApproval": false},
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
    "hint": "Not what failed. What you had to actually solve. The moment where you didn't know yet and then you did.",
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
where slug = 'folded-boss';
