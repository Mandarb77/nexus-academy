-- Prism: Make a Pop-Up Card for Someone at Kents Hill (20 WP, 10 gold; stepped patent UI in app).
insert into public.tiles (guild, skill_name, wp_value, gold_value, steps)
values (
  'Prism',
  'Make a Pop-Up Card for Someone at Kents Hill',
  20,
  10,
  '[
    {"description": "Step 1 — Interview your recipient or observe them. You do not have to tell them you are making them something. Watch and listen. Write down at least two specific things about them before opening any software — what they love, what makes them laugh, what most people do not notice about them. These go in your patent packet.", "requiresApproval": false},
    {"description": "Step 2 — Choose your approach. Use the resource links in the app (UniPopCards, 3axis.co, CutterCrafter, The Analytical Mommy). Pick references that fit your design — or plan a fully original design with no template.", "requiresApproval": false},
    {"description": "Step 3 — Set up your file in the Glowforge app. Go to app.glowforge.com and create a new design. Set material to 80lb Cardstock. Import your SVG. Set score lines to Score with speed maxed out. Set cut lines to Cut. Confirm both are correct before running anything.", "requiresApproval": false},
    {"description": "Step 4 — Do a test cut on scrap cardstock. Run a small section of the design on scrap material first. Check that score lines fold cleanly and cut lines go all the way through. Do not skip this step.", "requiresApproval": false},
    {"description": "Step 5 — Cut your card. Load your chosen colored cardstock. Run the full cut. If using multiple colors register carefully between cuts and do not move the cardstock.", "requiresApproval": false},
    {"description": "Step 6 — Assemble the card. Fold all score lines before gluing anything. Dry fit the whole card first. Glue layer by layer from back to front. Let each layer dry before adding the next.", "requiresApproval": false},
    {"description": "Step 7 — Write something inside. The card is not complete until something handwritten is inside. It must be specific to this person. It cannot be generic.", "requiresApproval": false},
    {"description": "Step 8 — Deliver it and photograph the moment. Give the card in person. Take a photo of yourself with the recipient or of them holding the card. Upload the photo to your patent packet.", "requiresApproval": false}
  ]'::jsonb
)
on conflict (guild, skill_name) do update set
  wp_value = excluded.wp_value,
  gold_value = excluded.gold_value,
  steps = excluded.steps;
