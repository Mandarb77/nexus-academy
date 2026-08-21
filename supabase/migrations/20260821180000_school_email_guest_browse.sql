-- Off-domain Google accounts may sign in and read the class site.
-- Writes (quests, patents, shop, kit, proposals) require @kentshill.org or a teacher profile.

create or replace function public.jwt_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(trim(coalesce(auth.jwt() ->> 'email', '')));
$$;

create or replace function public.is_school_email()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select split_part(public.jwt_email(), '@', 2) = 'kentshill.org';
$$;

create or replace function public.can_class_interact()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_teacher() or public.is_school_email();
$$;

grant execute on function public.jwt_email() to authenticated;
grant execute on function public.is_school_email() to authenticated;
grant execute on function public.can_class_interact() to authenticated;

-- ---------------------------------------------------------------------------
-- Student write policies — keep existing ownership checks, add school/teacher gate
-- ---------------------------------------------------------------------------

drop policy if exists "Students insert own skill completions" on public.skill_completions;
create policy "Students insert own skill completions"
  on public.skill_completions for insert
  to authenticated
  with check (auth.uid() = student_id and public.can_class_interact());

drop policy if exists "Users can insert own completions" on public.skill_completions;
create policy "Users can insert own completions"
  on public.skill_completions for insert
  to authenticated
  with check (auth.uid() = student_id and public.can_class_interact());

drop policy if exists "Students update returned to pending" on public.skill_completions;
create policy "Students update returned to pending"
  on public.skill_completions for update
  to authenticated
  using (auth.uid() = student_id and status = 'returned' and public.can_class_interact())
  with check (auth.uid() = student_id and status = 'pending' and public.can_class_interact());

drop policy if exists "Students insert own patents" on public.patents;
create policy "Students insert own patents"
  on public.patents for insert
  to authenticated
  with check (auth.uid() = student_id and public.can_class_interact());

drop policy if exists "Students update own patents" on public.patents;
create policy "Students update own patents"
  on public.patents for update
  to authenticated
  using (auth.uid() = student_id and public.can_class_interact())
  with check (auth.uid() = student_id and public.can_class_interact());

drop policy if exists "Students insert own shop purchase requests" on public.shop_purchase_requests;
create policy "Students insert own shop purchase requests"
  on public.shop_purchase_requests for insert
  to authenticated
  with check (
    auth.uid() = student_id
    and status = 'pending'
    and calculated_gold_cost > 0
    and public.can_class_interact()
  );

drop policy if exists "Students insert own redemption requests" on public.redemption_requests;
create policy "Students insert own redemption requests"
  on public.redemption_requests for insert
  to authenticated
  with check (
    auth.uid() = student_id
    and public.can_class_interact()
    and exists (
      select 1
      from public.inventory i
      where i.id = redemption_requests.inventory_id
        and i.student_id = auth.uid()
        and i.status = 'unused'
    )
  );

drop policy if exists "Students propose beyond tiles" on public.beyond_tiles;
create policy "Students propose beyond tiles"
  on public.beyond_tiles for insert
  to authenticated
  with check (
    (not public.is_teacher())
    and public.can_class_interact()
    and status = 'pending'
    and submitted_by = auth.uid()
    and credit_line is null
  );

drop policy if exists "Students propose learn tool resources" on public.learn_tool_resources;
create policy "Students propose learn tool resources"
  on public.learn_tool_resources for insert
  to authenticated
  with check (
    (not public.is_teacher())
    and public.can_class_interact()
    and status = 'pending'
    and submitted_by = auth.uid()
    and credit_line is null
  );

-- ---------------------------------------------------------------------------
-- Shop RPCs (security definer — RLS does not apply)
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
  v_limit_status jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.can_class_interact() then
    return jsonb_build_object(
      'ok', false,
      'error', 'school_email_required',
      'message', 'Use your kentshill.org Google account to buy items.'
    );
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

  if not public.can_class_interact() then
    return jsonb_build_object(
      'ok', false,
      'error', 'school_email_required',
      'message', 'Use your kentshill.org Google account to request items.'
    );
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

create or replace function public.submit_shop_duty_completion(p_inventory_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.inventory%rowtype;
  v_item public.shop_items%rowtype;
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.can_class_interact() then
    return jsonb_build_object(
      'ok', false,
      'error', 'school_email_required',
      'message', 'Use your kentshill.org Google account to submit duty work.'
    );
  end if;

  select * into v_inv
  from public.inventory
  where id = p_inventory_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_inventory');
  end if;

  if v_inv.student_id is distinct from v_uid then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;

  if v_inv.status is distinct from 'unused' then
    return jsonb_build_object('ok', false, 'error', 'already_used');
  end if;

  if v_inv.shop_item_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_duty_item');
  end if;

  select * into v_item
  from public.shop_items
  where id = v_inv.shop_item_id;

  if not found
     or coalesce(v_item.fulfillment_kind, 'redemption') <> 'duty_completion'
     or coalesce(v_item.completion_reward_gold, 0) <= 0 then
    return jsonb_build_object('ok', false, 'error', 'not_duty_item');
  end if;

  if exists (
    select 1
    from public.shop_duty_completions sdc
    where sdc.inventory_id = v_inv.id
      and sdc.status = 'pending'
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_pending');
  end if;

  insert into public.shop_duty_completions (
    student_id,
    inventory_id,
    shop_item_id,
    item_name,
    gold_reward,
    status
  )
  values (
    v_uid,
    v_inv.id,
    v_item.id,
    v_inv.item_name,
    v_item.completion_reward_gold,
    'pending'
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
