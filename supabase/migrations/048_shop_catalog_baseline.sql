-- Shop catalog tables (baseline for repo; idempotent if already on hosted DB).

create table if not exists public.shop_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  subtitle text,
  sort_order integer not null default 0
);

create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(),
  item_key text not null,
  name text not null,
  description text not null default '',
  tier_id uuid not null references public.shop_tiers (id) on delete restrict,
  price_gold integer check (price_gold is null or price_gold >= 0),
  is_active boolean not null default true,
  flavor_text text,
  is_locked boolean not null default false,
  display_order integer not null default 0,
  max_purchases_per_chicago_school_day integer check (
    max_purchases_per_chicago_school_day is null or max_purchases_per_chicago_school_day >= 1
  ),
  rank_requirement text,
  created_at timestamptz not null default now(),
  unique (item_key)
);

alter table public.shop_items
  add column if not exists convenience_band text check (
    convenience_band is null or convenience_band in ('in_room', 'out_of_room')
  ),
  add column if not exists stock_per_semester integer check (
    stock_per_semester is null or stock_per_semester >= 0
  ),
  add column if not exists gate_requirement text;

create index if not exists shop_items_tier_id_idx on public.shop_items (tier_id);
create index if not exists shop_items_active_idx on public.shop_items (is_active) where is_active;

alter table public.gold_purchases
  add column if not exists shop_item_id uuid references public.shop_items (id) on delete set null;

create index if not exists gold_purchases_shop_item_id_idx on public.gold_purchases (shop_item_id);

comment on column public.shop_items.gate_requirement is
  'Student-facing unlock hint when is_locked (display only until gate engine exists).';
comment on column public.shop_items.convenience_band is
  'Convenience tier only: in_room (cheap) vs out_of_room (expensive, often stock_per_semester).';
comment on column public.shop_items.stock_per_semester is
  'Global cap on purchases for this SKU per semester (null = unlimited). Counted in buy_shop_item.';

alter table public.shop_tiers enable row level security;
alter table public.shop_items enable row level security;

drop policy if exists "Authenticated read shop tiers" on public.shop_tiers;
create policy "Authenticated read shop tiers"
  on public.shop_tiers for select to authenticated using (true);

drop policy if exists "Authenticated read shop items" on public.shop_items;
create policy "Authenticated read shop items"
  on public.shop_items for select to authenticated using (true);

drop policy if exists "Teachers manage shop items" on public.shop_items;
create policy "Teachers manage shop items"
  on public.shop_items for all to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

drop policy if exists "Teachers manage shop tiers" on public.shop_tiers;
create policy "Teachers manage shop tiers"
  on public.shop_tiers for all to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());
