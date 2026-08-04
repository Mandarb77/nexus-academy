-- Preferred first name for student-facing voice (Fran/Barry, welcome, etc.).
-- Google display_name stays as roster/legal-ish label; preferred_first_name is what Fran calls them.
-- Collected once via PreferredFirstNameGate after first login; shop moments personalize “Marcus” → that name.

alter table public.profiles
  add column if not exists preferred_first_name text;

comment on column public.profiles.preferred_first_name is
  'What Fran/Barry and the student UI should call this person. Optional; collected after first login.';

-- Best-effort backfill from display_name first token when it looks like a real given name
-- (not an email local-part like jparker or ccookmaker67).
update public.profiles
set preferred_first_name = initcap(split_part(trim(display_name), ' ', 1))
where preferred_first_name is null
  and display_name is not null
  and trim(display_name) <> ''
  and split_part(trim(display_name), ' ', 1) ~ '^[A-Za-z][A-Za-z''-]{1,30}$'
  and split_part(trim(display_name), ' ', 1) !~ '[0-9]';
