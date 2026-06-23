-- Supply item limits: per-kid caps, workshop stock, time windows, and RPC-backed usage status.

alter table public.shop_items
  add column if not exists per_kid_semester_cap integer check (
    per_kid_semester_cap is null or per_kid_semester_cap >= 0
  ),
  add column if not exists per_kid_daily_rate_limit integer check (
    per_kid_daily_rate_limit is null or per_kid_daily_rate_limit >= 1
  ),
  add column if not exists per_kid_rate_limit_days integer check (
    per_kid_rate_limit_days is null or per_kid_rate_limit_days >= 1
  ),
  add column if not exists per_kid_lifetime_cap integer check (
    per_kid_lifetime_cap is null or per_kid_lifetime_cap >= 1
  ),
  add column if not exists workshop_total_stock integer check (
    workshop_total_stock is null or workshop_total_stock >= 0
  ),
  add column if not exists time_window_start date,
  add column if not exists time_window_end date,
  add constraint shop_items_time_window_order check (
    time_window_start is null
    or time_window_end is null
    or time_window_start <= time_window_end
  );

comment on column public.shop_items.per_kid_semester_cap is
  'Per-student cap for the current semester window. Null = unlimited.';
comment on column public.shop_items.per_kid_daily_rate_limit is
  'Per-student purchases allowed per Eastern calendar day. Null = unlimited.';
comment on column public.shop_items.per_kid_rate_limit_days is
  'Per-student cooldown in days between purchases. Null = no cooldown.';
comment on column public.shop_items.per_kid_lifetime_cap is
  'Per-student lifetime cap. Null = unlimited.';
comment on column public.shop_items.workshop_total_stock is
  'Workshop-wide semester stock pool for this SKU. Null = unlimited.';
comment on column public.shop_items.time_window_start is
  'First date this item can be purchased. Null = open immediately.';
comment on column public.shop_items.time_window_end is
  'Last date this item can be purchased. Null = no end date.';

