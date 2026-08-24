-- Classroom cleanup kiosk: laptop writes a trigger, Raspberry Pi display listens live.
-- Independent of Nexus student/teacher flows. Public (anon) access by design — low-stakes shop tool.
-- `assignments` is computed on the laptop so the Pi animates the same draw (does not re-roll).

create table public.cleanup_classes (
  id uuid primary key default gen_random_uuid(),
  class_name text not null,
  students jsonb not null default '[]'::jsonb
);

insert into public.cleanup_classes (class_name, students) values
  ('3D Design (E)', '[]'),
  ('3D Design (F)', '[]'),
  ('T&E Disco (A)', '[]'),
  ('T&E Disco (D)', '[]');

alter table public.cleanup_classes enable row level security;

-- Laptop may be signed into Nexus (`authenticated`) or not (`anon`).
create policy "Public can read cleanup classes"
on public.cleanup_classes for select
to anon, authenticated
using (true);

create policy "Public can update cleanup classes"
on public.cleanup_classes for update
to anon, authenticated
using (true)
with check (true);

grant select, update on table public.cleanup_classes to anon, authenticated;

create table public.cleanup_triggers (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.cleanup_classes(id),
  class_name text,
  assignments jsonb not null default '[]'::jsonb,
  triggered_at timestamptz not null default now()
);

alter table public.cleanup_triggers enable row level security;

create policy "Public can read cleanup triggers"
on public.cleanup_triggers for select
to anon, authenticated
using (true);

create policy "Public can insert cleanup triggers"
on public.cleanup_triggers for insert
to anon, authenticated
with check (true);

grant select, insert on table public.cleanup_triggers to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.cleanup_triggers;
exception
  when duplicate_object then null;
end;
$$;
