-- Silicon Covenant COMMISSION: soften feedback/rejection language in brief and step 6 only.

update public.tiles
set
  tile_description = replace(
    tile_description,
    $old$At least one draft gets rejected. That's not a failure condition — it's the requirement. A recipient who says "this isn't quite right" and explains why is giving you something more valuable than a recipient who says "thanks, it's great." Design from their feedback, not around it.$old$,
    $new$You'll probably show them something that isn't quite right the first time. That's not a problem — it's the work. A recipient who tells you honestly what isn't working is giving you something more valuable than a recipient who says thanks and sets it on a shelf. If it happens, design from their feedback.$new$
  ),
  steps = jsonb_set(
    steps,
    '{5,description}',
    to_jsonb('Get their honest feedback. If they say it works perfectly, ask harder questions — "what would make it better for you?" Real recipients usually have something. Listen for it.'::text),
    false
  )
where slug = 'silicon-gate-commission';
