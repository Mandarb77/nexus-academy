# Patent form — raw field labels and helper text

Inventory of user-facing strings from the patent form components. Use this when rebuilding the patent UI for clarity and consistency.

**Source components**

| Component | Route | Quest types |
|---|---|---|
| `GenericPatentContent.tsx` | `/patent-custom/:tileId` | Quest Builder tiles, T-shirt, Void Tile 1 |
| `PersonalGamePiecePatentContent.tsx` | `/patent-game-piece/:tileId` | Forge game piece, Prism pop-up card |
| `StickerPatentContent.tsx` | `/patent-sticker/:tileId` | Folded Path sticker |

**Shared sub-components:** `EmpathyForm.tsx`, `PatentFlowBanner.tsx`, `FinalApprovalBanner.tsx`, `ApprovedQuestView.tsx`

---

## Step navigation (sidebar tabs)

### Generic patent

- Opening questions
- Checklist *(after plan submitted)*
- Final questions *(after checklist approved)*

### Game piece / sticker / pop-up

- Rail title: **Patent packet**
- 1. Plan questions
- 2. Checklist
- 3. Final questions

---

## Phase 1 — Plan / opening questions

### Section titles

| Variant | Title |
|---|---|
| Generic | **Your plan** |
| Game piece / sticker / pop-up | **Step 1 — What you're making** |

### Section helper text

| String | Used in |
|---|---|
| Answer both questions, then save. Your teacher will review before the checklist unlocks. | Generic |
| Answer both questions, then continue. Your text is kept when you move to the next steps. | Game piece, sticker, pop-up |

### Field 1 (`field_1`)

**Generic**

- Label: `Describe what you are going to make.` *
- Placeholder: `Your answer here`

**Game piece / pop-up / sticker**

- Label: `What are you going to make` *
- Placeholder (game piece): `One or two sentences — if you give size, use inches (max 1×1×2 inches).`
- Placeholder (pop-up): `Describe the pop-up card you will design — who it is for and the idea in one or two sentences.`
- Placeholder (sticker): `Describe your sticker design in one or two sentences.`

### Game piece only — size helper (Phase 1)

> Use **inches** only for sizes. Maximum footprint: **1 inch wide, 1 inch deep, 2 inches tall**.

### Field 2 — Empathy block (`EmpathyForm`)

**Fieldset legend**

> Who are you making this for, and why does it matter?

**Sub-fields**

| Label | Helper / hint | Placeholder | Required |
|---|---|---|---|
| Who are you making this for? | (a name or short description) | e.g. my younger sister, the school library, myself | * |
| Why does this matter to them? | (two or three sentences) | Your answer here | |
| What is one thing you know about this person that changed a decision you made while designing? | | Be specific — what did you learn about them, and what did you change because of it? | * |
| How did you learn what matters to them? | Pick any that are true — you do not need to check all of these. | — | checkboxes |

**Empathy checkboxes**

1. I thought carefully about what their daily life is like
2. I asked them directly what they need or want
3. Someone who knows them well told me something that shaped my design
4. I watched how they interact with similar objects or spaces
5. I made an earlier version and got feedback before finalizing
6. I imagined receiving this myself and asked honestly if I would use it

**Validation reference string** (used in error messages)

> What is one thing you know about this person…

### Phase 1 status banners

| Condition | Message |
|---|---|
| Plan pending (Generic) | ⏳ Plan submitted — waiting for teacher approval. The checklist unlocks once approved. |
| Plan approved (Generic) | ✓ Plan approved — opening answers are saved below (read-only). Use the Checklist tab to continue. |
| Plan pending (stepped) | Plan submitted — waiting for teacher approval. The checklist unlocks after your teacher approves. |
| Plan approved (stepped) | Plan approved — opening answers below are read-only. Open Step 2 (checklist) to continue. |

### Phase 1 buttons

| Button label | Condition |
|---|---|
| Saving… | submitting |
| Resubmit to teacher / Resubmit plan to teacher | plan returned |
| Save answers | plan exists, editable |
| Save and submit to teacher | Generic, new plan |
| Save and start checklist | stepped, new plan |

### Phase 1 helper text

