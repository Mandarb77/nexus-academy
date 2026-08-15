-- Keeper's Duty shop chore + reusable weekly caps / duty-completion path
--
-- Why this exists:
--   "Keeper's Duty" is not a flat privilege (opt-out cleaning) and not a skill tile.
--   Students pay 2 gold up front (buy_shop_item), do 15 minutes of shop upkeep, then
--   a teacher approves for +6 gold only — never WP. Denying completion keeps the 2 spent.
--
-- Design choices (locked in after investigation):
--   1. cap_period on shop_items ('semester'|'week'), default 'semester' so every existing
--      SKU keeps identical behavior. per_kid_semester_cap stays the count column; when
--      cap_period = 'week' that count means "per Eastern calendar week". Cap logic
--      branches on the column — never hardcode keepers_duty by name or id.
--   2. Separate Convenience SKU (keepers_duty), not merged with opt_out_cleaning_session.
--   3. Buy-in via buy_shop_item (immediate deduct), not shop_purchase_requests (those
--      charge on teacher approve — wrong economics for a buy-in).
--   4. shop_duty_completions queue mirrors skill_completions UX, but award_gold_on_shop_duty_approval
--      touches profiles.gold only — deliberately narrower than award_wp_on_skill_approval.
--   5. fulfillment_kind / completion_reward_gold make Kit + teacher UI data-driven so
--      future duty SKUs do not need another name special-case.

-- ---------------------------------------------------------------------------
-- Cap period + duty fulfillment columns
-- ---------------------------------------------------------------------------

alter table public.shop_items
  add column if not exists cap_period text not null default 'semester';

alter table public.shop_items
  drop constraint if exists shop_items_cap_period_check;

alter table public.shop_items
  add constraint shop_items_cap_period_check
  check (cap_period in ('semester', 'week'));

comment on column public.shop_items.cap_period is
  'Window for per_kid_semester_cap: semester (default) or Eastern calendar week. Cap count column is reused.';

alter table public.shop_items
  add column if not exists fulfillment_kind text not null default 'redemption';

alter table public.shop_items
  drop constraint if exists shop_items_fulfillment_kind_check;

alter table public.shop_items
  add constraint shop_items_fulfillment_kind_check
  check (fulfillment_kind in ('redemption', 'duty_completion'));

comment on column public.shop_items.fulfillment_kind is
  'redemption = inventory Use → redemption_requests; duty_completion = Mark complete → shop_duty_completions.';

alter table public.shop_items
  add column if not exists completion_reward_gold integer;

alter table public.shop_items
  drop constraint if exists shop_items_completion_reward_gold_check;

alter table public.shop_items
  add constraint shop_items_completion_reward_gold_check
  check (completion_reward_gold is null or completion_reward_gold >= 0);

comment on column public.shop_items.completion_reward_gold is
  'Gold awarded on teacher approval of a duty completion (WP never awarded on this path).';

-- ---------------------------------------------------------------------------
-- Limit status: branch period window on cap_period (no item-key hardcoding)
--
-- Semester path keeps the prior created_at >= semester_start comparison so
-- existing messages/counts stay byte-compatible. Week path uses Eastern dates
-- with ISO Monday start (date_trunc('week', ...)) and week_cap_reached copy.
-- ---------------------------------------------------------------------------

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
  v_period_start date;
  v_cap_period text;
  v_period_count integer := 0;
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

  v_cap_period := coalesce(v_item.cap_period, 'semester');
  if v_cap_period = 'week' then
    -- Monday start of the Eastern calendar week (ISO week trunc).
    v_period_start := (date_trunc('week', v_today_eastern::timestamp))::date;
  else
    v_period_start := v_semester_start;
  end if;

  select
    count(*) filter (
      where case
        when v_cap_period = 'week' then
          (gp.created_at at time zone 'America/New_York')::date >= v_period_start
        else
          gp.created_at >= v_semester_start
      end
    )::integer,
    count(*) filter (
      where (gp.created_at at time zone 'America/New_York')::date = v_today_eastern
    )::integer,
    count(*)::integer,
    max((gp.created_at at time zone 'America/New_York')::date)
  into
    v_period_count,
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
    if v_period_count >= v_item.per_kid_semester_cap then
      v_allowed := false;
      if v_cap_period = 'week' then
        v_error_code := coalesce(v_error_code, 'week_cap_reached');
        v_disabled_message := coalesce(
          v_disabled_message,
          'You''ve hit your limit. Back next week.'
        );
      else
        v_error_code := coalesce(v_error_code, 'semester_cap_reached');
        v_disabled_message := coalesce(
          v_disabled_message,
          'You''ve hit your limit. Back next semester.'
        );
      end if;
    else
      if v_cap_period = 'week' then
        v_messages := v_messages || jsonb_build_array(
          (v_item.per_kid_semester_cap - v_period_count)::text
          || ' of '
          || v_item.per_kid_semester_cap::text
          || ' remaining this week'
        );
      else
        v_messages := v_messages || jsonb_build_array(
          (v_item.per_kid_semester_cap - v_period_count)::text
          || ' of '
          || v_item.per_kid_semester_cap::text
          || ' remaining this semester'
        );
      end if;
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
    'semester_count', v_period_count,
    'semester_cap', v_item.per_kid_semester_cap,
    'cap_period', v_cap_period,
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

-- ---------------------------------------------------------------------------
-- Seed Keeper's Duty (Convenience, immediate buy, weekly cap 2, duty payout 6)
-- Upsert on item_key so re-applying the migration refreshes catalog fields
-- without duplicating the SKU.
-- ---------------------------------------------------------------------------

