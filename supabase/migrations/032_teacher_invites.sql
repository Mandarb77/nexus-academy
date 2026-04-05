-- Teacher invite tokens.
-- A teacher generates a link; the recipient visits /join/<token>, signs in,
-- and their profile.role is updated to 'teacher'. Each token can only be used once.

create table if not exists public.teacher_invites (
  id          uuid primary key default gen_random_uuid(),
  token       text unique not null default encode(gen_random_bytes(24), 'hex'),
  created_by  uuid references public.profiles(id) on delete set null,
  used_by     uuid references public.profiles(id) on delete set null,
  used_at     timestamptz,
  created_at  timestamptz default now() not null
);

alter table public.teacher_invites enable row level security;

-- Teachers can create invites.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'teacher_invites' and policyname = 'Teachers can insert invites'
  ) then
    create policy "Teachers can insert invites"
      on public.teacher_invites for insert
      with check (public.is_teacher());
  end if;
end $$;

-- Teachers can view all invites (so they can see which ones have been used).
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'teacher_invites' and policyname = 'Teachers can view invites'
  ) then
    create policy "Teachers can view invites"
      on public.teacher_invites for select
      using (public.is_teacher());
  end if;
end $$;

-- Any authenticated user can look up a specific token (needed by /join/<token> page).
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'teacher_invites' and policyname = 'Anyone authenticated can read invite by token'
  ) then
    create policy "Anyone authenticated can read invite by token"
      on public.teacher_invites for select
      using (auth.uid() is not null);
  end if;
end $$;

-- RPC: claim_teacher_invite(p_token)
-- Called by the /join page after the user has signed in.
-- Marks the token used, then promotes the caller to teacher.
create or replace function public.claim_teacher_invite(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite   public.teacher_invites%rowtype;
  v_uid      uuid := auth.uid();
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- Lock the invite row to prevent race conditions.
  select * into v_invite
  from public.teacher_invites
  where token = p_token
  for update;

  if not found then
    return json_build_object('ok', false, 'error', 'invalid_token');
  end if;

  if v_invite.used_at is not null then
    return json_build_object('ok', false, 'error', 'already_used');
  end if;

  -- Mark as used.
  update public.teacher_invites
  set used_by = v_uid, used_at = now()
  where id = v_invite.id;

  -- Promote caller to teacher.
  update public.profiles
  set role = 'teacher'
  where id = v_uid;

  return json_build_object('ok', true);
end;
$$;

-- Grant execute to authenticated users so they can call it from the frontend.
grant execute on function public.claim_teacher_invite(text) to authenticated;