| String | Condition |
|---|---|
| Saves your answers to your teacher. After they approve, you can start the checklist. | Generic, no plan yet |
| Saves your plan to your teacher. After they approve, you can start the checklist. | stepped, no plan yet |
| Continue to checklist → | Generic, plan submitted |

### Quest-specific guidance notes (Phase 1)

**Void Tile 1** (`VOID_TILE1_RECIPIENT_GUIDANCE`)

> Who is this for? A person or a pet counts. Pick someone you know well enough to design a profile silhouette or symbol — a teacher, teammate, family member, or your dog. Write at least two specific details about them before you open any CAM software. Generic coasters are not the goal.

**Pop-up card** (`POP_UP_CARD_RECIPIENT_GUIDANCE`)

> Who can you make this for? A teacher who has helped you. A staff member you want to thank — custodial staff, kitchen staff, and office staff all count and are often overlooked. A student who is new to the school. A classmate who did something worth celebrating. Day students may also make this for a family member. The rule: you must know something specific about this person that shapes your design.

---

## Phase 2 — Checklist

### Section titles

| Variant | Title |
|---|---|
| Generic | **Checklist** |
| Game piece / sticker / pop-up | **Step 2 — Workshop checklist** |

### Section helper text

- `{n} of {total} steps complete. Checkboxes save as you go.`
- Submit step 1 to your teacher first.
- Checklist unlocks after your teacher approves your plan.
- ⏳ Submitted — waiting for teacher approval
- 🔒 Approval checkpoint — your teacher reviews progress here. *(Generic, steps with `requiresApproval`)*

### Checklist submit

| Button | Variant |
|---|---|
| Submit checklist | Generic |
| Submit checklist for teacher review | Game piece, sticker |
| Submit for approval | Pop-up card |
| Submitting… | all |

**Helper after submit**

> After you submit, your teacher reviews your checklist and uploaded photo/video. Step 3 unlocks when they approve.

### Side panel (game piece only, Phase 2)

- Column title: **Your plan**
- Helper: Opening answers from step 1. Your teacher reviews them before the checklist unlocks.
- Read-only label: `What are you going to make`

### Upload step (last checklist item)

| Label | Context |
|---|---|
| Choose photo or video | Generic, game piece |
| Choose delivery photo | Pop-up card |
| Replace file | after upload |
| Uploading… | in progress |
| File uploaded — choose a new file to replace it. | after upload |
| Optional: add a **process** photo (work in progress). Shown under your finished shot with your patent answers. | Generic (image only) |
| Optional process photo (4:3) documenting your work in progress. | Game piece, sticker |
| Add process photo / Replace process photo | process upload |

### Game piece checklist resource buttons

- Join TinkerCAD class — code: 2XTJEL26G
- Open TinkerCAD Template
- Open locked base in TinkerCAD
- Read import note / Hide import note

**Import note**

> Use the **locked base** link above to open the game piece clip in TinkerCAD — copy it into your own design. You can also import a starting shape from **thingiverse.com** or **printables.com** and modify it to make it your own. Imported designs must be meaningfully changed — not just printed as-is.

### Pop-up card checklist resource links

- UniPopCards free SVG collection →
- 3axis.co laser cut cards →
- CutterCrafter popup card files →
- The Analytical Mommy Glowforge card →

**Bonus note** (`POP_UP_CARD_ORIGINAL_BONUS_NOTE`)

> Fully original designs not using any template may deserve extra gold — set the quest's gold value in the teacher Quest Builder to match what you award.

### Sticker checklist resource buttons

- Open Piskel
- Watch Piskel basics video here (link coming soon)
- Go to design.cricut.com
- Watch Cricut Design Space setup video here (link coming soon)

### Bonus completion callouts

**Game piece**

- Heading: **Bonus completion available**
- Body: This quest can be completed again for bonus WP as you improve your TinkerCAD skills. Each version must show clear improvement over the last. Document the differences in your patent packet.

**Sticker**

- Heading: **Bonus completion available**
- Body: This quest can be completed again for bonus WP with a new sticker design. Each version must show clear improvement or a different design direction. Document the differences in your patent packet.

