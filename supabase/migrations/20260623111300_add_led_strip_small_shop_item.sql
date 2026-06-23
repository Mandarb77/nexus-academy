-- Craft Supply: teacher-gated LED strip item with Fran/Barry purchase voice.

insert into public.shop_items (
  item_key,
  name,
  description,
  tier_id,
  price_gold,
  is_active,
  flavor_text,
  purchase_moment_text,
  is_locked,
  display_order,
  max_purchases_per_chicago_school_day,
  convenience_band,
  stock_per_semester,
  gate_requirement
)
values (
  'led_strip_small',
  'LED strip (small)',
  'One small LED strip for a project. Personal use — yours to keep.',
  (select id from public.shop_tiers where name = 'Craft'),
  20,
  true,
  null,
  $moment$Fran writes Marcus into the ledger.
(Barry, from the back: "What's he wiring it into?")
(Fran: "I didn't ask.")
(Barry: "Tell him not to run more than five volts through it. They don't tolerate twelve.")$moment$,
  true,
  19,
  null,
  null,
  null,
  'Mr. Cook''s call on this one. Talk to him.'
)
on conflict (item_key) do update
set
  name = excluded.name,
  description = excluded.description,
  tier_id = excluded.tier_id,
  price_gold = excluded.price_gold,
  is_active = excluded.is_active,
  flavor_text = excluded.flavor_text,
  purchase_moment_text = excluded.purchase_moment_text,
  is_locked = excluded.is_locked,
  display_order = excluded.display_order,
  max_purchases_per_chicago_school_day = excluded.max_purchases_per_chicago_school_day,
  convenience_band = excluded.convenience_band,
  stock_per_semester = excluded.stock_per_semester,
  gate_requirement = excluded.gate_requirement;
