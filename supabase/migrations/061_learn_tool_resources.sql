-- Field Guide “Learn the tools” — guild-organized resource links.
-- Teacher-seeded + student proposals with approval/credit line (same pattern as beyond_tiles).

create table if not exists public.learn_tool_resources (
  id uuid primary key default gen_random_uuid(),
  guild text not null
    check (guild in ('Forge', 'Void', 'Prism', 'Silicon', 'Folded')),
  title text not null,
  description text not null,
  url text not null,
  credit_line text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'archived')),
  submitted_by uuid references auth.users (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learn_tool_resources_guild_idx on public.learn_tool_resources (guild);
create index if not exists learn_tool_resources_status_idx on public.learn_tool_resources (status);

comment on table public.learn_tool_resources is
  'Field Guide “Learn the tools” links — one guild per row, title + sentence + URL.';
comment on column public.learn_tool_resources.credit_line is
  'Teacher-written attribution on approved student submissions.';

alter table public.learn_tool_resources enable row level security;

drop policy if exists "Read learn tool resources" on public.learn_tool_resources;
create policy "Read learn tool resources"
  on public.learn_tool_resources for select to authenticated
  using (status = 'approved' or public.is_teacher());

drop policy if exists "Students propose learn tool resources" on public.learn_tool_resources;
create policy "Students propose learn tool resources"
  on public.learn_tool_resources for insert to authenticated
  with check (
    not public.is_teacher()
    and status = 'pending'
    and submitted_by = auth.uid()
    and credit_line is null
  );

drop policy if exists "Teachers manage learn tool resources" on public.learn_tool_resources;
create policy "Teachers manage learn tool resources"
  on public.learn_tool_resources for all to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

-- ---------------------------------------------------------------------------
-- Seed: teacher-authored links (skipped if any row already exists)
-- ---------------------------------------------------------------------------

insert into public.learn_tool_resources (guild, title, description, url, status, sort_order)
select guild, title, description, url, status, sort_order
from (values
  (
    'Forge',
    'Align objects in Tinkercad',
    'How to use the align tool to place shapes exactly where you want them.',
    'https://www.youtube.com/watch?v=hX8OW_kGhbw',
    'approved',
    1
  ),
  (
    'Forge',
    'Scale and resize objects',
    'Resize anything precisely — proportional and non-proportional scaling.',
    'https://www.youtube.com/watch?v=2_0aBg5_Eq8',
    'approved',
    2
  ),
  (
    'Forge',
    'Using the hole tool',
    'Turn any shape into a cookie cutter to cut holes, tunnels, and custom edges.',
    'https://www.youtube.com/watch?v=2OGlwuP7rx8',
    'approved',
    3
  ),
  (
    'Forge',
    '22 tips for working faster',
    'Reference page from Tinkercad — keyboard shortcuts, hidden tools, things most people find by accident.',
    'https://www.tinkercad.com/blog/22-tips-for-working-faster-in-tinkercad',
    'approved',
    4
  ),
  (
    'Void',
    'I have no idea what to do with a CNC',
    'Start here. No assumed knowledge. Covers the whole workflow from zero.',
    'https://www.youtube.com/watch?v=nvbm4coxzVQ&list=PLS3hpxHvkxfAQCt7Qu5-avwIAr1MxZTOT',
    'approved',
    1
  ),
  (
    'Void',
    'Feeds and speeds',
    'Why these numbers matter and how to stop guessing at them.',
    'https://www.youtube.com/watch?v=cjoNGACBkks',
    'approved',
    2
  ),
  (
    'Void',
    'V-carve inlay start to finish',
    'Carbide 3D''s own tutorial — pocket, contour, the whole inlay workflow.',
    'https://www.youtube.com/watch?v=241eTfM1Dss',
    'approved',
    3
  ),
  (
    'Prism',
    'Cut, score, and engrave wood',
    'Three operations, one video, practical start to finish. This is how the machine actually works.',
    'https://www.youtube.com/watch?v=dUtM_ZAQN9c',
    'approved',
    1
  ),
  (
    'Prism',
    'What materials can you use?',
    'Official Glowforge overview — wood, acrylic, leather, fabric, what works and what doesn''t.',
    'https://glowforge.com/watch/basics/materials',
    'approved',
    2
  ),
  (
    'Prism',
    'Living hinge masterclass',
    'Once you know the basics — how to make wood bend.',
    'https://www.youtube.com/watch?v=-UyQPI5Qpts',
    'approved',
    3
  ),
  (
    'Silicon',
    'Meet your micro:bit',
    'Official interactive intro — what it does, how to code it, first project.',
    'https://microbit.org/projects/make-it-code-it/meet-your-microbit/',
    'approved',
    1
  ),
  (
    'Silicon',
    'Buttons and LED matrix',
    'Step by step: button input triggers LED output. The foundation of almost everything.',
    'https://learn.littlebirdelectronics.com.au/microbit/using-the-buttons-and-led-matrix-on-micro-bit',
    'approved',
    2
  ),
  (
    'Folded',
    'Start here — video 1',
    'The Pop-Up Channel is the best teacher on the internet for this. Watch this first, then explore the channel. Paper requires more precision than most tools — these videos are longer for a reason.',
    'https://www.youtube.com/watch?v=aGJZbNh9Phs&t=102s',
    'approved',
    1
  )
) as seed (guild, title, description, url, status, sort_order)
where not exists (select 1 from public.learn_tool_resources limit 1);
