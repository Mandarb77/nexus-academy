-- Consolidated RLS for Nexus Academy after RLS is enabled on tables.
-- Students: read/write only their own rows where the app requires it.
-- Teachers (profiles.role = 'teacher'): read and update (and delete where needed) all student-facing data.
--
-- Re-run safe: drops policies by name then recreates.

-- ---------------------------------------------------------------------------
-- Teacher detection (must bypass RLS when reading profiles.role)
-- ---------------------------------------------------------------------------
create or replace function public.is_teacher()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select p.role = 'teacher' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_teacher() to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Teachers can read all profiles" on public.profiles;
create policy "Teachers can read all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_teacher());

drop policy if exists "Teachers update all profiles" on public.profiles;
create policy "Teachers update all profiles"
  on public.profiles for update
  to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

-- ---------------------------------------------------------------------------
-- tiles (read-only catalog for authenticated users)
-- ---------------------------------------------------------------------------
alter table public.tiles enable row level security;

drop policy if exists "Authenticated users can read tiles" on public.tiles;
create policy "Authenticated users can read tiles"
  on public.tiles for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- skill_completions
-- ---------------------------------------------------------------------------
alter table public.skill_completions enable row level security;

drop policy if exists "Students read own skill completions" on public.skill_completions;
create policy "Students read own skill completions"
  on public.skill_completions for select
  to authenticated
  using (auth.uid() = student_id);

drop policy if exists "Students insert own skill completions" on public.skill_completions;
create policy "Students insert own skill completions"
  on public.skill_completions for insert
  to authenticated
  with check (auth.uid() = student_id);

drop policy if exists "Students update returned to pending" on public.skill_completions;
create policy "Students update returned to pending"
  on public.skill_completions for update
  to authenticated
  using (auth.uid() = student_id and status = 'returned')
  with check (auth.uid() = student_id and status = 'pending');

drop policy if exists "Teachers read skill completions" on public.skill_completions;
create policy "Teachers read skill completions"
  on public.skill_completions for select
  to authenticated
  using (public.is_teacher());

drop policy if exists "Teachers update skill completions" on public.skill_completions;
create policy "Teachers update skill completions"
  on public.skill_completions for update
  to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

drop policy if exists "Teachers delete skill completions" on public.skill_completions;
create policy "Teachers delete skill completions"
  on public.skill_completions for delete
  to authenticated
  using (public.is_teacher());

-- ---------------------------------------------------------------------------
-- patents
-- ---------------------------------------------------------------------------
alter table public.patents enable row level security;

drop policy if exists "Students read own patents" on public.patents;
create policy "Students read own patents"
  on public.patents for select
  to authenticated
  using (auth.uid() = student_id);

drop policy if exists "Students insert own patents" on public.patents;
create policy "Students insert own patents"
  on public.patents for insert
  to authenticated
  with check (auth.uid() = student_id);

drop policy if exists "Students update own patents" on public.patents;
create policy "Students update own patents"
  on public.patents for update
  to authenticated
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists "Teachers read patents" on public.patents;
create policy "Teachers read patents"
  on public.patents for select
  to authenticated
  using (public.is_teacher());

drop policy if exists "Teachers update patents" on public.patents;
create policy "Teachers update patents"
  on public.patents for update
  to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

drop policy if exists "Teachers delete patents" on public.patents;
create policy "Teachers delete patents"
  on public.patents for delete
  to authenticated
  using (public.is_teacher());

-- ---------------------------------------------------------------------------
-- inventory
-- ---------------------------------------------------------------------------
alter table public.inventory enable row level security;

drop policy if exists "Students read own inventory" on public.inventory;
create policy "Students read own inventory"
  on public.inventory for select
  to authenticated
  using (auth.uid() = student_id);

drop policy if exists "Teachers read all inventory" on public.inventory;
create policy "Teachers read all inventory"
  on public.inventory for select
  to authenticated
  using (public.is_teacher());

drop policy if exists "Teachers delete inventory" on public.inventory;
create policy "Teachers delete inventory"
  on public.inventory for delete
  to authenticated
  using (public.is_teacher());

-- ---------------------------------------------------------------------------
-- redemption_requests
-- ---------------------------------------------------------------------------
alter table public.redemption_requests enable row level security;

drop policy if exists "Students read own redemption requests" on public.redemption_requests;
create policy "Students read own redemption requests"
  on public.redemption_requests for select
  to authenticated
  using (auth.uid() = student_id);

drop policy if exists "Students insert own redemption requests" on public.redemption_requests;
create policy "Students insert own redemption requests"
  on public.redemption_requests for insert
  to authenticated
  with check (
    auth.uid() = student_id
    and exists (
      select 1
      from public.inventory i
      where i.id = inventory_id
        and i.student_id = auth.uid()
        and i.status = 'unused'
    )
  );

drop policy if exists "Teachers read redemption requests" on public.redemption_requests;
create policy "Teachers read redemption requests"
  on public.redemption_requests for select
  to authenticated
  using (public.is_teacher());

drop policy if exists "Teachers update redemption requests" on public.redemption_requests;
create policy "Teachers update redemption requests"
  on public.redemption_requests for update
  to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

drop policy if exists "Teachers delete redemption requests" on public.redemption_requests;
create policy "Teachers delete redemption requests"
  on public.redemption_requests for delete
  to authenticated
  using (public.is_teacher());

-- ---------------------------------------------------------------------------
-- gold_purchases
-- ---------------------------------------------------------------------------
alter table public.gold_purchases enable row level security;

drop policy if exists "Students read own gold purchases" on public.gold_purchases;
create policy "Students read own gold purchases"
  on public.gold_purchases for select
  to authenticated
  using (auth.uid() = student_id);

drop policy if exists "Teachers read all gold purchases" on public.gold_purchases;
create policy "Teachers read all gold purchases"
  on public.gold_purchases for select
  to authenticated
  using (public.is_teacher());

drop policy if exists "Teachers delete gold purchases" on public.gold_purchases;
create policy "Teachers delete gold purchases"
  on public.gold_purchases for delete
  to authenticated
  using (public.is_teacher());

-- ---------------------------------------------------------------------------
-- RPCs used by the app (RLS bypass inside function body; still need GRANT)
-- ---------------------------------------------------------------------------
grant execute on function public.buy_shop_item(text) to authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'teacher_reset_skill_completion'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, integer'
  ) then
    grant execute on function public.teacher_reset_skill_completion(uuid, integer) to authenticated;
  end if;
end $$;
