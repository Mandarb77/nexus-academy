-- Realtime UPDATE payloads need full OLD rows so students can detect plan vs checklist
-- vs final approval transitions (default identity only sends the primary key).

alter table public.patents replica identity full;
alter table public.skill_completions replica identity full;
alter table public.redemption_requests replica identity full;
alter table public.shop_purchase_requests replica identity full;
