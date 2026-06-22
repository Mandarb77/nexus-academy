-- Approved filament request schema follow-up:
-- - add updated_at to shop_purchase_requests
-- - add editable shop_config values
-- - route teacher-gated/dynamic purchases through request_shop_item()

alter table public.shop_purchase_requests
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_shop_purchase_requests_touch_updated_at on public.shop_purchase_requests;
create trigger tr_shop_purchase_requests_touch_updated_at
  before update on public.shop_purchase_requests
  for each row
  execute function public.touch_updated_at();

create table if not exists public.shop_config (
  id uuid primary key default gen_random_uuid(),
  config_key text not null unique,
  config_value jsonb not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists tr_shop_config_touch_updated_at on public.shop_config;
create trigger tr_shop_config_touch_updated_at
  before update on public.shop_config
  for each row
  execute function public.touch_updated_at();

alter table public.shop_config enable row level security;

drop policy if exists "Everyone reads shop config" on public.shop_config;
create policy "Everyone reads shop config"
  on public.shop_config for select
  using (true);

drop policy if exists "Teachers update shop config" on public.shop_config;
create policy "Teachers update shop config"
  on public.shop_config for update
  using (public.is_teacher())
  with check (public.is_teacher());

drop policy if exists "Teachers insert shop config" on public.shop_config;
create policy "Teachers insert shop config"
  on public.shop_config for insert
  with check (public.is_teacher());

insert into public.shop_config (config_key, config_value)
values (
  'specialty_filament_types',
  '[
    "Glow-in-the-dark",
    "Color-change (thermochromic)",
    "Silk / shiny finish",
    "Wood-blend",
    "Multi-color (gradient or layered)",
    "TPU Flexible",
    "PETG"
  ]'::jsonb
)
on conflict (config_key)
do update
set config_value = excluded.config_value,
    updated_at = now();

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
