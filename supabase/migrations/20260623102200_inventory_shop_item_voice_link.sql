-- Link Kit inventory rows back to their shop item type so purchase voice can render permanently in Kit.

alter table public.inventory
  add column if not exists shop_item_id uuid references public.shop_items (id) on delete set null;

create index if not exists inventory_shop_item_id_idx on public.inventory (shop_item_id);

update public.inventory i
set shop_item_id = gp.shop_item_id
from public.gold_purchases gp
where i.shop_item_id is null
  and gp.shop_item_id is not null
  and gp.student_id = i.student_id
  and gp.item_name = i.item_name
  and gp.gold_cost = i.gold_cost;

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

  insert into public.inventory (student_id, item_name, item_description, gold_cost, shop_item_id)
  values (v_uid, v_item.name, v_item.description, v_item.price_gold, v_item.id);

  return jsonb_build_object(
    'ok', true,
    'item_name', v_item.name,
    'cost', v_item.price_gold,
    'new_gold', (select gold from public.profiles where id = v_uid)
  );
end;
$$;

create or replace function public.complete_shop_purchase_request_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gold integer;
  v_description text;
begin
  if tg_op = 'UPDATE'
     and old.status is distinct from new.status
     and new.status = 'approved' then
    select gold into v_gold
    from public.profiles
    where id = new.student_id
    for update;

    if not found then
      raise exception 'No profile found for shop purchase request student %', new.student_id;
    end if;

    if v_gold < new.calculated_gold_cost then
      raise exception 'Insufficient gold for shop purchase request approval';
    end if;

    update public.profiles
    set gold = gold - new.calculated_gold_cost
    where id = new.student_id;

    select description into v_description
    from public.shop_items
    where id = new.shop_item_id;

    insert into public.gold_purchases (student_id, item_name, gold_cost, shop_item_id)
    values (new.student_id, new.item_name, new.calculated_gold_cost, new.shop_item_id);

    insert into public.inventory (student_id, item_name, item_description, gold_cost, shop_item_id)
    values (
      new.student_id,
      new.item_name,
      coalesce(nullif(new.notes, ''), v_description, 'Teacher-approved shop purchase.'),
      new.calculated_gold_cost,
      new.shop_item_id
    );
  end if;

  return new;
end;
$$;
