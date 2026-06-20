-- Rename the visible Supply item copy from "Curly maple session" to "Top Shelf Lumber".
-- Keep item_key stable so existing purchases/RPC lookups keep working.

update public.shop_items
set
  name = 'Top Shelf Lumber',
  description = 'A board of top shelf lumber, yours for one project. Fran keeps it somewhere. Barry won''t say where. Ask Mr. Cook.'
where item_key = 'curly_maple_session';
