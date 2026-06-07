-- Convenience shelf: Sound-Effect Button, Decorate a Corner (unlimited stock, no gates).

insert into public.shop_items (
  item_key,
  name,
  description,
  tier_id,
  price_gold,
  is_active,
  flavor_text,
  is_locked,
  display_order,
  max_purchases_per_chicago_school_day,
  convenience_band,
  stock_per_semester,
  gate_requirement
)
values
  (
    'sound_effect_button',
    'Sound-Effect Button',
    'Design and install a sound-effect button on a workshop micro:bit. What sound is up to you - really. No Patent. No WP. The button either shows up in the shop or it doesn''t.',
    (select id from public.shop_tiers where name = 'Convenience'),
    7,
    true,
    null,
    false,
    50,
    null,
    'in_room',
    null,
    null
  ),
  (
    'decorate_workshop_corner',
    'Decorate a Corner',
    'Make a small sign or piece using the laser cutter or Cricut. It goes somewhere in the workshop — your call where. No Patent. No WP. The thing either appears or it doesn''t.',
    (select id from public.shop_tiers where name = 'Convenience'),
    7,
    true,
    null,
    false,
    60,
    null,
    'in_room',
    null,
    null
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
