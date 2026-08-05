-- First-week Maker's Mark consistency: constraints video → Prism; Void rename +
-- Step 4 wording; Forge embossing aspirational; Void pointer instead of constraints video.

-- 1. Prism: take design-constraints pending video
update public.tiles
set ledger_resources = coalesce(ledger_resources, '[]'::jsonb) || $r$[
  {"label": "Mark design constraints (video — coming soon)", "pending": true}
]$r$::jsonb
where slug = 'prism-01-a-name-worth-keeping'
  and not exists (
    select 1
    from jsonb_array_elements(coalesce(ledger_resources, '[]'::jsonb)) e
    where e->>'label' ilike '%design constraints%'
  );

-- 1b. Void: drop constraints video; keep other resources. Pointer lives in brief (ledger
--     entries without a URL render as "coming soon" — wrong tone for a reminder).
update public.tiles
set
  skill_name = 'Tile 1 · The mark, made real',
  ledger_resources = (
    select coalesce(jsonb_agg(elem order by ord), '[]'::jsonb)
    from jsonb_array_elements(coalesce(ledger_resources, '[]'::jsonb)) with ordinality as t(elem, ord)
    where coalesce(elem->>'label', '') not ilike '%design constraints%'
  ),
  tile_description = $desc$This is your Maker's Mark — the signature that goes on everything you make here. Every piece you give away, every Patent you file, every slot you stamp on the wall. Get it right.

Your mark has to work at 1.25" diameter. Simple reads better than complicated at that size. Test it small before you cut it.

You already designed it in Cuttle.xyz (Prism). Export it as an SVG and bring it into Carbide Create for the toolpath. Mr. Cook will walk you through the Carbide side. Your job now is the cut — the physical Delrin stamp.

You already worked the cut constraints into this mark back in Prism — this is just your chance to confirm it's still good before it's permanent.$desc$,
  steps = jsonb_set(
    steps,
    '{3,description}',
    to_jsonb(
      'Check it at actual size — zoom to 100% on screen, or hold it up on paper. Does it still read? Adjust if not.'::text
    )
  )
where slug = 'void-01-marks-origin';

-- 2. Forge: aspirational embossing
update public.tiles
set tile_description = $desc$Your Maker's Mark is the signature that goes on everything you make here. This is the tool that lets you use it — a holder for the Delrin stamp you cut in Void.

Design a holder that fits your stamp (1.25" diameter × 0.2" deep recess) and feels right in your hand — something you'd actually reach for, not something you'd leave in a drawer. The holder is how you sign your work. Make it worth picking up.

The outer shape, the weight, the feel, the form — all yours. The only constraint is the recess that holds the stamp and the hand that holds the holder.

One thought worth sitting with: design the recess so the stamp sits flush and reversible, and you're set up for two marks — the face for stamping, the back for embossing. Ink-stamping works right away, by hand. Embossing into something tough like leather is harder — it takes real force, a mallet, and a holder built to survive being hit. That's a goal to design toward, not a given. A positive and a negative, both your mark — if you build the holder to earn it.

Make it represent you. Make it special. A tube that fits is not enough.$desc$
where slug = 'forge-01-marks-home';
