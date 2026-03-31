-- Allow teacher-panel frontend to run Full reset without RPC.
-- Grants teachers UPDATE on profiles and DELETE on reset-related tables under RLS.

-- profiles: allow teachers to update all profiles (wp/gold/rank reset)
drop policy if exists "Teachers update all profiles" on public.profiles;
create policy "Teachers update all profiles"
  on public.profiles for update
  using (public.is_teacher())
  with check (public.is_teacher());

-- skill_completions: allow teachers to delete completions in bulk reset
drop policy if exists "Teachers delete skill completions" on public.skill_completions;
create policy "Teachers delete skill completions"
  on public.skill_completions for delete
  using (public.is_teacher());

-- patents: allow teachers to delete patents in bulk reset
alter table public.patents enable row level security;
drop policy if exists "Teachers delete patents" on public.patents;
create policy "Teachers delete patents"
  on public.patents for delete
  using (public.is_teacher());

-- inventory: allow teachers to delete inventory in bulk reset
drop policy if exists "Teachers delete inventory" on public.inventory;
create policy "Teachers delete inventory"
  on public.inventory for delete
  using (public.is_teacher());

-- redemption_requests: allow teachers to delete redemptions in bulk reset
drop policy if exists "Teachers delete redemption requests" on public.redemption_requests;
create policy "Teachers delete redemption requests"
  on public.redemption_requests for delete
  using (public.is_teacher());

-- gold_purchases: allow teachers to delete purchases in bulk reset
drop policy if exists "Teachers delete gold purchases" on public.gold_purchases;
create policy "Teachers delete gold purchases"
  on public.gold_purchases for delete
  using (public.is_teacher());

