-- Prism Tile 1: replace the pending "coming soon" constraints video with the real URL.
-- Single statement so `supabase db query --file` can apply it.

update public.tiles t
set ledger_resources = (
  with src as (
    select elem, ord
    from jsonb_array_elements(coalesce(t.ledger_resources, '[]'::jsonb))
      with ordinality as x(elem, ord)
  ),
  replaced as (
    select
      case
        when elem->>'label' ilike '%design constraints%'
          or elem->>'url' = 'https://youtu.be/aOeer7tvEh0'
        then jsonb_build_object(
          'label', 'Mark design constraints',
          'url', 'https://youtu.be/aOeer7tvEh0'
        )
        else elem
      end as elem,
      ord
    from src
  ),
  ensured as (
    select elem, ord from replaced
    union all
    select
      jsonb_build_object(
        'label', 'Mark design constraints',
        'url', 'https://youtu.be/aOeer7tvEh0'
      ),
      1000
    where not exists (
      select 1 from replaced r
      where r.elem->>'url' = 'https://youtu.be/aOeer7tvEh0'
         or r.elem->>'label' ilike '%design constraints%'
    )
  )
  select coalesce(jsonb_agg(elem order by ord), '[]'::jsonb)
  from ensured
)
where slug = 'prism-01-a-name-worth-keeping';
