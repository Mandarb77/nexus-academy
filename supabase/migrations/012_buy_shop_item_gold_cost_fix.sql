-- Replace stale buy_shop_item() that still INSERTs into gold_purchases.cost.
-- Safe to re-run; matches 010 after gold_cost rename.

create or replace function public.buy_shop_item(p_item_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost integer;
  v_name text;
  v_desc text;
  v_uid uuid := auth.uid();
  v_gold integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  case trim(p_item_key)
    when 'workshop_dj' then
      v_cost := 35;
      v_name := 'Workshop DJ';
      v_desc := 'Control the class playlist for one session.';
    when 'phone_time' then
      v_cost := 20;
      v_name := 'Phone time';
      v_desc := '10 minutes of phone use.';
    when 'free_tardy' then
      v_cost := 30;
      v_name := 'Free tardy';
      v_desc := 'Arrive late once, under 15 minutes, no mark.';
    when 'snack' then
      v_cost := 15;
      v_name := 'Snack';
      v_desc := 'One snack from the workshop stash.';
    else
      return jsonb_build_object('ok', false, 'error', 'unknown_item');
  end case;

  select p.gold into v_gold from public.profiles p where p.id = v_uid for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_profile');
  end if;
  if v_gold < v_cost then
    return jsonb_build_object('ok', false, 'error', 'insufficient_gold');
  end if;

  update public.profiles set gold = gold - v_cost where id = v_uid;
  insert into public.gold_purchases (student_id, item_name, gold_cost)
  values (v_uid, v_name, v_cost);

  insert into public.inventory (student_id, item_name, item_description, gold_cost)
  values (v_uid, v_name, v_desc, v_cost);

  return jsonb_build_object(
    'ok', true,
    'item_name', v_name,
    'cost', v_cost,
    'new_gold', (select gold from public.profiles where id = v_uid)
  );
end;
$$;

grant execute on function public.buy_shop_item(text) to authenticated;
