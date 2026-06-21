-- Add six teacher-gated Craft shelf items for Fran and Barry's Supply Co.
-- Descriptions intentionally keep line breaks and *handwritten* spans for the Supply renderer.

with craft_tier as (
  select id from public.shop_tiers where name = 'Craft'
), new_items as (
  select * from (values
    (
      'story_wood',
      'Story Wood',
      $desc$Card on the barn wood shelf, in Fran's handwriting:

*Each piece tagged. Read the tag. The wood was somewhere first.*

Fran, at the counter, writing Marcus into the ledger.

(Barry, from the back: "Good.")

One piece of barn wood, for one project. Origin tag on the back.$desc$,
      35,
      50
    ),
    (
      'live_edge_wood_blank',
      'Live-edge wood blank',
      $desc$Fran: "Marcus is going live-edge."

(Barry, from the back: "Bark on or bark off?")

Fran: "He'll decide."

Barry: "If it's a finished piece for inside — bark off. It'll crack, and it'll bring bugs. If it's rustic and going outside, leave it on. Up to him."

One piece of live-edge wood. Bark is a choice. Make it before you start cutting.$desc$,
      50,
      60
    ),
    (
      'leather_offcut',
      'Leather offcut',
      $desc$Fran: "Marcus is in the leather bin."

(Barry, from the back: "Real leather. Not vegan. Not bonded. Real.")

Fran: "Barry."

Barry: "Just saying."

Fran writes Marcus into the ledger.

(Barry, from the back: "Tell him not to waste it. Leather doesn't grow back fast.")

(Fran: "It grows back at the same rate as before, Barry.")

(Barry: "It does not grow back fast.")

One leather offcut, for one project. Pieces are in the bin — bigger ones at the back.$desc$,
      30,
      70
    ),
    (
      'specialty_filament_voucher',
      'Specialty filament voucher',
      $desc$Small note pinned by the filament shelf, in Fran's handwriting:

*Specialty filament — 40 gold per spool. Pick from what's on the shelf.*

(Barry, from the back: "The glow-in-the-dark stuff fades after about a year, kid. Just so you know.")$desc$,
      40,
      80
    ),
    (
      'personal_project_pass',
      'Personal project pass',
      $desc$Card on the counter, in Fran's handwriting:

*Personal project pass — 30 gold. Standard materials, finishes, hardware all included. Premium materials (barn wood, live-edge, leather, specialty filament) are separate. Gifts don't need this — gifts pull free from workshop stock.*

Fran, at the counter, writing Marcus into the ledger: "Personal project. Got it."

(Barry, from the back: "What's he making?")

(Fran: "He didn't say.")

(Barry: "Fair enough.")$desc$,
      30,
      90
    ),
    (
      'fran_barry_supply_apparel',
      'Fran and Barry''s Supply Co. apparel',
      $desc$Fran: "Marcus is getting apparel."

(Barry comes out from the back.)

Barry: "Hoodie or apron?"

Fran: "Hoodie."

Barry: "Dark green looks good on him."

Fran: "Barry."

Barry: "It's an observation, Fran."

(Fran writes Marcus into the pre-order book.)

Fran: "Order goes in April. He'll have it mid-May."

Barry: "Once it's yours, it's yours."

Pre-order: hoodie (dark green) or canvas apron, both with *Fran and Barry's Supply Co.* in cream lettering. April order, May delivery. Limited stock.$desc$,
      250,
      100
    )
  ) as v(item_key, name, description, price_gold, display_order)
)
insert into public.shop_items (
  item_key, name, description, tier_id, price_gold, is_active, flavor_text,
  is_locked, display_order, max_purchases_per_chicago_school_day,
  convenience_band, stock_per_semester, gate_requirement
)
select
  new_items.item_key,
  new_items.name,
  new_items.description,
  craft_tier.id,
  new_items.price_gold,
  true,
  null,
  true,
  new_items.display_order,
  null,
  null,
  null,
  'Mr. Cook''s call on this one. Talk to him.'
from new_items
cross join craft_tier
on conflict (item_key) do update
set
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

update public.shop_items
set gate_requirement = 'Mr. Cook''s call on this one. Talk to him.'
from public.shop_tiers
where public.shop_items.tier_id = public.shop_tiers.id
  and public.shop_tiers.name = 'Craft'
  and public.shop_items.is_locked = true
  and public.shop_items.gate_requirement is not null
  and public.shop_items.gate_requirement is distinct from 'Mr. Cook''s call on this one. Talk to him.';
