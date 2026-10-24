-- Pop-up events (class-wide one-shot forms) + Quarter 1 Reflection seed (inactive).
-- Production never received 20260804120000_teacher_economy_tools.sql, so create the
-- grant audit table here if missing. Students cannot call teacher_grant_economy
-- (it requires is_teacher()). Submit RPC writes the response and the same
-- teacher_economy_grants / profile balance change in one transaction.

create table if not exists public.teacher_economy_grants (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  wp_delta integer not null default 0,
  gold_delta integer not null default 0,
  reason text not null check (length(trim(reason)) between 1 and 500),
  granted_by uuid not null references public.profiles (id) on delete restrict,
  grant_type text not null default 'manual',
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

alter table public.teacher_economy_grants
  drop constraint if exists teacher_economy_grants_grant_type_check;

alter table public.teacher_economy_grants
  add constraint teacher_economy_grants_grant_type_check
  check (grant_type in ('manual', 'rescind', 'event'));

create table if not exists public.popup_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  intro_text text not null default '',
  questions jsonb not null default '[]'::jsonb,
  reward_wp integer not null default 0 check (reward_wp >= 0),
  reward_gold integer not null default 0 check (reward_gold >= 0),
  is_active boolean not null default false,
  required boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists popup_events_one_active
  on public.popup_events (is_active)
  where is_active;

create table if not exists public.popup_event_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.popup_events (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  skipped_by_teacher boolean not null default false,
  skipped_reason text,
  unique (event_id, student_id)
);

create index if not exists popup_event_responses_event_id_idx
  on public.popup_event_responses (event_id);

create index if not exists popup_event_responses_student_id_idx
  on public.popup_event_responses (student_id);

alter table public.popup_events enable row level security;
alter table public.popup_event_responses enable row level security;

drop policy if exists popup_events_student_select_active on public.popup_events;
create policy popup_events_student_select_active
  on public.popup_events
  for select
  to authenticated
  using (is_active or public.is_teacher());

drop policy if exists popup_events_teacher_write on public.popup_events;
create policy popup_events_teacher_insert
  on public.popup_events
  for insert
  to authenticated
  with check (public.is_teacher());

drop policy if exists popup_events_teacher_update on public.popup_events;
create policy popup_events_teacher_update
  on public.popup_events
  for update
  to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

drop policy if exists popup_event_responses_student_select_own on public.popup_event_responses;
create policy popup_event_responses_student_select_own
  on public.popup_event_responses
  for select
  to authenticated
  using (student_id = auth.uid() or public.is_teacher());

drop policy if exists popup_event_responses_teacher_write on public.popup_event_responses;
create policy popup_event_responses_teacher_insert
  on public.popup_event_responses
  for insert
  to authenticated
  with check (public.is_teacher());

drop policy if exists popup_event_responses_teacher_update on public.popup_event_responses;
create policy popup_event_responses_teacher_update
  on public.popup_event_responses
  for update
  to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

grant select on public.popup_events to authenticated;
grant insert, update on public.popup_events to authenticated;
grant select on public.popup_event_responses to authenticated;
grant insert, update on public.popup_event_responses to authenticated;

-- One round-trip for the student overlay. Teachers / guests get null from the client skip.
create or replace function public.student_pending_popup_event()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_row record;
begin
  if auth.uid() is null then
    return null;
  end if;
  if public.is_teacher() then
    return null;
  end if;

  select
    e.id,
    e.title,
    e.intro_text,
    e.questions,
    e.reward_wp,
    e.reward_gold
  into v_row
  from public.popup_events e
  where e.is_active
    and e.required
    and not exists (
      select 1
      from public.popup_event_responses r
      where r.event_id = e.id
        and r.student_id = auth.uid()
    )
  order by e.created_at desc
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'title', v_row.title,
    'intro_text', v_row.intro_text,
    'questions', v_row.questions,
    'reward_wp', v_row.reward_wp,
    'reward_gold', v_row.reward_gold
  );
end;
$$;

revoke all on function public.student_pending_popup_event() from public;
grant execute on function public.student_pending_popup_event() to authenticated;