create or replace function public.shop_item_limit_status_for_student(
  p_shop_item_id uuid,
  p_student_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.shop_items%rowtype;
  v_today_eastern date := (now() at time zone 'America/New_York')::date;
  v_semester_start date;
  v_semester_count integer := 0;
  v_today_count integer := 0;
  v_lifetime_count integer := 0;
  v_stock_sold integer := 0;
  v_stock_limit integer;
  v_last_purchase_date date;
  v_next_available date;
  v_messages jsonb := '[]'::jsonb;
  v_allowed boolean := true;
  v_error_code text := null;
  v_disabled_message text := null;
begin
  if p_student_id is null then
    return jsonb_build_object(
      'item_id', p_shop_item_id,
      'allowed', false,
      'error_code', 'not_authenticated',
      'disabled_message', 'Shop is not connected right now.',
      'messages', v_messages
    );
  end if;

  select *
  into v_item
  from public.shop_items
  where id = p_shop_item_id;

  if not found then
    return jsonb_build_object(
      'item_id', p_shop_item_id,
      'allowed', false,
      'error_code', 'unknown_item',
      'disabled_message', 'Unknown item.',
      'messages', v_messages
    );
  end if;

  v_semester_start := case
    when extract(month from v_today_eastern)::integer >= 7
      then make_date(extract(year from v_today_eastern)::integer, 7, 1)
    else make_date(extract(year from v_today_eastern)::integer, 1, 1)
  end;

  select
    count(*) filter (where gp.created_at >= v_semester_start)::integer,
    count(*) filter (
      where (gp.created_at at time zone 'America/New_York')::date = v_today_eastern
    )::integer,
    count(*)::integer,
    max((gp.created_at at time zone 'America/New_York')::date)
  into
    v_semester_count,
    v_today_count,
    v_lifetime_count,
    v_last_purchase_date
  from public.gold_purchases gp
  where gp.student_id = p_student_id
    and gp.shop_item_id = v_item.id;

  if v_item.time_window_start is not null and v_today_eastern < v_item.time_window_start then
    v_allowed := false;
    v_error_code := coalesce(v_error_code, 'time_window_not_open');
    v_disabled_message := coalesce(
      v_disabled_message,
      'Available starting ' || to_char(v_item.time_window_start, 'Mon FMDD, YYYY') || '.'
    );
  elsif v_item.time_window_end is not null and v_today_eastern > v_item.time_window_end then
    v_allowed := false;
    v_error_code := coalesce(v_error_code, 'time_window_closed');
    v_disabled_message := coalesce(
      v_disabled_message,
      'Window closed. Try again next semester.'
    );
  elsif v_item.time_window_end is not null then
    v_messages := v_messages || jsonb_build_array(
      'Available through ' || to_char(v_item.time_window_end, 'Mon FMDD, YYYY')
    );
  end if;

  if coalesce(v_item.per_kid_lifetime_cap, 0) > 0
     and v_lifetime_count >= v_item.per_kid_lifetime_cap then
    v_allowed := false;
    v_error_code := coalesce(v_error_code, 'lifetime_cap_reached');
    v_disabled_message := coalesce(
      v_disabled_message,
      case
        when v_item.item_key = 'fran_barry_supply_apparel'
          then 'You''ve already pre-ordered yours. Arrives in May.'
        else 'You''ve already got yours.'
      end
    );
  end if;

  if coalesce(v_item.per_kid_semester_cap, 0) > 0 then
    if v_semester_count >= v_item.per_kid_semester_cap then
      v_allowed := false;
      v_error_code := coalesce(v_error_code, 'semester_cap_reached');
      v_disabled_message := coalesce(
        v_disabled_message,
        'You''ve hit your limit. Back next semester.'
      );
    else
      v_messages := v_messages || jsonb_build_array(
        (v_item.per_kid_semester_cap - v_semester_count)::text
        || ' of '
        || v_item.per_kid_semester_cap::text
        || ' remaining this semester'
      );
    end if;
  end if;

  if coalesce(v_item.per_kid_daily_rate_limit, v_item.max_purchases_per_chicago_school_day, 0) > 0 then
    if v_today_count >= coalesce(v_item.per_kid_daily_rate_limit, v_item.max_purchases_per_chicago_school_day) then
      v_allowed := false;
      v_error_code := coalesce(v_error_code, 'daily_purchase_limit');
      v_disabled_message := coalesce(v_disabled_message, 'You''ve hit today''s limit. Back tomorrow.');
    else
      v_messages := v_messages || jsonb_build_array(
        v_today_count::text
        || ' of '
        || coalesce(v_item.per_kid_daily_rate_limit, v_item.max_purchases_per_chicago_school_day)::text
        || ' today'
      );
    end if;
  end if;

  if coalesce(v_item.per_kid_rate_limit_days, 0) > 0 and v_last_purchase_date is not null then
    v_next_available := v_last_purchase_date + v_item.per_kid_rate_limit_days;
    if v_today_eastern < v_next_available then
      v_allowed := false;
      v_error_code := coalesce(v_error_code, 'rate_limit_active');
      v_disabled_message := coalesce(
        v_disabled_message,
        'Next available: ' || to_char(v_next_available, 'Mon FMDD, YYYY')
      );
    end if;
  end if;

  v_stock_limit := coalesce(v_item.workshop_total_stock, v_item.stock_per_semester);
  if v_stock_limit is not null then
    select count(*)::integer
    into v_stock_sold
    from public.gold_purchases gp
    where gp.shop_item_id = v_item.id
      and gp.created_at >= v_semester_start;

    if v_stock_sold >= v_stock_limit then
      v_allowed := false;
      v_error_code := coalesce(v_error_code, 'workshop_stock_exhausted');
      v_disabled_message := coalesce(
        v_disabled_message,
        'Sold Out — Fran will let you know when more come in'
      );
    elsif v_stock_limit - v_stock_sold <= 5 then
      v_messages := v_messages || jsonb_build_array(
        (v_stock_limit - v_stock_sold)::text || ' pieces available'
      );
    end if;
  end if;

  return jsonb_build_object(
    'item_id', v_item.id,
    'allowed', v_allowed,
    'error_code', v_error_code,
    'disabled_message', v_disabled_message,
    'messages', v_messages,
    'semester_count', v_semester_count,
    'semester_cap', v_item.per_kid_semester_cap,
    'today_count', v_today_count,
    'daily_limit', coalesce(v_item.per_kid_daily_rate_limit, v_item.max_purchases_per_chicago_school_day),
    'lifetime_count', v_lifetime_count,
    'lifetime_cap', v_item.per_kid_lifetime_cap,
    'workshop_stock_limit', v_stock_limit,
    'workshop_stock_remaining', case
      when v_stock_limit is null then null
      else greatest(v_stock_limit - v_stock_sold, 0)
    end,
    'time_window_start', v_item.time_window_start,
    'time_window_end', v_item.time_window_end
  );
end;
$$;

revoke execute on function public.shop_item_limit_status_for_student(uuid, uuid) from public, anon, authenticated;

create or replace function public.shop_item_limit_status(p_shop_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.shop_item_limit_status_for_student(p_shop_item_id, auth.uid());
end;
$$;

revoke execute on function public.shop_item_limit_status(uuid) from public, anon;
grant execute on function public.shop_item_limit_status(uuid) to authenticated;

create or replace function public.shop_limit_statuses()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(public.shop_item_limit_status_for_student(si.id, v_uid) order by st.sort_order, si.display_order, si.name)
      from public.shop_items si
      join public.shop_tiers st on st.id = si.tier_id
      where si.is_active = true
    ),
    '[]'::jsonb
  );
