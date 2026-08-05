-- Realtime for teacher shop/redemption queues and student approval notifications.
alter publication supabase_realtime add table public.redemption_requests;
alter publication supabase_realtime add table public.shop_purchase_requests;
