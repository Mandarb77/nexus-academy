-- Supply locked item note: shorten the teacher-gated wording.

update public.shop_items
set gate_requirement = 'Mr. Cook''s call on this one. Talk to him.'
where is_locked = true
  and gate_requirement is not null;
