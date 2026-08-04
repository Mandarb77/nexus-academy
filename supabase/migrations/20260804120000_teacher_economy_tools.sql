-- Teacher-only economy corrections and audit history.
-- Both RPCs keep profile balance changes and their log rows in one transaction.

create table if not exists public.teacher_economy_grants (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  wp_delta integer not null default 0,
  gold_delta integer not null default 0,
  reason text not null check (length(trim(reason)) between 1 and 500),
  granted_by uuid not null references public.profiles (id) on delete restrict,
  grant_type text not null default 'manual' check (grant_type in ('manual', 'rescind')),
  created_at timestamptz not null default now()
);

create index if not exists teacher_economy_grants_created_at_idx
  on public.teacher_economy_grants (created_at desc);

create index if not exists teacher_economy_grants_student_id_idx
  on public.teacher_economy_grants (student_id);

alter table public.teacher_economy_grants enable row level security;

drop policy if exists teacher_economy_grants_teacher_select on public.teacher_economy_grants;
create policy teacher_economy_grants_teacher_select
  on public.teacher_economy_grants
  for select
  to authenticated
  using (public.is_teacher());

grant select on public.teacher_economy_grants to authenticated;

create or replace function public.teacher_grant_economy(
  p_student_id uuid,
  p_wp_delta integer,
  p_gold_delta integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := trim(coalesce(p_reason, ''));
  v_wp integer;
  v_gold integer;
  v_new_wp integer;
  v_new_gold integer;
  v_log_id uuid;
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'Teachers only');
  end if;

  if length(v_reason) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Reason is required');
  end if;

  if length(v_reason) > 500 then
    return jsonb_build_object('ok', false, 'error', 'Reason must be 500 characters or fewer');
  end if;

  if coalesce(p_wp_delta, 0) = 0 and coalesce(p_gold_delta, 0) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Enter a WP or gold adjustment');
  end if;

  select p.wp, p.gold
    into v_wp, v_gold
  from public.profiles p
  where p.id = p_student_id
    and p.role = 'student'
    and p.archived_from_class_at is null
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Student not found');
  end if;

  v_new_wp := v_wp + coalesce(p_wp_delta, 0);
  v_new_gold := v_gold + coalesce(p_gold_delta, 0);

  if v_new_wp < 0 or v_new_gold < 0 then
    return jsonb_build_object('ok', false, 'error', 'This adjustment would make a balance negative');
  end if;

  update public.profiles
     set wp = v_new_wp,
         gold = v_new_gold
   where id = p_student_id;

  insert into public.teacher_economy_grants (
    student_id,
    wp_delta,
    gold_delta,
    reason,
    granted_by,
    grant_type
  )
  values (
    p_student_id,
    coalesce(p_wp_delta, 0),
    coalesce(p_gold_delta, 0),
    v_reason,
    auth.uid(),
    'manual'
  )
  returning id into v_log_id;

  return jsonb_build_object(
    'ok', true,
    'log_id', v_log_id,
    'wp', v_new_wp,
    'gold', v_new_gold
  );
end;
$$;

revoke all on function public.teacher_grant_economy(uuid, integer, integer, text) from public;
grant execute on function public.teacher_grant_economy(uuid, integer, integer, text) to authenticated;

create or replace function public.teacher_rescind_skill_completion_with_log(
  p_completion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_status text;
  v_wp_awarded integer;
  v_gold_awarded integer;
  v_quest_name text;
  v_current_wp integer;
  v_current_gold integer;
  v_new_wp integer;
  v_new_gold integer;
  v_wp_delta integer;
  v_gold_delta integer;
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'Teachers only');
  end if;

  select
    sc.student_id,
    sc.status,
    sc.wp_awarded,
    sc.gold_awarded,
    t.skill_name
  into
    v_student_id,
    v_status,
    v_wp_awarded,
    v_gold_awarded,
    v_quest_name
  from public.skill_completions sc
  join public.tiles t on t.id = sc.tile_id
  where sc.id = p_completion_id
  for update of sc;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Completion not found');
  end if;

  if v_status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'Only approved completions can be rescinded');
  end if;

  if v_wp_awarded is null or v_gold_awarded is null then
    return jsonb_build_object('ok', false, 'error', 'This completion has no recorded award amounts');
  end if;

  select p.wp, p.gold
    into v_current_wp, v_current_gold
  from public.profiles p
  where p.id = v_student_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Student profile not found');
  end if;

  -- Match the existing reset RPC: balances never go below zero.
  v_new_wp := greatest(0, v_current_wp - v_wp_awarded);
  v_new_gold := greatest(0, v_current_gold - v_gold_awarded);
  v_wp_delta := v_new_wp - v_current_wp;
  v_gold_delta := v_new_gold - v_current_gold;

  update public.profiles
     set wp = v_new_wp,
         gold = v_new_gold
   where id = v_student_id;

  insert into public.teacher_economy_grants (
    student_id,
    wp_delta,
    gold_delta,
    reason,
    granted_by,
    grant_type
  )
  values (
    v_student_id,
    v_wp_delta,
    v_gold_delta,
    'Rescinded: ' || v_quest_name,
    auth.uid(),
    'rescind'
  );

  delete from public.skill_completions
   where id = p_completion_id;

  return jsonb_build_object(
    'ok', true,
    'quest_name', v_quest_name,
    'wp_delta', v_wp_delta,
    'gold_delta', v_gold_delta,
    'wp', v_new_wp,
    'gold', v_new_gold
  );
end;
$$;

revoke all on function public.teacher_rescind_skill_completion_with_log(uuid) from public;
grant execute on function public.teacher_rescind_skill_completion_with_log(uuid) to authenticated;
