-- Student inventory (from shop purchases) and teacher-mediated redemption requests.

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  item_name text not null,
  item_description text not null,
  gold_cost integer not null check (gold_cost > 0),
  status text not null default 'unused' check (status in ('unused', 'used')),
  created_at timestamptz not null default now()
);

create index if not exists inventory_student_id_idx on public.inventory (student_id);
create index if not exists inventory_student_status_idx on public.inventory (student_id, status);

alter table public.inventory enable row level security;

drop policy if exists "Students read own inventory" on public.inventory;
create policy "Students read own inventory"
  on public.inventory for select
  using (auth.uid() = student_id);

drop policy if exists "Teachers read all inventory" on public.inventory;
create policy "Teachers read all inventory"
  on public.inventory for select
  using (public.is_teacher());

-- No client INSERT/UPDATE; rows come from buy_shop_item(); "used" is set by trigger on redemption approval.

create table if not exists public.redemption_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  inventory_id uuid not null references public.inventory (id) on delete cascade,
  item_name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'returned')),
  created_at timestamptz not null default now()
);

create index if not exists redemption_requests_student_id_idx on public.redemption_requests (student_id);
create index if not exists redemption_requests_status_idx on public.redemption_requests (status);

create unique index if not exists redemption_requests_one_pending_per_inventory_idx
  on public.redemption_requests (inventory_id)
  where status = 'pending';

alter table public.redemption_requests enable row level security;

drop policy if exists "Students read own redemption requests" on public.redemption_requests;
create policy "Students read own redemption requests"
  on public.redemption_requests for select
  using (auth.uid() = student_id);

drop policy if exists "Students insert own redemption requests" on public.redemption_requests;
create policy "Students insert own redemption requests"
  on public.redemption_requests for insert
  with check (
    auth.uid() = student_id
    and exists (
      select 1
      from public.inventory i
      where i.id = inventory_id
        and i.student_id = auth.uid()
        and i.status = 'unused'
    )
  );

drop policy if exists "Teachers read redemption requests" on public.redemption_requests;
create policy "Teachers read redemption requests"
  on public.redemption_requests for select
  using (public.is_teacher());

drop policy if exists "Teachers update redemption requests" on public.redemption_requests;
create policy "Teachers update redemption requests"
  on public.redemption_requests for update
  using (public.is_teacher())
  with check (public.is_teacher());

-- When a redemption is approved, mark the inventory row used.
create or replace function public.mark_inventory_used_on_redemption_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.status = 'approved'
     and (old.status is distinct from new.status) then
    update public.inventory
    set status = 'used'
    where id = new.inventory_id
      and student_id = new.student_id;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_mark_inventory_used_on_redemption on public.redemption_requests;
create trigger tr_mark_inventory_used_on_redemption
  after update of status on public.redemption_requests
  for each row
  when (old.status is distinct from new.status)
  execute function public.mark_inventory_used_on_redemption_approved();

-- Extend shop purchase to record inventory rows.
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
  insert into public.gold_purchases (student_id, item_name, cost)
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
