-- Specialty filament becomes a dynamic-price teacher-gated request item.

update public.shop_items
set
  name = 'Specialty filament',
  description = 'Dynamic price: 10 gold base + 1 gold per 25g used, rounded up. Check grams in Bambu Studio after slicing.',
  price_gold = null,
  is_locked = true,
  gate_requirement = 'Mr. Cook''s call on this one. Talk to him.',
  flavor_text = $list$Glow-in-the-dark
Color-change (thermochromic)
Silk / shiny finish
Wood-blend
Multi-color (gradient or layered)
TPU Flexible
PETG
Any other non-standard filament stocked in the workshop$list$,
  display_order = 80
where item_key = 'specialty_filament_voucher';
