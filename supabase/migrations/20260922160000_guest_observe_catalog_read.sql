-- Guest observe: anonymous visitors may read public catalog pages (guilds already
-- have `pub can read` on tiles). Writes stay locked to school accounts in the app.

drop policy if exists "Anon read approved beyond tiles" on public.beyond_tiles;
create policy "Anon read approved beyond tiles"
on public.beyond_tiles
for select
to anon
using (status = 'approved');

drop policy if exists "Anon read approved learn tool resources" on public.learn_tool_resources;
create policy "Anon read approved learn tool resources"
on public.learn_tool_resources
for select
to anon
using (status = 'approved');

drop policy if exists "Anon read active shop items" on public.shop_items;
create policy "Anon read active shop items"
on public.shop_items
for select
to anon
using (is_active = true);

drop policy if exists "Anon read shop tiers" on public.shop_tiers;
create policy "Anon read shop tiers"
on public.shop_tiers
for select
to anon
using (true);

drop policy if exists "Anon read active tool glossary" on public.tool_glossary;
create policy "Anon read active tool glossary"
on public.tool_glossary
for select
to anon
using (active = true);
