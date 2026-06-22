-- Per-item Fran/Barry voice shown in the Supply purchase overlay.

alter table public.shop_items
  add column if not exists purchase_moment_text text;
