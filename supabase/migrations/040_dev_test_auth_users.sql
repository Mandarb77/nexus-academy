-- Local / staging test users for Vite dev login bypass (email + password).
-- Password for both: testpass123
-- Requires: Authentication → Providers → Email enabled; disable "Confirm email" for frictionless
--   local sign-in, or ensure email_confirmed_at is set (this migration sets it).
--
-- Idempotent: skips users that already exist by email.
-- Promotes test-teacher@nexus.local to teacher in public.profiles after insert (trigger creates student first).

create extension if not exists pgcrypto;

do $$
declare
  inst_id uuid;
  student_uid uuid := gen_random_uuid();
  teacher_uid uuid := gen_random_uuid();
begin
  select id into inst_id from auth.instances order by id limit 1;
  if inst_id is null then
    inst_id := '00000000-0000-0000-0000-000000000000'::uuid;
  end if;

  if not exists (select 1 from auth.users where email = 'test-student@nexus.local') then
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new
    ) values (
      student_uid,
      inst_id,
      'authenticated',
      'authenticated',
      'test-student@nexus.local',
      crypt('testpass123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      student_uid::text,
      student_uid,
      jsonb_build_object('sub', student_uid::text, 'email', 'test-student@nexus.local'),
      'email',
      now(),
      now(),
      now()
    );
  end if;

  if not exists (select 1 from auth.users where email = 'test-teacher@nexus.local') then
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new
    ) values (
      teacher_uid,
      inst_id,
      'authenticated',
      'authenticated',
      'test-teacher@nexus.local',
      crypt('testpass123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      teacher_uid::text,
      teacher_uid,
      jsonb_build_object('sub', teacher_uid::text, 'email', 'test-teacher@nexus.local'),
      'email',
      now(),
      now(),
      now()
    );
  end if;

  update public.profiles
     set role = 'teacher'
   where lower(email) = lower('test-teacher@nexus.local');

  update public.profiles
     set role = 'student'
   where lower(email) = lower('test-student@nexus.local');
end $$;
