-- Autopsy Hour: Convenience instant-buy (gold only), pick from the physical take-apart pile.
-- One SKU — device choice is in the room, not a shop variant. No cap, no duty queue, no WP.

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
  gate_requirement,
  fulfillment_kind
)
select
  'autopsy_hour',
  'Autopsy Hour',
  'Bring a friend and take apart a piece of dead electronics — screws out, no smashing. Forty minutes to find out what''s inside and how it worked. Pick one from the take-apart pile.',
  st.id,
  15,
  true,
  'Screws out. Barry''s watching.',
  $moment$Fran writes Marcus into the ledger. "Fifteen gold. Forty minutes. Pick one from the pile."
(Barry, from the back: "Screws out. No smashing.")
(Fran: "He means it.")$moment$,
  false,
  55,
  null,
  'in_room',
  null,
  null,
  'redemption'
from public.shop_tiers st
where st.name = 'Convenience'
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
  convenience_band = excluded.convenience_band,
  fulfillment_kind = excluded.fulfillment_kind;
