-- Storyline milestones for the teacher panel widget (TeacherStorylineWidget).
-- Fragment 2: first class-wide final Patent (packet) approval.
-- Fragment 3: first Tier 2 commission / community quest completion.
-- Fired from triggers on skill_completions; widget shows undismissed rows one at a time.
-- Teachers dismiss via dismiss_storyline_milestone when they deliver the beat in class.

create table if not exists public.storyline_milestones (
  fragment_number integer primary key
    check (fragment_number in (2, 3)),
  trigger_key text not null unique,
  trigger_description text not null,
  fired_at timestamptz not null default now(),
  source_completion_id integer null references public.skill_completions (id) on delete set null,
  dismissed_at timestamptz null,
  dismissed_by uuid null references public.profiles (id) on delete set null
);

comment on table public.storyline_milestones is
  'Class-wide storyline fragment unlock moments for the teacher Storyline widget.';

alter table public.storyline_milestones enable row level security;

drop policy if exists storyline_milestones_teacher_select on public.storyline_milestones;
create policy storyline_milestones_teacher_select
  on public.storyline_milestones
  for select
  to authenticated
  using (public.is_teacher());

grant select on public.storyline_milestones to authenticated;

create or replace function public.fire_storyline_milestone(
  p_fragment_number integer,
  p_trigger_key text,
  p_trigger_description text,
  p_source_completion_id integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_fragment_number not in (2, 3) then
    return;
  end if;

  insert into public.storyline_milestones (
    fragment_number,
    trigger_key,
    trigger_description,
    source_completion_id
  )
  values (
    p_fragment_number,
    p_trigger_key,
    p_trigger_description,
    p_source_completion_id
  )
  on conflict (fragment_number) do nothing;
end;
$$;

revoke all on function public.fire_storyline_milestone(integer, text, text, integer) from public;
grant execute on function public.fire_storyline_milestone(integer, text, text, integer) to service_role;

create or replace function public.maybe_fire_storyline_on_skill_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tile_quest_kind text;
  v_packet_ok boolean := false;
begin
  if tg_op <> 'UPDATE'
     or new.status is distinct from 'approved'
     or old.status is not distinct from 'approved'
  then
    return new;
  end if;

  select t.quest_kind
    into v_tile_quest_kind
  from public.tiles t
  where t.id = new.tile_id;

  -- Fragment 2: first final Patent approval (packet-stage linked completion).
  if new.patent_id is not null then
    select exists (
      select 1
      from public.patents p
      where p.id = new.patent_id
        and lower(trim(coalesce(p.stage, ''))) = 'packet'
    )
    into v_packet_ok;

    if v_packet_ok then
      perform public.fire_storyline_milestone(
        2,
        'first_patent_approval',
        'first class-wide Patent approval',
        new.id
      );
    end if;
  end if;

  -- Fragment 3: first Tier 2 commission / community quest completion.
  if lower(trim(coalesce(v_tile_quest_kind, ''))) = 'tier2' then
    perform public.fire_storyline_milestone(
      3,
      'first_tier2_completion',
      'first Tier 2 commission or community quest completion',
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists maybe_fire_storyline_on_skill_approval on public.skill_completions;
create trigger maybe_fire_storyline_on_skill_approval
  after update of status on public.skill_completions
  for each row
  execute function public.maybe_fire_storyline_on_skill_approval();

create or replace function public.dismiss_storyline_milestone(p_fragment_number integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'Teachers only');
  end if;

  if p_fragment_number not in (2, 3) then
    return jsonb_build_object('ok', false, 'error', 'Unknown fragment');
  end if;

  update public.storyline_milestones
     set dismissed_at = now(),
         dismissed_by = auth.uid()
   where fragment_number = p_fragment_number
     and dismissed_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'No undismissed milestone');
  end if;

  return jsonb_build_object('ok', true, 'fragment_number', p_fragment_number);
end;
$$;

revoke all on function public.dismiss_storyline_milestone(integer) from public;
grant execute on function public.dismiss_storyline_milestone(integer) to authenticated;

alter table public.storyline_milestones replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.storyline_milestones;
exception
  when duplicate_object then null;
end $$;

-- Backfill if the class already crossed these milestones.
with first_patent as (
  select sc.id
  from public.skill_completions sc
  join public.patents p on p.id = sc.patent_id
  where sc.status = 'approved'
    and lower(trim(coalesce(p.stage, ''))) = 'packet'
  order by coalesce(sc.approved_at, sc.created_at) asc
  limit 1
)
select public.fire_storyline_milestone(
  2,
  'first_patent_approval',
  'first class-wide Patent approval',
  (select id from first_patent)
)
where exists (select 1 from first_patent);

with first_tier2 as (
  select sc.id
  from public.skill_completions sc
  join public.tiles t on t.id = sc.tile_id
  where sc.status = 'approved'
    and lower(trim(coalesce(t.quest_kind, ''))) = 'tier2'
  order by coalesce(sc.approved_at, sc.created_at) asc
  limit 1
)
select public.fire_storyline_milestone(
  3,
  'first_tier2_completion',
  'first Tier 2 commission or community quest completion',
  (select id from first_tier2)
)
where exists (select 1 from first_tier2);