insert into public.shop_items (
  item_key,
  name,
  description,
  tier_id,
  price_gold,
  is_active,
  flavor_text,
  purchase_moment_text,
  is_locked,
  display_order,
  max_purchases_per_chicago_school_day,
  convenience_band,
  stock_per_semester,
  gate_requirement,
  per_kid_semester_cap,
  cap_period,
  fulfillment_kind,
  completion_reward_gold
)
select
  'keepers_duty',
  'Keeper''s Duty',
  'Fifteen minutes of real shop upkeep. Buy in, do the work, get more back if it''s done right.',
  st.id,
  2,
  true,
  'Not skipping cleaning — doing the work.',
  E'Fran: "Two gold. Fifteen minutes. Real work."\n(Barry, from the back: "Then you get six back — if it''s done right.")\n(Fran: "If.")',
  false,
  31,
  null,
  'in_room',
  null,
  null,
  2,
  'week',
  'duty_completion',
  6
from public.shop_tiers st
where st.name = 'Convenience'
on conflict (item_key) do update
set
  name = excluded.name,
  description = excluded.description,
  tier_id = excluded.tier_id,
  price_gold = excluded.price_gold,
  is_active = excluded.is_active,
  flavor_text = excluded.flavor_text,
  purchase_moment_text = excluded.purchase_moment_text,
  is_locked = excluded.is_locked,
  display_order = excluded.display_order,
  convenience_band = excluded.convenience_band,
  per_kid_semester_cap = excluded.per_kid_semester_cap,
  cap_period = excluded.cap_period,
  fulfillment_kind = excluded.fulfillment_kind,
  completion_reward_gold = excluded.completion_reward_gold;

-- ---------------------------------------------------------------------------
-- Duty completions: mark done → teacher queue → gold-only award
--
-- gold_reward is stamped from shop_items.completion_reward_gold at submit time
-- so a later catalog edit cannot change a pending payout. One pending row per
-- inventory id blocks double-submit; return leaves inventory unused so the
-- student can mark complete again; approve marks inventory used + credits gold.
-- ---------------------------------------------------------------------------

create table if not exists public.shop_duty_completions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  inventory_id uuid not null references public.inventory (id) on delete cascade,
  shop_item_id uuid references public.shop_items (id) on delete set null,
  item_name text not null,
  gold_reward integer not null check (gold_reward > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'returned')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists shop_duty_completions_student_id_idx
  on public.shop_duty_completions (student_id);

create index if not exists shop_duty_completions_status_idx
  on public.shop_duty_completions (status);

create unique index if not exists shop_duty_completions_one_pending_per_inventory_idx
  on public.shop_duty_completions (inventory_id)
  where status = 'pending';

alter table public.shop_duty_completions enable row level security;

drop policy if exists "Students read own shop duty completions" on public.shop_duty_completions;
create policy "Students read own shop duty completions"
  on public.shop_duty_completions for select
  using (auth.uid() = student_id);

drop policy if exists "Teachers read shop duty completions" on public.shop_duty_completions;
create policy "Teachers read shop duty completions"
  on public.shop_duty_completions for select
  using (public.is_teacher());

drop policy if exists "Teachers update shop duty completions" on public.shop_duty_completions;
create policy "Teachers update shop duty completions"
  on public.shop_duty_completions for update
  using (public.is_teacher())
  with check (public.is_teacher());

-- No direct student INSERT; use submit_shop_duty_completion() so we validate
-- ownership, unused status, fulfillment_kind, and stamp gold_reward server-side.

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

revoke execute on function public.submit_shop_duty_completion(uuid) from public, anon;
grant execute on function public.submit_shop_duty_completion(uuid) to authenticated;

-- Stamp decided_at on status change
create or replace function public.stamp_shop_duty_completion_decided_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.status is distinct from old.status
     and new.status in ('approved', 'returned') then
    new.decided_at := coalesce(new.decided_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists tr_stamp_shop_duty_completion_decided_at on public.shop_duty_completions;
create trigger tr_stamp_shop_duty_completion_decided_at
  before update of status on public.shop_duty_completions
  for each row
  when (old.status is distinct from new.status)
  execute function public.stamp_shop_duty_completion_decided_at();

-- Gold-only award path (never touches WP).
-- Intentionally does NOT call or share award_wp_on_skill_approval — that trigger
-- always updates wp and gold together and is tied to the tile/skill domain.
create or replace function public.award_gold_on_shop_duty_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.status = 'approved'
     and (old.status is distinct from new.status) then
    update public.profiles
    set gold = gold + new.gold_reward
    where id = new.student_id;
    -- WP intentionally omitted.

    update public.inventory
    set status = 'used'
    where id = new.inventory_id
      and student_id = new.student_id;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_award_gold_on_shop_duty_approval on public.shop_duty_completions;
create trigger tr_award_gold_on_shop_duty_approval
  after update of status on public.shop_duty_completions
  for each row
  when (old.status is distinct from new.status)
  execute function public.award_gold_on_shop_duty_approval();

revoke execute on function public.award_gold_on_shop_duty_approval() from public, anon, authenticated;
revoke execute on function public.stamp_shop_duty_completion_decided_at() from public, anon, authenticated;

-- Realtime for teacher panel
do $$
begin
  alter publication supabase_realtime add table public.shop_duty_completions;
exception
  when duplicate_object then null;
end;
$$;