### Checklist footer notes

**T-shirt** (`T_SHIRT_QUEST_CHECKLIST_FOOTER`)

> This quest can be completed again for bonus WP with a different recipient. Each version must show a new interview and a new design — not the same design on a different shirt.

**Void Tile 1** (`VOID_TILE1_CHECKLIST_FOOTER`)

> Tier 1 — Required (prototype). This is the first of three required Void quests. Stretch and later tiers stay locked until the full guild ships.

**Generic fallback resource button**

- `{resourceLabel} →` or `Open resource →`

---

## Phase 3 — Final / closing questions

### Section titles

| Variant | Title |
|---|---|
| Generic | **Closing questions** |
| Game piece / sticker / pop-up | **Step 3 — Final patent questions** |

### Section helper text

- Your answers save as you type. Submit when both are complete.
- Your teacher must approve the checklist in step 2 before this section unlocks.
- ⏳ Final application submitted — waiting for teacher approval

### Field 3 & 4

**Generic (`field_3`, `field_4`)**

| Field | Label | Placeholder |
|---|---|---|
| field_3 | What makes this work yours — where did you go beyond the example? * | Your answer here |
| field_4 | What failed and what did you change? * | Your answer here |

**Game piece / sticker / pop-up (`field_3`, `field_4`)**

| Field | Label | Placeholder | Input type |
|---|---|---|---|
| field_3 | How did you make it an original work? * | Your answer here | textarea |
| field_4 | What do you have to iterate? * | Your answer here | text |

### Phase 3 buttons

| Button | Context |
|---|---|
| Submit | Generic |
| Submit final application | Game piece, sticker |
| Submit for approval | Pop-up card |
| Submitting… | all |

### Back navigation

- ← Back to step 1
- ← Back to checklist

---

## Checklist step text (by quest)

### Personal game piece (`PERSONAL_GAME_PIECE_STEPS`)

1. Step 1 — Sketch your design on paper. Before opening any software draw at least one rough sketch of your game piece. What symbol or shape represents you as a maker? Your finished piece must be no larger than 1 inch wide, 1 inch deep, and 2 inches tall.
2. Step 2 — Join the TinkerCAD class and learn the basics. Class code: 2XTJEL26G. Then watch the intro video before you start building.
3. Step 3 — Build your design in TinkerCAD. Place objects, size them while keeping scale, and align them carefully. Use what you learned in the video.
4. Step 4 — Optional: Import a base from Thingiverse or Printables.
5. Step 5 — Check your dimensions in inches. Select your whole model and confirm it is no wider than 1 inch, no deeper than 1 inch, and no taller than 2 inches.
6. Step 6 — Show the teacher your design before printing. Export your STL and get approval before sending to the printer.
7. Step 7 — Print your piece. If the print fails document what went wrong in your patent packet and what you changed for version 2.
8. Step 8 — Upload a photo or video of your finished game piece.

### Sticker (`STICKER_STEPS`)

1. Step 1 — Design your sticker in Piskel. Create a pixel art design that represents something that matters to you.
2. Step 2 — Export your design correctly. Use the Export button and save as a zip file — this keeps the layers separate. Do not use screenshot or save image — use Export and zip only.
3. Step 3 — Install Cricut Design Space on your machine. Go to design.cricut.com and download the app for your computer.
4. Step 4 — Import your Piskel design into Cricut Design Space. Open Design Space, create a new project, and upload your exported image file.
5. Step 5 — Set up Print Then Cut. Select your design and choose Print Then Cut as the operation. This tells the Cricut to first print the sticker and then cut around it precisely.
6. Step 6 — Print on sticker paper. Send the design to the classroom printer with sticker paper loaded. Check that the registration marks print clearly — these are the black marks in the corners that the Cricut uses to find the edges.
7. Step 7 — Cut on the Cricut. Load the printed sticker paper onto the Cricut mat and run the cut. Watch it carefully on the first cut to make sure the registration marks are being read correctly. Try to find partners to share the sticker paper with so we don't waste materials.
8. Step 8 — Upload a photo or video of your finished sticker.

### Pop-up card (`POP_UP_CARD_STEPS`)

