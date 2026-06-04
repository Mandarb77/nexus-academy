-- Seed catalog as on production (byte-stable copy), remove phone SKUs, catalog-driven buy RPC.

-- ---------------------------------------------------------------------------
-- Tiers (stable names; ids assigned on first insert)
-- ---------------------------------------------------------------------------

insert into public.shop_tiers (name, subtitle, sort_order)
values
  ('Convenience', 'Do you really want to advance the Forgetting? Really?', 1),
  ('Craft', 'Make your Creations more Awesome.', 2),
  ('Legacy', 'Leave Your Mark - Ensure Your Contribution to Holding Back the Forgetting is Remembered Forever', 3)
on conflict (name) do update set
  subtitle = excluded.subtitle,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Items (prod copy; phone excluded — hard delete below)
-- ---------------------------------------------------------------------------

insert into public.shop_items (
  item_key, name, description, tier_id, price_gold, is_active, flavor_text,
  is_locked, display_order, max_purchases_per_chicago_school_day,
  convenience_band, stock_per_semester, gate_requirement
)
values
  (
    'pick_class_playlist',
    'Pick the class playlist',
    'You choose the workshop playlist for one session.',
    (select id from public.shop_tiers where name = 'Convenience'),
    5, true, 'Keep it clean people - Free if you make it Classic Rock', false, 10, null,
    'in_room', null, null
  ),
  (
    'snack',
    'Snack',
    'One snack from the workshop stash.',
    (select id from public.shop_tiers where name = 'Convenience'),
    5, true, 'Sage appreciates your getting food elsewhere', false, 20, null,
    'in_room', null, null
  ),
  (
    'opt_out_cleaning_session',
    'Opt out of a cleaning session',
    'Skip one scheduled cleaning round when you need the time.',
    (select id from public.shop_tiers where name = 'Convenience'),
    5, true, 'It only takes a few minutes', false, 30, null,
    'in_room', null, null
  ),
  (
    'one_tardy_pass_under_15',
    'One tardy pass (under 15 minutes)',
    'Arrive late once, under 15 minutes, with no tardy mark.',
    (select id from public.shop_tiers where name = 'Convenience'),
    25, true, 'Slept in? Need 5 more minutes on Clash?', false, 40, null,
    'out_of_room', null, null
  ),
  (
    'premium_material_voucher_self',
    'Premium material voucher (self)',
    'Upgrade materials for your own project.',
    (select id from public.shop_tiers where name = 'Craft'),
    20, true, 'Make Magic Happen', false, 10, null,
    null, null, null
  ),
  (
    'premium_material_voucher_classmate',
    'Premium material voucher for a classmate',
    'Upgrade materials for another student''s project.',
    (select id from public.shop_tiers where name = 'Craft'),
    20, true, 'Help Make Magic Happen', false, 20, null,
    null, null, null
  ),
  (
    'machine_priority_class_period',
    'Machine priority for a class period',
    'Jump to the front of the machine queue for one class period.',
    (select id from public.shop_tiers where name = 'Craft'),
    15, true, 'Jump the line - Lightning Pass Anyone?', false, 30, null,
    null, null, null
  ),
  (
    'sponsor_community_quest_materials',
    'Sponsor a classmate''s community quest materials',
    'Cover materials for someone else''s community quest build.',
    (select id from public.shop_tiers where name = 'Craft'),
    25, true, 'Let''s Make Stuff Together', false, 40, null,
    null, null, null
  ),
  (
    'commission_token',
    'Commission Token',
    'A commission token authorizes you to hire a classmate to produce something for you.',
    (select id from public.shop_tiers where name = 'Craft'),
    25, true, null, false, 50, null,
    null, null, null
  ),
  (
    'dedicate_piece_to_gallery',
    'Dedicate a piece to the gallery',
    'Reserve a place in the studio gallery story — details unlock later.',
    (select id from public.shop_tiers where name = 'Legacy'),
    null, true, 'Mysterious unlock.', true, 10, null,
    null, null, null
  ),
  (
    'propose_new_tool_technique',
    'Propose a new tool or technique for the program',
    'Shape what the workshop teaches next — invitation only for now.',
    (select id from public.shop_tiers where name = 'Legacy'),
    null, true, 'Mysterious unlock.', true, 20, null,
    null, null, null
  ),
  (
    'name_technique_class_vocabulary',
    'Name a technique in the class vocabulary',
    'Immortalize a move, finish, or process in the class lexicon.',
    (select id from public.shop_tiers where name = 'Legacy'),
    null, true, 'Mysterious unlock.', true, 30, null,
    null, null, null
  ),
  (
    'permanent_archive_entry',
    'Permanent archive entry',
    'A lasting record of your contribution — not yet available for purchase.',
    (select id from public.shop_tiers where name = 'Legacy'),
    null, true, 'Mysterious unlock.', true, 40, null,
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

-- Hard delete phone SKUs (do not migrate).
delete from public.shop_items
where item_key in ('phone_time_one_class_period', 'phone_time', 'workshop_dj', 'free_tardy');

-- ---------------------------------------------------------------------------
-- Semester stock status (global pool per item; readable by all authenticated)
-- ---------------------------------------------------------------------------

create or replace function public.shop_stock_status(p_shop_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_sold integer;
begin
  select stock_per_semester into v_limit
  from public.shop_items
  where id = p_shop_item_id;

  if v_limit is null then
    return jsonb_build_object('limited', false);
  end if;

  select count(*)::integer into v_sold
  from public.gold_purchases gp
  where gp.shop_item_id = p_shop_item_id;

  return jsonb_build_object(
    'limited', true,
    'limit', v_limit,
    'sold', v_sold,
    'remaining', greatest(v_limit - v_sold, 0)
  );
end;
$$;

grant execute on function public.shop_stock_status(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Catalog-driven purchase
-- ---------------------------------------------------------------------------

create or replace function public.buy_shop_item(p_item_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.shop_items%rowtype;
  v_uid uuid := auth.uid();
  v_gold integer;
  v_today_eastern date;
  v_sold integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_item
  from public.shop_items
  where item_key = trim(p_item_key);

  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_item');
  end if;

  if not v_item.is_active then
    return jsonb_build_object('ok', false, 'error', 'not_for_sale');
  end if;

  if v_item.is_locked then
    return jsonb_build_object('ok', false, 'error', 'item_locked');
  end if;

  if v_item.price_gold is null or v_item.price_gold < 0 then
    return jsonb_build_object('ok', false, 'error', 'not_for_sale');
  end if;

  v_today_eastern := (now() at time zone 'America/New_York')::date;

  if coalesce(v_item.max_purchases_per_chicago_school_day, 0) >= 1 then
    if exists (
      select 1
      from public.gold_purchases gp
      where gp.student_id = v_uid
        and gp.shop_item_id = v_item.id
        and (gp.created_at at time zone 'America/New_York')::date = v_today_eastern
    ) then
      return jsonb_build_object('ok', false, 'error', 'daily_purchase_limit');
    end if;
  end if;

  if v_item.stock_per_semester is not null then
    select count(*)::integer into v_sold
    from public.gold_purchases gp
    where gp.shop_item_id = v_item.id;

    if v_sold >= v_item.stock_per_semester then
      return jsonb_build_object('ok', false, 'error', 'semester_stock_exhausted');
    end if;
  end if;

  select p.gold into v_gold from public.profiles p where p.id = v_uid for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_profile');
  end if;

  if v_gold < v_item.price_gold then
    return jsonb_build_object('ok', false, 'error', 'insufficient_gold');
  end if;

  update public.profiles set gold = gold - v_item.price_gold where id = v_uid;

  insert into public.gold_purchases (student_id, item_name, gold_cost, shop_item_id)
  values (v_uid, v_item.name, v_item.price_gold, v_item.id);

  insert into public.inventory (student_id, item_name, item_description, gold_cost)
  values (v_uid, v_item.name, v_item.description, v_item.price_gold);

  return jsonb_build_object(
    'ok', true,
    'item_name', v_item.name,
    'cost', v_item.price_gold,
    'new_gold', (select gold from public.profiles where id = v_uid)
  );
end;
$$;

grant execute on function public.buy_shop_item(text) to authenticated;
