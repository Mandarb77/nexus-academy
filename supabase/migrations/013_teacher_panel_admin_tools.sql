-- Teacher admin tools: reset student progress and bulk-delete student data.
-- Uses security definer + is_teacher() to bypass RLS safely.

create or replace function public.teacher_full_reset()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_skill_completions bigint := 0;
  v_deleted_redemptions bigint := 0;
  v_deleted_inventory bigint := 0;
  v_deleted_purchases bigint := 0;
  v_updated_profiles bigint := 0;
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'not_teacher');
  end if;

  -- Delete student-owned rows.
  delete from public.skill_completions sc
  using public.profiles p
  where p.id = sc.student_id
    and p.role = 'student';
  get diagnostics v_deleted_skill_completions = row_count;

  delete from public.redemption_requests rr
  using public.profiles p
  where p.id = rr.student_id
    and p.role = 'student';
  get diagnostics v_deleted_redemptions = row_count;

  delete from public.inventory i
  using public.profiles p
  where p.id = i.student_id
    and p.role = 'student';
  get diagnostics v_deleted_inventory = row_count;

  delete from public.gold_purchases gp
  using public.profiles p
  where p.id = gp.student_id
    and p.role = 'student';
  get diagnostics v_deleted_purchases = row_count;

  update public.profiles
  set wp = 0,
      gold = 0,
      rank = 'Initiate'
  where role = 'student';
  get diagnostics v_updated_profiles = row_count;

  return jsonb_build_object(
    'ok', true,
    'deleted_skill_completions', v_deleted_skill_completions,
    'deleted_redemption_requests', v_deleted_redemptions,
    'deleted_inventory', v_deleted_inventory,
    'deleted_gold_purchases', v_deleted_purchases,
    'updated_profiles', v_updated_profiles
  );
end;
$$;

create or replace function public.teacher_reset_by_type(p_type text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text := lower(trim(coalesce(p_type, '')));
  v_deleted bigint := 0;
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'not_teacher');
  end if;

  if v_type = 'skill_completions' then
    delete from public.skill_completions sc
    using public.profiles p
    where p.id = sc.student_id
      and p.role = 'student';
    get diagnostics v_deleted = row_count;
    return jsonb_build_object('ok', true, 'type', v_type, 'deleted', v_deleted);
  end if;

  if v_type = 'redemption_requests' then
    delete from public.redemption_requests rr
    using public.profiles p
    where p.id = rr.student_id
      and p.role = 'student';
    get diagnostics v_deleted = row_count;
    return jsonb_build_object('ok', true, 'type', v_type, 'deleted', v_deleted);
  end if;

  if v_type = 'inventory_and_purchases' then
    -- Redemptions reference inventory_id; delete redemptions first.
    delete from public.redemption_requests rr
    using public.profiles p
    where p.id = rr.student_id
      and p.role = 'student';

    delete from public.inventory i
    using public.profiles p
    where p.id = i.student_id
      and p.role = 'student';

    delete from public.gold_purchases gp
    using public.profiles p
    where p.id = gp.student_id
      and p.role = 'student';
    get diagnostics v_deleted = row_count;

    return jsonb_build_object('ok', true, 'type', v_type, 'deleted', v_deleted);
  end if;

  return jsonb_build_object('ok', false, 'error', 'unknown_type');
end;
$$;

grant execute on function public.teacher_full_reset() to authenticated;
grant execute on function public.teacher_reset_by_type(text) to authenticated;