create or replace function public.submit_popup_event_response(
  p_event_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.popup_events%rowtype;
  v_block jsonb;
  v_qid text;
  v_answer text;
  v_min integer;
  v_reason text;
  v_wp integer;
  v_gold integer;
  v_new_wp integer;
  v_new_gold integer;
  v_existing uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Sign in to submit.');
  end if;
  if public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'Teachers do not submit this form.');
  end if;

  select *
    into v_event
  from public.popup_events
  where id = p_event_id
  for update;

  if not found or not v_event.is_active then
    return jsonb_build_object('ok', false, 'error', 'This event is not open.');
  end if;

  select r.id into v_existing
  from public.popup_event_responses r
  where r.event_id = p_event_id
    and r.student_id = auth.uid();

  if v_existing is not null then
    return jsonb_build_object('ok', false, 'error', 'You already finished this.');
  end if;

  if jsonb_typeof(p_answers) is distinct from 'object' then
    return jsonb_build_object('ok', false, 'error', 'Answers are missing.');
  end if;

  for v_block in
    select value from jsonb_array_elements(coalesce(v_event.questions, '[]'::jsonb))
  loop
    if coalesce(v_block->>'kind', 'question') <> 'question' then
      continue;
    end if;
    v_qid := trim(coalesce(v_block->>'id', ''));
    if v_qid = '' then
      return jsonb_build_object('ok', false, 'error', 'This form is missing a question id.');
    end if;
    v_min := greatest(1, coalesce((v_block->>'min_length')::integer, 25));
    v_answer := trim(coalesce(p_answers->>v_qid, ''));
    if length(v_answer) < v_min then
      return jsonb_build_object(
        'ok', false,
        'error', 'Write a bit more on each question, then try again.'
      );
    end if;
  end loop;

  insert into public.popup_event_responses (event_id, student_id, answers)
  values (p_event_id, auth.uid(), p_answers);

  if v_event.reward_wp = 0 and v_event.reward_gold = 0 then
    return jsonb_build_object('ok', true, 'wp', null, 'gold', null, 'reward_wp', 0, 'reward_gold', 0);
  end if;

  v_reason := 'Event reward: ' || v_event.title;

  select p.wp, p.gold
    into v_wp, v_gold
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'student'
    and p.archived_from_class_at is null
  for update;

  if not found then
    raise exception 'Student profile not found';
  end if;

  v_new_wp := v_wp + v_event.reward_wp;
  v_new_gold := v_gold + v_event.reward_gold;

  update public.profiles
     set wp = v_new_wp,
         gold = v_new_gold
   where id = auth.uid();

  insert into public.teacher_economy_grants (
    student_id,
    wp_delta,
    gold_delta,
    reason,
    granted_by,
    grant_type
  )
  values (
    auth.uid(),
    v_event.reward_wp,
    v_event.reward_gold,
    v_reason,
    auth.uid(),
    'event'
  );

  return jsonb_build_object(
    'ok', true,
    'reward_wp', v_event.reward_wp,
    'reward_gold', v_event.reward_gold,
    'wp', v_new_wp,
    'gold', v_new_gold
  );
end;
$$;

revoke all on function public.submit_popup_event_response(uuid, jsonb) from public;
grant execute on function public.submit_popup_event_response(uuid, jsonb) to authenticated;

create or replace function public.skip_popup_event_for_student(
  p_event_id uuid,
  p_student_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'Teachers only');
  end if;
  if length(v_reason) = 0 then
    return jsonb_build_object('ok', false, 'error', 'A skip reason is required');
  end if;

  begin
    insert into public.popup_event_responses (
      event_id,
      student_id,
      answers,
      skipped_by_teacher,
      skipped_reason
    )
    values (
      p_event_id,
      p_student_id,
      '{}'::jsonb,
      true,
      v_reason
    );
  exception
    when unique_violation then
      return jsonb_build_object('ok', false, 'error', 'This student already has a response');
  end;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.skip_popup_event_for_student(uuid, uuid, text) from public;
grant execute on function public.skip_popup_event_for_student(uuid, uuid, text) to authenticated;

create or replace function public.set_popup_event_active(
  p_event_id uuid,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'Teachers only');
  end if;

  if p_active then
    update public.popup_events set is_active = false where is_active;
  end if;

  update public.popup_events
     set is_active = p_active
   where id = p_event_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Event not found');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.set_popup_event_active(uuid, boolean) from public;
grant execute on function public.set_popup_event_active(uuid, boolean) to authenticated;

insert into public.popup_events (
  title,
  intro_text,
  questions,
  reward_wp,
  reward_gold,
  is_active,
  required
)
values (
  'Quarter 1 Reflection',
  $intro$Quarter 1 is done. Take a few minutes and be honest. Only Mr. Cook sees your answers, and he uses them to help write your comment.

One thing before you start: in this class, things going wrong is normal. Failing is expected. It's how we learn, and talking about a fail is never a bad thing here.$intro$,
  $q$[
    {
      "kind": "question",
      "id": "q1",
      "prompt": "What are you most proud of this quarter? Tell me what it is and why.",
      "min_length": 25
    },
    {
      "kind": "question",
      "id": "q2",
      "prompt": "What did you make that showed the most care for someone else? Who was it for, and how can you tell you cared?",
      "min_length": 25
    },
    {
      "kind": "question",
      "id": "q3",
      "prompt": "What was your best fail? Tell me what went wrong and what you learned from it.",
      "min_length": 25
    },
    {
      "kind": "question",
      "id": "q4",
      "prompt": "What are you most looking forward to next quarter?",
      "min_length": 25
    },
    {
      "kind": "note",
      "id": "habits",
      "title": "Habits of Learning",
      "items": [
        "Fixing & Improving: I keep trying, use feedback, and fix my work until I understand.",
        "Planning My Work: I make a plan, set goals, use my time well, and adjust when needed.",
        "Making Original Work: I make my project my own by adding my interests and new ideas.",
        "Working With Others: I help my group, share ideas, and think about how our work affects others."
      ]
    },
    {
      "kind": "question",
      "id": "q5",
      "prompt": "Which of these habits did you use best? Give one example from something you made.",
      "min_length": 25
    },
    {
      "kind": "question",
      "id": "q6",
      "prompt": "Which one needs more work? What will you do about it?",
      "min_length": 25
    }
  ]$q$::jsonb,
  3,
  10,
  false,
  true
);
