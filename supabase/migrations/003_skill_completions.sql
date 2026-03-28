-- Pending / approved skill completions per student (WP awarded after teacher approval, etc.)

create table if not exists public.skill_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_key text not null,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now(),
  unique (user_id, skill_key)
);

create index if not exists skill_completions_user_id_idx on public.skill_completions (user_id);

alter table public.skill_completions enable row level security;

create policy "Users read own skill completions"
  on public.skill_completions for select
  using (auth.uid() = user_id);

create policy "Users insert own skill completions"
  on public.skill_completions for insert
  with check (auth.uid() = user_id);