1. Step 1 — Interview your recipient or observe them. You do not have to tell them you are making them something. Watch and listen. Write down at least two specific things about them before opening any software — what they love, what makes them laugh, what most people do not notice about them. These go in your patent packet.
2. Step 2 — Choose your approach. Use the resource links below (UniPopCards, 3axis.co, CutterCrafter, The Analytical Mommy). Pick references that fit your design — or plan a fully original design with no template.
3. Step 3 — Set up your file in the Glowforge app. Go to app.glowforge.com and create a new design. Set material to 80lb Cardstock. Import your SVG. Set score lines to Score with speed maxed out. Set cut lines to Cut. Confirm both are correct before running anything.
4. Step 4 — Do a test cut on scrap cardstock. Run a small section of the design on scrap material first. Check that score lines fold cleanly and cut lines go all the way through. Do not skip this step.
5. Step 5 — Cut your card. Load your chosen colored cardstock. Run the full cut. If using multiple colors register carefully between cuts and do not move the cardstock.
6. Step 6 — Assemble the card. Fold all score lines before gluing anything. Dry fit the whole card first. Glue layer by layer from back to front. Let each layer dry before adding the next.
7. Step 7 — Write something inside. The card is not complete until something handwritten is inside. It must be specific to this person. It cannot be generic.
8. Step 8 — Deliver it and photograph the moment. Give the card in person. Take a photo of yourself with the recipient or of them holding the card. Upload the photo to your patent packet. The submit button stays off until a photo is uploaded.

### T-shirt (`T_SHIRT_QUEST_STEPS`)

1. Step 1 — Interview your recipient. Before opening any software sit down with the person you are making this for and ask them three questions: What colors do you love? What is something you care about that most people don't know? If you could wear one image or word every day what would it be? You are listening not designing yet.
2. Step 2 — Sketch your design on paper. Based on what you learned sketch at least two possible designs by hand. Show both to your recipient and ask which feels more like them. Let their answer change your design.
3. Step 3 — Install Cricut Design Space. Go to design.cricut.com and download the app for your device. Create a free account if you don't have one.
4. Step 4 — Watch the t-shirt tutorial video. Pay attention to how iron-on vinyl direction works — this is the step most people get wrong. *(Resource button: Watch t-shirt tutorial here)*
5. Step 5 — Build your design in Cricut Design Space. Create a new project and build your design from your sketch. Keep it simple — one strong image or word reads better than something complicated. Mirror your design before cutting — this is essential for iron-on vinyl.
6. Step 6 — Cut your design. Load your iron-on vinyl onto the Cricut mat shiny side down. Select iron-on vinyl as your material.
7. Step 7 — Press your design onto the shirt. Preheat the shirt for ten seconds to remove moisture. Position your design. Apply heat for 30 seconds at medium-high with firm pressure. Peel the carrier sheet while warm. Press again for ten seconds with the carrier sheet back on top.
8. Step 8 — Deliver it. Give the shirt to the person you made it for in person if possible. Take a photo of them receiving it for your patent packet.

### Void Tile 1 (`VOID_TILE1_STEPS`)

1. Step 1 — Name your recipient and capture specifics. Before any software, write who you are making this for (person or pet) and at least two details that will shape the profile design — a hobby, a posture, something only you noticed. These notes belong in your plan packet.
2. Step 2 — Sketch the profile and your maker's mark on paper. Your gift is a flat-profile piece: one clear silhouette or symbol from the side, plus a small maker's mark that shows you made it. Get a quick teacher check before you build the CAM file.
3. Step 3 — Choose one material. Pick a single stock for this quest (hardwood, plywood, or shop-approved acrylic). Write which material you are using and why it fits your recipient — one material only for this prototype.
4. Step 4 — Build your CAM file for a profile cut. Vector profile for the coaster footprint, include your maker's mark in the file, and set cut/score for your one material. Keep it coaster-sized — a flat gift, not a sculpture.
5. Step 5 — Test on scrap. Run a test profile cut on scrap of the same material. Check that the silhouette reads, the mark is legible, and edges are safe. Do not skip this step.
6. Step 6 — Cut the final coaster. Run your approved file on the real stock. Sand or finish only as allowed for that material in the shop.
7. Step 7 — Deliver it. Give the coaster to your recipient in person when you can. Take a photo of them with the gift (or holding it) for your patent packet.
8. Step 8 — Upload your delivery photo. Attach the delivery photo to your patent packet. Final submit stays locked until the photo is uploaded.

