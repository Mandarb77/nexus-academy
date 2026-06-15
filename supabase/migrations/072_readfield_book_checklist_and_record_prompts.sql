-- The Readfield Book: checklist steps + Record panel (tab iii) prompt overrides.
-- Panel iii copy was hardcoded in PatentLedger; per-tile overrides live in tiles.record_prompts.
-- Extra Record row "Did it land?" persists to patents.field_7.

alter table public.tiles
  add column if not exists record_prompts jsonb;

comment on column public.tiles.record_prompts is
  'Optional Record panel rows [{ rowNum, field, label, hint?, required?, placeholder?, multiline? }]. Null = default patent copy.';

alter table public.patents
  add column if not exists field_7 text;

comment on column public.patents.field_7 is
  'Optional Record panel answer for tile-specific extra row (e.g. Did it land?).';

update public.tiles
set steps = $steps$[
  {"description": "Contact the Readfield teacher — email or visit. Find out what the class loves, what age they are, what stories they know.", "requiresApproval": false},
  {"description": "Write in your journal what you learned from that conversation before the group designs anything.", "requiresApproval": false},
  {"description": "As a group, agree on the story and the mechanism before anyone opens Cricut Design Space.", "requiresApproval": false},
  {"description": "Prototype the pop-up mechanism on scrap paper. Does it survive being opened and closed twenty times?", "requiresApproval": false},
  {"description": "Divide the pages among the group. Each person owns their page's mechanism and cuts it.", "requiresApproval": false},
  {"description": "Assemble the full book and test it as a group — every page, every mechanism, in order.", "requiresApproval": false},
  {"description": "Fix what breaks. Test again.", "requiresApproval": false},
  {"description": "Coordinate the visit with Mr. Cook before the book leaves the workshop.", "requiresApproval": false},
  {"description": "Photograph the group with the finished book before the visit.", "requiresApproval": false}
]$steps$::jsonb,
record_prompts = $prompts$[
  {
    "rowNum": "v",
    "field": "field_3",
    "label": "What did you make, and what was your part in it?",
    "hint": "This was a group project. Name what you designed and built specifically.",
    "required": true
  },
  {
    "rowNum": "vi",
    "field": "field_4",
    "label": "What failed, and what did you change?",
    "required": true
  },
  {
    "rowNum": null,
    "field": "field_7",
    "label": "Did it land?",
    "hint": "What actually happened when you read it to the class? Did the kids lean forward? Did a mechanism surprise them? Did someone ask to open it again? If the teacher sent a note or email afterward, paste it here or describe what they said.",
    "required": true
  },
  {
    "rowNum": "vii",
    "field": "field_5",
    "label": "Maine connection?",
    "hint": "Optional — a place, a person, a tradition this connects to.",
    "required": false,
    "placeholder": "e.g. It's modeled on the gray wolves at the Maine Wildlife Park in Gray."
  },
  {
    "rowNum": "viii",
    "field": "field_6",
    "label": "Who taught you?",
    "hint": "Optional — a person who showed you a technique or helped you think it through.",
    "required": false,
    "placeholder": "e.g. Ms. Rivera showed me how to mirror vinyl before cutting.",
    "multiline": false
  }
]$prompts$::jsonb
where slug = 'folded-tier2-readfield-book';