end;
$$;

revoke execute on function public.shop_limit_statuses() from public, anon;
grant execute on function public.shop_limit_statuses() to authenticated;

create or replace function public.shop_stock_status(p_shop_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_sold integer;
  v_today_eastern date := (now() at time zone 'America/New_York')::date;
  v_semester_start date;
begin
  select coalesce(workshop_total_stock, stock_per_semester) into v_limit
  from public.shop_items
  where id = p_shop_item_id;

  if v_limit is null then
    return jsonb_build_object('limited', false);
  end if;

  v_semester_start := case
    when extract(month from v_today_eastern)::integer >= 7
      then make_date(extract(year from v_today_eastern)::integer, 7, 1)
    else make_date(extract(year from v_today_eastern)::integer, 1, 1)
  end;

  select count(*)::integer into v_sold
  from public.gold_purchases gp
  where gp.shop_item_id = p_shop_item_id
    and gp.created_at >= v_semester_start;

  return jsonb_build_object(
    'limited', true,
    'limit', v_limit,
    'sold', v_sold,
    'remaining', greatest(v_limit - v_sold, 0)
  );
end;
$$;

revoke execute on function public.shop_stock_status(uuid) from public, anon;
grant execute on function public.shop_stock_status(uuid) to authenticated;

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
  v_limit_status jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_item
  from public.shop_items
  where item_key = trim(p_item_key)
  for update;

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

  v_limit_status := public.shop_item_limit_status_for_student(v_item.id, v_uid);
  if coalesce((v_limit_status->>'allowed')::boolean, false) is false then
    return jsonb_build_object(
      'ok', false,
      'error', coalesce(v_limit_status->>'error_code', 'purchase_limit_reached'),
      'message', v_limit_status->>'disabled_message'
    );
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

revoke execute on function public.buy_shop_item(text) from public, anon;
grant execute on function public.buy_shop_item(text) to authenticated;

create or replace function public.request_shop_item(
  p_item_key text,
  p_requested_grams integer default null,
  p_calculated_gold_cost integer default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.shop_items%rowtype;
  v_student_id uuid := auth.uid();
  v_gold integer;
  v_cost integer;
  v_item_name text;
  v_request_id uuid;
  v_limit_status jsonb;
begin
  if v_student_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select *
  into v_item
  from public.shop_items
  where item_key = p_item_key
    and is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_item');
  end if;

  if p_requested_grams is not null and p_requested_grams <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_grams');
  end if;

  v_cost := coalesce(p_calculated_gold_cost, v_item.price_gold);
  if v_cost is null or v_cost <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_cost');
  end if;

  v_limit_status := public.shop_item_limit_status_for_student(v_item.id, v_student_id);
  if coalesce((v_limit_status->>'allowed')::boolean, false) is false then
    return jsonb_build_object(
      'ok', false,
      'error', coalesce(v_limit_status->>'error_code', 'purchase_limit_reached'),
      'message', v_limit_status->>'disabled_message'
    );
  end if;

  select gold
  into v_gold
  from public.profiles
  where id = v_student_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'profile_missing');
  end if;

  if v_gold < v_cost then
    return jsonb_build_object('ok', false, 'error', 'insufficient_gold');
  end if;

  v_item_name := case
    when p_requested_grams is not null then v_item.name || ' (' || p_requested_grams || 'g)'
    else v_item.name
  end;

  insert into public.shop_purchase_requests (
    student_id,
    shop_item_id,
    item_name,
    requested_grams,
    calculated_gold_cost,
    notes,
    status
  )
  values (
    v_student_id,
    v_item.id,
    v_item_name,
    p_requested_grams,
    v_cost,
    nullif(trim(coalesce(p_notes, '')), ''),
    'pending'
  )
  returning id into v_request_id;

  return jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'calculated_gold_cost', v_cost,
    'item_name', v_item_name
  );
