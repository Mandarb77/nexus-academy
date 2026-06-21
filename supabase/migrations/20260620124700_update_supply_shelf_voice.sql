-- Supply shelf voice pass: update tier subtitles and locked item gate copy.

update public.shop_tiers
set subtitle = case lower(name)
  when 'convenience' then 'Fran''s at the counter. Barry''s in the back. They''ve seen all of this before.'
  when 'craft' then 'These are behind the counter. Fran will get them down if Mr. Cook says it''s time.'
  when 'legacy' then 'Leave something behind.'
  else subtitle
end
where lower(name) in ('convenience', 'craft', 'legacy');

update public.shop_items
set gate_requirement = 'Mr. Cook''s call on this one. Talk to him.'
where is_locked = true;
