-- Supply page content refresh: tier subtitles, tardy pass, Craft shelf replacement.
-- gate_requirement already exists on shop_items (048_shop_catalog_baseline.sql).

-- ---------------------------------------------------------------------------
-- Tier headers (subtitle only; Convenience → “Conveniences” in UI via displayShelfTitle)
-- ---------------------------------------------------------------------------

update public.shop_tiers
set subtitle = 'Barry stocks it. Fran prices it. Neither of them is judging you.'
where name = 'Convenience';

update public.shop_tiers
set subtitle = 'The good stuff. You''ve earned the right to ask for it.'
where name = 'Craft';

update public.shop_tiers
set subtitle = 'Leave something behind.'
where name = 'Legacy';

-- ---------------------------------------------------------------------------
-- Tardy pass — price + subtitle (flavor_text)
-- ---------------------------------------------------------------------------

update public.shop_items
set
  price_gold = 50,
  flavor_text = 'Arrive late once, under 15 minutes, with no tardy mark. You do the math on whether it was worth it.'
where item_key = 'one_tardy_pass_under_15';

-- ---------------------------------------------------------------------------
-- Craft tier — remove legacy SKUs, insert four new rows
-- ---------------------------------------------------------------------------

delete from public.shop_items
where item_key in (
  'premium_material_voucher_self',
  'premium_material_voucher_classmate',
  'machine_priority_class_period',
  'sponsor_community_quest_materials',
  'commission_token'
);

insert into public.shop_items (
  item_key, name, description, tier_id, price_gold, is_active, flavor_text,
  is_locked, display_order, max_purchases_per_chicago_school_day,
  convenience_band, stock_per_semester, gate_requirement
)
values
  (
    'curly_maple_session',
    'Curly maple session',
    'A board of curly maple, yours for one project. Fran keeps it somewhere. Barry won''t say where. Ask Mr. Cook.',
    (select id from public.shop_tiers where name = 'Craft'),
    35, true, 'Requires Void Gate 3.', true, 10, null,
    null, null, 'Void Gate 3'
  ),
  (
    'evening_lab_session',
    'Evening lab session',
    'One evening study hall in the lab, tools available, no class running. Schedule it with Mr. Cook first — then go finish what you started.',
    (select id from public.shop_tiers where name = 'Craft'),
    30, true, 'Coordinate with Mr. Cook before redeeming.', false, 20, null,
    null, null, null
  ),
  (
    'filament_selection',
    'Filament selection',
    'Any combination of filament colors for one print run. Glow in the dark, carbon fiber, silk, rainbow — whatever serves the project.',
    (select id from public.shop_tiers where name = 'Craft'),
    25, true, 'Requires Forge Gate.', true, 30, null,
    null, null, 'Forge Gate 3'
  ),
  (
    'twenty_dollar_run',
    'The $20 Run',
    'Tell Mr. Cook what you need. He''ll get it. One item, up to $20, for a project that''s actually going somewhere.',
    (select id from public.shop_tiers where name = 'Craft'),
    40, true, 'Mr. Cook has final say. Ask while the project is still alive.', false, 40, null,
    null, null, null
  )
on conflict (item_key) do update set
  name = excluded.name,
  description = excluded.description,
  tier_id = excluded.tier_id,
  price_gold = excluded.price_gold,
  is_active = excluded.is_active,
  flavor_text = excluded.flavor_text,
  is_locked = excluded.is_locked,
  display_order = excluded.display_order,
  max_purchases_per_chicago_school_day = excluded.max_purchases_per_chicago_school_day,
  convenience_band = excluded.convenience_band,
  stock_per_semester = excluded.stock_per_semester,
  gate_requirement = excluded.gate_requirement;
