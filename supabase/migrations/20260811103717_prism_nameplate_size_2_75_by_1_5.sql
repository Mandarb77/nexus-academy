-- Prism Tile 1 ("A Name Worth Keeping"): wall-board nameplate blank is 2.75" × 1.5".
-- Earlier copy said 2.5" × 1.1"; students were cutting to the wrong size.
-- Update both the tile_description blurb and every steps[].description that still
-- embeds the old dimensions so packet / checklist text stays consistent.

update public.tiles
set
  tile_description = replace(
    tile_description,
    '2.5" × 1.1"',
    '2.75" × 1.5"'
  ),
  steps = (
    select coalesce(
      jsonb_agg(
        jsonb_set(
          step,
          '{description}',
          to_jsonb(
            replace(
              step->>'description',
              '2.5" × 1.1"',
              '2.75" × 1.5"'
            )
          )
        )
        order by ord
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(coalesce(public.tiles.steps, '[]'::jsonb))
      with ordinality as source(step, ord)
  )
where slug = 'prism-01-a-name-worth-keeping';
