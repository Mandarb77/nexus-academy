drop index if exists public.gold_purchases_student_item_created_at_idx;

revoke execute on function public.buy_shop_item(text) from public, anon;
grant execute on function public.buy_shop_item(text) to authenticated;

revoke execute on function public.request_shop_item(text, integer, integer, text) from public, anon;
grant execute on function public.request_shop_item(text, integer, integer, text) to authenticated;

revoke execute on function public.shop_stock_status(uuid) from public, anon;
grant execute on function public.shop_stock_status(uuid) to authenticated;

revoke execute on function public.complete_shop_purchase_request_on_approval() from public, anon, authenticated;
