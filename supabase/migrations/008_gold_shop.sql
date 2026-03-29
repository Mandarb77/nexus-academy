-- Gold shop: record purchases and deduct gold atomically (server-side prices).

create table if not exists public.gold_purchases (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  item_name text not null,
  gold_cost integer not null check (gold_cost > 0),
  created_at timestamptz not null default now()
);

create index if not exists gold_purchases_student_id_idx on public.gold_purchases (student_id);

alter table public.gold_purchases enable row level security;

drop policy if exists "Students read own gold purchases" on public.gold_purchases;
create policy "Students read own gold purchases"
  on public.gold_purchases for select
  using (auth.uid() = student_id);

drop policy if exists "Teachers read all gold purchases" on public.gold_purchases;
create policy "Teachers read all gold purchases"
  on public.gold_purchases for select
  using (public.is_teacher());

-- No direct INSERT for clients; purchases go through buy_shop_item().

create or replace function public.buy_shop_item(p_item_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost integer;
  v_name text;
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
    when 'phone_time' then
      v_cost := 20;
      v_name := 'Phone time';
    when 'free_tardy' then
      v_cost := 30;
      v_name := 'Free tardy';
    when 'snack' then
      v_cost := 15;
      v_name := 'Snack';
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

  return jsonb_build_object(
    'ok', true,
    'item_name', v_name,
    'cost', v_cost,
    'new_gold', (select gold from public.profiles where id = v_uid)
  );
end;
$$;

grant execute on function public.buy_shop_item(text) to authenticated;
