-- Fix teacher_full_reset(): update ALL profiles first, then delete tables in required order.

create or replace function public.teacher_full_reset()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_profiles bigint := 0;
  v_deleted_skill_completions bigint := 0;
  v_deleted_patents bigint := 0;
  v_deleted_inventory bigint := 0;
  v_deleted_redemptions bigint := 0;
  v_deleted_purchases bigint := 0;
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'not_teacher');
  end if;

  -- 1) Update ALL profiles (teachers included per spec).
  update public.profiles
  set wp = 0,
      gold = 0,
      rank = 'Initiate';
  get diagnostics v_updated_profiles = row_count;

  -- 2) Delete ALL rows in required order.
  delete from public.skill_completions;
  get diagnostics v_deleted_skill_completions = row_count;

  delete from public.patents;
  get diagnostics v_deleted_patents = row_count;

  delete from public.inventory;
  get diagnostics v_deleted_inventory = row_count;

  delete from public.redemption_requests;
  get diagnostics v_deleted_redemptions = row_count;

  delete from public.gold_purchases;
  get diagnostics v_deleted_purchases = row_count;

  return jsonb_build_object(
    'ok', true,
    'updated_profiles', v_updated_profiles,
    'deleted_skill_completions', v_deleted_skill_completions,
    'deleted_patents', v_deleted_patents,
    'deleted_inventory', v_deleted_inventory,
    'deleted_redemption_requests', v_deleted_redemptions,
    'deleted_gold_purchases', v_deleted_purchases
  );
end;
$$;

grant execute on function public.teacher_full_reset() to authenticated;

