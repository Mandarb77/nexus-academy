import type { StepConfig } from '../types/tile'

/** Must match `tiles.skill_name` in migration 034. */
export const T_SHIRT_QUEST_SKILL_NAME = 'Design a T-Shirt for Someone In the Room'

export const T_SHIRT_QUEST_CHECKLIST_FOOTER =
  'This quest can be completed again for bonus WP with a different recipient. Each version must show a new interview and a new design — not the same design on a different shirt.'

/** Same checklist as `034_t_shirt_quest_tile.sql` — used when DB `steps` is missing. */
export const T_SHIRT_QUEST_STEPS: StepConfig[] = [
  {
    description:
      'Step 1 — Interview your recipient. Before opening any software sit down with the person you are making this for and ask them three questions: What colors do you love? What is something you care about that most people don\'t know? If you could wear one image or word every day what would it be? You are listening not designing yet.',
    requiresApproval: false,
  },
  {
    description:
      'Step 2 — Sketch your design on paper. Based on what you learned sketch at least two possible designs by hand. Show both to your recipient and ask which feels more like them. Let their answer change your design.',
    requiresApproval: false,
  },
  {
    description:
      'Step 3 — Install Cricut Design Space. Go to design.cricut.com and download the app for your device. Create a free account if you don\'t have one.',
    requiresApproval: false,
  },
  {
    description:
      'Step 4 — Watch the t-shirt tutorial video. Pay attention to how iron-on vinyl direction works — this is the step most people get wrong.',
    requiresApproval: false,
    resourceUrl: 'https://www.youtube.com/watch?v=vdVMdhtRL7w',
    resourceLabel: 'Watch t-shirt tutorial here',
  },
  {
    description:
      'Step 5 — Build your design in Cricut Design Space. Create a new project and build your design from your sketch. Keep it simple — one strong image or word reads better than something complicated. Mirror your design before cutting — this is essential for iron-on vinyl.',
    requiresApproval: false,
  },
  {
    description:
      'Step 6 — Cut your design. Load your iron-on vinyl onto the Cricut mat shiny side down. Select iron-on vinyl as your material.',
    requiresApproval: false,
  },
  {
    description:
      'Step 7 — Press your design onto the shirt. Preheat the shirt for ten seconds to remove moisture. Position your design. Apply heat for 30 seconds at medium-high with firm pressure. Peel the carrier sheet while warm. Press again for ten seconds with the carrier sheet back on top.',
    requiresApproval: false,
  },
  {
    description:
      'Step 8 — Deliver it. Give the shirt to the person you made it for in person if possible. Take a photo of them receiving it for your patent packet.',
    requiresApproval: false,
  },
]