end;
$$;

revoke execute on function public.request_shop_item(text, integer, integer, text) from public, anon;
grant execute on function public.request_shop_item(text, integer, integer, text) to authenticated;

create or replace function public.complete_shop_purchase_request_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gold integer;
  v_description text;
  v_limit_status jsonb;
begin
  if tg_op = 'UPDATE'
     and old.status is distinct from new.status
     and new.status = 'approved' then
    if new.shop_item_id is not null then
      perform 1
      from public.shop_items
      where id = new.shop_item_id
      for update;

      v_limit_status := public.shop_item_limit_status_for_student(new.shop_item_id, new.student_id);
      if coalesce((v_limit_status->>'allowed')::boolean, false) is false then
        raise exception '%', coalesce(v_limit_status->>'disabled_message', 'Purchase limit reached.');
      end if;
    end if;

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

revoke execute on function public.complete_shop_purchase_request_on_approval() from public, anon, authenticated;

update public.shop_items
set
  per_kid_semester_cap = case item_key
    when 'pick_class_playlist' then 4
    when 'snack' then 6
    when 'opt_out_cleaning_session' then 3
    when 'one_tardy_pass_under_15' then 1
    when 'sound_effect_button' then 2
    when 'decorate_workshop_corner' then 1
    when 'rename_laser_cutter' then 1
    when 'personal_project_pass' then 1
    else per_kid_semester_cap
  end,
  per_kid_rate_limit_days = case item_key
    when 'workshop_dj' then 14
    when 'music_dj' then 14
    else per_kid_rate_limit_days
  end,
  per_kid_lifetime_cap = case
    when item_key in (
      'fran_barry_supply_apparel',
      'dedicate_piece_to_gallery',
      'propose_new_tool_technique',
      'name_technique_class_vocabulary',
      'permanent_archive_entry'
    ) then 1
    else per_kid_lifetime_cap
  end,
  workshop_total_stock = case item_key
    when 'fran_barry_supply_apparel' then 10
    else workshop_total_stock
  end,
  time_window_start = case item_key
    when 'one_tardy_pass_under_15' then date '2026-09-01'
    else time_window_start
  end,
  time_window_end = case item_key
    when 'one_tardy_pass_under_15' then date '2026-09-21'
    else time_window_end
  end
where item_key in (
  'pick_class_playlist',
  'snack',
  'opt_out_cleaning_session',
  'one_tardy_pass_under_15',
  'sound_effect_button',
  'decorate_workshop_corner',
  'rename_laser_cutter',
  'personal_project_pass',
  'workshop_dj',
  'music_dj',
  'fran_barry_supply_apparel',
  'dedicate_piece_to_gallery',
  'propose_new_tool_technique',
  'name_technique_class_vocabulary',
  'permanent_archive_entry'
);
