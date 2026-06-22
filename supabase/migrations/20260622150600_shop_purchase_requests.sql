-- Dynamic shop purchase requests for teacher-gated, variable-price items.

create table if not exists public.shop_purchase_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  shop_item_id uuid references public.shop_items (id) on delete set null,
  item_name text not null,
  requested_grams integer check (requested_grams is null or requested_grams > 0),
  calculated_gold_cost integer not null check (calculated_gold_cost > 0),
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  teacher_note text,
  created_at timestamptz not null default now()
);

create index if not exists shop_purchase_requests_student_id_idx
  on public.shop_purchase_requests (student_id);
create index if not exists shop_purchase_requests_status_idx
  on public.shop_purchase_requests (status);
create index if not exists shop_purchase_requests_shop_item_id_idx
  on public.shop_purchase_requests (shop_item_id);

alter table public.shop_purchase_requests enable row level security;

drop policy if exists "Students read own shop purchase requests" on public.shop_purchase_requests;
create policy "Students read own shop purchase requests"
  on public.shop_purchase_requests for select
  using (auth.uid() = student_id);

drop policy if exists "Students insert own shop purchase requests" on public.shop_purchase_requests;
create policy "Students insert own shop purchase requests"
  on public.shop_purchase_requests for insert
  with check (
    auth.uid() = student_id
    and status = 'pending'
    and calculated_gold_cost > 0
  );

drop policy if exists "Teachers read shop purchase requests" on public.shop_purchase_requests;
create policy "Teachers read shop purchase requests"
  on public.shop_purchase_requests for select
  using (public.is_teacher());

drop policy if exists "Teachers update shop purchase requests" on public.shop_purchase_requests;
create policy "Teachers update shop purchase requests"
  on public.shop_purchase_requests for update
  using (public.is_teacher())
  with check (public.is_teacher());

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

    insert into public.inventory (student_id, item_name, item_description, gold_cost)
    values (
      new.student_id,
      new.item_name,
      coalesce(nullif(new.notes, ''), v_description, 'Teacher-approved shop purchase.'),
      new.calculated_gold_cost
    );
  end if;

  return new;
end;
$$;

drop trigger if exists tr_complete_shop_purchase_request_on_approval on public.shop_purchase_requests;
create trigger tr_complete_shop_purchase_request_on_approval
  after update of status on public.shop_purchase_requests
  for each row
  when (old.status is distinct from new.status)
  execute function public.complete_shop_purchase_request_on_approval();
