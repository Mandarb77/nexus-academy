-- Move long Fran/Barry Craft scenes out of card descriptions and into purchase moments.

with updates as (
  select * from (values
    (
      'story_wood',
      'One piece of barn wood, for one project. Origin tag on the back.',
      $moment$Card on the barn wood shelf, in Fran's handwriting:

*Each piece tagged. Read the tag. The wood was somewhere first.*

Fran, at the counter, writing Marcus into the ledger.

(Barry, from the back: "Good.")

One piece of barn wood, for one project. Origin tag on the back.$moment$
    ),
    (
      'live_edge_wood_blank',
      'One piece of live-edge wood. Bark is a choice. Make it before you start cutting.',
      $moment$Fran: "Marcus is going live-edge."

(Barry, from the back: "Bark on or bark off?")

Fran: "He'll decide."

Barry: "If it's a finished piece for inside — bark off. It'll crack, and it'll bring bugs. If it's rustic and going outside, leave it on. Up to him."

One piece of live-edge wood. Bark is a choice. Make it before you start cutting.$moment$
    ),
    (
      'leather_offcut',
      'One leather offcut, for one project. Pieces are in the bin — bigger ones at the back.',
      $moment$Fran: "Marcus is in the leather bin."

(Barry, from the back: "Real leather. Not vegan. Not bonded. Real.")

Fran: "Barry."

Barry: "Just saying."

Fran writes Marcus into the ledger.

(Barry, from the back: "Tell him not to waste it. Leather doesn't grow back fast.")

(Fran: "It grows back at the same rate as before, Barry.")

(Barry: "It does not grow back fast.")

One leather offcut, for one project. Pieces are in the bin — bigger ones at the back.$moment$
    ),
    (
      'specialty_filament_voucher',
      'Specialty filament — 40 gold per spool. Pick from what''s on the shelf.',
      $moment$Small note pinned by the filament shelf, in Fran's handwriting:

*Specialty filament — 40 gold per spool. Pick from what's on the shelf.*

(Barry, from the back: "The glow-in-the-dark stuff fades after about a year, kid. Just so you know.")$moment$
    ),
    (
      'personal_project_pass',
      'Standard materials, finishes, hardware all included. Premium materials separate. Gifts don''t need this.',
      $moment$Card on the counter, in Fran's handwriting:

*Personal project pass — 30 gold. Standard materials, finishes, hardware all included. Premium materials (barn wood, live-edge, leather, specialty filament) are separate. Gifts don't need this — gifts pull free from workshop stock.*

Fran, at the counter, writing Marcus into the ledger: "Personal project. Got it."

(Barry, from the back: "What's he making?")

(Fran: "He didn't say.")

(Barry: "Fair enough.")$moment$
    ),
    (
      'fran_barry_supply_apparel',
      'Hoodie or apron. April order, May delivery. Once it''s yours, it''s yours.',
      $moment$Fran: "Marcus is getting apparel."

(Barry comes out from the back.)

Barry: "Hoodie or apron?"

Fran: "Hoodie."

Barry: "Dark green looks good on him."

Fran: "Barry."

Barry: "It's an observation, Fran."

(Fran writes Marcus into the pre-order book.)

Fran: "Order goes in April. He'll have it mid-May."

Barry: "Once it's yours, it's yours."

Pre-order: hoodie (dark green) or canvas apron, both with *Fran and Barry's Supply Co.* in cream lettering. April order, May delivery. Limited stock.$moment$
    )
  ) as v(item_key, description, flavor_text)
)
update public.shop_items
set
  description = updates.description,
  flavor_text = updates.flavor_text
from updates
where public.shop_items.item_key = updates.item_key;