### Quest Builder tiles

Checklist steps come from the database (`tile.steps[].description`), not hardcoded.

---

## Status, validation & flow messages

### Realtime approval notices

- ✓ Plan approved — your checklist is now unlocked!
- ✓ Checklist approved — final questions are now unlocked!
- ↩ Step returned — check with your teacher and try again.
- ↩ Final application returned — check with your teacher and resubmit.

### Flow banners (`PatentFlowBanner`)

- Plan sent for teacher approval. Step 2 (checklist) is unlocked — checkboxes turn on after your teacher approves.
- Plan sent for teacher approval. Step 2 (checklist) appears next — checkboxes turn on after your teacher approves. *(sticker)*
- Updated plan resubmitted to your teacher.
- Your answers are saved. Continue to the checklist when you are ready.
- Checklist submitted for teacher review. Step 3 unlocks once your teacher approves.
- Checklist done — proceeding to step 3. *(Generic bypass mode)*
- Every checklist step is done. Submit the checklist below to unlock the final questions.
- Final application submitted — awaiting teacher approval.
- Quest complete. / Quest complete! Returning to skill tree…

### Validation errors

- Fill in both opening questions before continuing.
- Answer both questions before continuing.
- Fill in "What is one thing you know about this person…" before continuing.
- Fill in both closing questions before submitting.
- Fill in all patent fields before submitting.
- Complete all checklist steps first.
- Wait for your teacher to approve the checklist before submitting.
- Save your opening answers before submitting.
- No approved plan found. Submit your plan first and wait for teacher approval.
- Not signed in.
- A plan is already on file. Refresh the page.
- Upload your delivery photo in the checklist before submitting. *(pop-up)*
- This quest requires a photo (image file) for the delivery step. *(pop-up upload)*

### Loading / guard strings

- Loading patent from the database…
- Loading…
- Connect Supabase in `.env` to use this page.
- Quest tile not found. ← Back to skill tree
- This page is only for stepped patent quests (game piece or pop-up card).
- This page is only for the Design Your Personal Sticker tile.

---

## Page-level copy (wrappers)

**Game piece page subtitle**

> Step 1: answer both plan questions and submit for teacher approval. Step 2: after approval, complete and submit the checklist. Step 3: final two questions, then submit the quest.

**Sticker page** — same subtitle; title: `Design Your Personal Sticker`

**Custom page** — no subtitle; crumb: `Your quest`; title = tile skill name

**Breadcrumb labels**

- Patent application
- Your quest

---

## Post-approval read-only view (`ApprovedQuestView`)

**Banner**

- Quest approved!
- Your work and answers are saved below for reference.

**Sections**

- Your checklist
- Your answers
- Your finished work *(if upload exists)*

**Answer labels — Generic**

- What are you going to make?
- What makes this work yours — where did you go beyond the example?
- What failed and what did you change?

**Answer labels — Game piece / sticker / pop-up**

- What are you making?
- How did you make it an original work?
- What do you have to iterate?

**Repeat notes**

- Talk to your teacher to reset the checklist if you'd like to complete this quest again.
- This quest can be completed again for bonus WP — talk to your teacher to reset the checklist.

**Final approval banner** (`FinalApprovalBanner`)

- 🎉 Quest Approved!
- Workshop Points
- Gold
- Awesome! ✕

---

## Key label divergence (for rebuild planning)

The same four DB fields use **two different question sets**:

| DB field | Generic label | Game piece / sticker / pop-up label |
|---|---|---|
| field_1 | Describe what you are going to make. | What are you going to make |
| field_2 | Empathy block (shared) | Empathy block (shared) |
| field_3 | What makes this work yours — where did you go beyond the example? | How did you make it an original work? |
| field_4 | What failed and what did you change? | What do you have to iterate? |
