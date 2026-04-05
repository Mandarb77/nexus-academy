-- 1. Add checklist_approved gate column to patents.
alter table public.patents
  add column if not exists checklist_approved boolean not null default false;

-- 2. Drop any previously named award triggers so we can recreate them cleanly.
drop trigger if exists set_awards_before_skill_approval     on public.skill_completions;
drop trigger if exists award_wp_after_skill_approval        on public.skill_completions;
drop trigger if exists award_wp_on_skill_approval_trigger   on public.skill_completions;
drop trigger if exists set_awards_on_skill_approval_trigger on public.skill_completions;
drop trigger if exists award_wp_trigger                     on public.skill_completions;

-- 3. BEFORE trigger: stamp wp_awarded / gold_awarded on the row just before it is saved.
create or replace function public.set_awards_on_skill_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wp integer;
begin
  if tg_op = 'UPDATE'
     and new.status = 'approved'
     and old.status is distinct from 'approved' then
    select coalesce(t.wp_value, 0) into v_wp
      from public.tiles t where t.id = new.tile_id;
    new.wp_awarded  := coalesce(v_wp, 0);
    new.gold_awarded := 10;
  end if;
  return new;
end;
$$;

create trigger set_awards_before_skill_approval
  before update on public.skill_completions
  for each row execute function public.set_awards_on_skill_approval();

-- 4. AFTER trigger: add the stamped amounts to the student's profile.
create or replace function public.award_wp_on_skill_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.status = 'approved'
     and old.status is distinct from 'approved' then
    update public.profiles
       set wp   = wp   + coalesce(new.wp_awarded,   0),
           gold = gold + coalesce(new.gold_awarded,  0)
     where id = new.student_id;
  end if;
  return new;
end;
$$;

create trigger award_wp_after_skill_approval
  after update on public.skill_completions
  for each row execute function public.award_wp_on_skill_approval();
