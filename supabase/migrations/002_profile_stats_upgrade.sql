-- Apply if you already ran an older 001_profiles.sql without wp_total, gold_balance, rank, or the insert policy.

alter table public.profiles add column if not exists wp_total integer not null default 0;
alter table public.profiles add column if not exists gold_balance integer not null default 0;
alter table public.profiles add column if not exists rank text not null default 'Initiate';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, wp_total, gold_balance, rank, role)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Student'
    ),
    0,
    0,
    'Initiate',
    'student'
  );
  return new;
end;
$$;

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
