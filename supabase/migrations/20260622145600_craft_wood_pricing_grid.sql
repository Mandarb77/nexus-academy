-- Craft Supply: size-based lumber pricing and per-piece wood/leather request rows.

with craft_tier as (
  select id from public.shop_tiers where name = 'Craft'
), grid_items as (
  select * from (values
    (
      'standard_lumber_small',
      'Standard Lumber — Small',
      'Poplar, pine, or soft maple. Small piece: under 6" on the longest side.',
      5,
      false,
      null::text,
      11
    ),
    (
      'standard_lumber_medium',
      'Standard Lumber — Medium',
      'Poplar, pine, or soft maple. Medium piece: 6" to 18" on the longest side.',
      10,
      false,
      null::text,
      12
    ),
    (
      'standard_lumber_large',
      'Standard Lumber — Large',
      'Poplar, pine, or soft maple. Large piece: over 18" on the longest side.',
      20,
      false,
      null::text,
      13
    ),
    (
      'top_shelf_lumber_small',
      'Top Shelf Lumber — Small',
      'Walnut, cherry, hard maple, or ash. Small piece: under 6" on the longest side.',
      15,
      true,
      'Mr. Cook''s call on this one. Talk to him.',
      14
    ),
    (
      'curly_maple_session',
      'Top Shelf Lumber — Medium',
      'Walnut, cherry, hard maple, or ash. Medium piece: 6" to 18" on the longest side.',
      30,
      true,
      'Mr. Cook''s call on this one. Talk to him.',
      15
    ),
    (
      'top_shelf_lumber_large',
      'Top Shelf Lumber — Large',
      'Walnut, cherry, hard maple, or ash. Large piece: over 18" on the longest side.',
      60,
      true,
      'Mr. Cook''s call on this one. Talk to him.',
      16
    ),
    (
      'inlay_stock_small',
      'Inlay Stock — Small',
      'Exotic accent piece such as purpleheart or padauk. Small precut: 2-4".',
      5,
      true,
      'Mr. Cook''s call on this one. Talk to him.',
      17
    ),
    (
      'inlay_stock_medium',
      'Inlay Stock — Medium',
      'Exotic accent piece such as purpleheart or padauk. Medium precut: 4-8".',
      12,
      true,
      'Mr. Cook''s call on this one. Talk to him.',
      18
    )
  ) as v(item_key, name, description, price_gold, is_locked, gate_requirement, display_order)
)
insert into public.shop_items (
  item_key, name, description, tier_id, price_gold, is_active, flavor_text,
  is_locked, display_order, max_purchases_per_chicago_school_day,
  convenience_band, stock_per_semester, gate_requirement
)
select
  grid_items.item_key,
  grid_items.name,
  grid_items.description,
  craft_tier.id,
  grid_items.price_gold,
  true,
  null,
  grid_items.is_locked,
  grid_items.display_order,
  null,
  null,
  null,
  grid_items.gate_requirement
from grid_items
cross join craft_tier
on conflict (item_key) do update
set
  name = excluded.name,
  description = excluded.description,
  tier_id = excluded.tier_id,
  price_gold = excluded.price_gold,
  is_active = excluded.is_active,
  is_locked = excluded.is_locked,
  display_order = excluded.display_order,
  gate_requirement = excluded.gate_requirement;

update public.shop_items
set
  description = 'Documented-origin offcut with origin tag. Priced per piece: 20-50 gold depending on size and provenance.',
  price_gold = 35,
  is_locked = true,
  gate_requirement = 'Mr. Cook''s call on this one. Talk to him.',
  display_order = 50
where item_key = 'story_wood';

update public.shop_items
set
  description = 'One live-edge wood blank. Priced per piece: 30-75 gold depending on size.',
  price_gold = 50,
  is_locked = true,
  gate_requirement = 'Mr. Cook''s call on this one. Talk to him.',
  display_order = 60
where item_key = 'live_edge_wood_blank';

update public.shop_items
set
  description = 'One leather offcut, for one project. Pieces are in the bin — bigger ones at the back.',
  price_gold = 30,
  is_locked = true,
  gate_requirement = 'Mr. Cook''s call on this one. Talk to him.',
  display_order = 70
where item_key = 'leather_offcut';
