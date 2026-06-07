-- Beyond the Tiles — field guide possibilities (not quest tiles).
-- Students propose → teacher approves with custom credit line; teacher can seed/edit/archive.

create table if not exists public.beyond_tiles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  guild_tags text[] not null default '{}',
  recipient_waiting boolean not null default false,
  credit_line text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'archived')),
  submitted_by uuid references auth.users (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists beyond_tiles_status_idx on public.beyond_tiles (status);
create index if not exists beyond_tiles_sort_idx on public.beyond_tiles (sort_order);

comment on table public.beyond_tiles is
  'Field Guide “Beyond the Tiles” entries — possibilities outside the quest tree.';
comment on column public.beyond_tiles.guild_tags is
  'Guild labels: Forge, Void, Prism, Silicon, Folded, or All.';
comment on column public.beyond_tiles.credit_line is
  'Teacher-written attribution on approved student submissions (e.g. CRC — Build Studio Fall ''26).';

alter table public.beyond_tiles enable row level security;

drop policy if exists "Read beyond tiles" on public.beyond_tiles;
create policy "Read beyond tiles"
  on public.beyond_tiles for select to authenticated
  using (status = 'approved' or public.is_teacher());

drop policy if exists "Students propose beyond tiles" on public.beyond_tiles;
create policy "Students propose beyond tiles"
  on public.beyond_tiles for insert to authenticated
  with check (
    not public.is_teacher()
    and status = 'pending'
    and submitted_by = auth.uid()
    and credit_line is null
  );

drop policy if exists "Teachers manage beyond tiles" on public.beyond_tiles;
create policy "Teachers manage beyond tiles"
  on public.beyond_tiles for all to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

-- ---------------------------------------------------------------------------
-- Seed: teacher-authored entries (no credit_line, no submitted_by)
-- Skipped if any row already exists (safe on re-apply).
-- ---------------------------------------------------------------------------

insert into public.beyond_tiles (title, body, guild_tags, recipient_waiting, status, sort_order)
select title, body, guild_tags, recipient_waiting, status::text, sort_order
from (values
  (
    '4×8 CNC',
    'No tile requires it. No tile forbids it. If your idea needs scale, this is the machine. Talk to Mr. Cook first.',
    '{Void}'::text[],
    false,
    'approved',
    1
  ),
  (
    'Electric guitar',
    'Neck, body, electronics, pickups, finishing. Crosses every guild and takes serious time. Not a quest — a conversation. Finish the floor first.',
    '{Forge,Void,Silicon}'::text[],
    false,
    'approved',
    2
  ),
  (
    'Cribbage legacy kit',
    'A CNC-routed board, 3D-printed pegs, a laser-engraved story plate, and a hand-folded beginner''s instruction booklet. Everything a stranger needs to learn to play. Balsam House has people waiting.',
    '{Void,Forge,Folded}'::text[],
    true,
    'approved',
    3
  ),
  (
    'Hospital comfort kit',
    'A pop-up encouragement book, a 3D-printed nightlight, and a laser-engraved name plaque. Packaged together for a child at MaineGeneral. Each piece from a different guild.',
    '{Forge,Prism,Folded}'::text[],
    true,
    'approved',
    4
  ),
  (
    'Interactive story box',
    'A physical box that tells the story of how this school came to be — buttons, light, sound, engraved panels. For visitors to campus. Sofija would recognize it.',
    '{Forge,Silicon,Prism}'::text[],
    false,
    'approved',
    5
  ),
  (
    'Outdoor discovery box',
    'A weatherproof field kit for Greenfield Elementary''s butterfly garden. Identification cards, specimen holders, a CNC-carved sign. Something that lives outside and lasts.',
    '{Void,Forge,Folded}'::text[],
    true,
    'approved',
    6
  ),
  (
    'Escape room box',
    'A puzzle box for another class or a local elementary school. Mechanisms, locks, hidden compartments, engraved clues. Fully cross-guild if you want it to be.',
    '{Forge,Void,Prism}'::text[],
    false,
    'approved',
    7
  ),
  (
    'Make something for another class',
    'Design and build an object that satisfies a real assignment in another class. Get it approved by both teachers. One object, two classes, one maker.',
    '{All}'::text[],
    false,
    'approved',
    8
  ),
  (
    'Maker''s apprentice kit',
    'A curated set of objects that shows next year''s students what this room can make. You decide what goes in it. You decide what it says about what''s possible here.',
    '{All}'::text[],
    false,
    'approved',
    9
  ),
  (
    'Trail map relief',
    'Import a real trail map, overlay a Google Maps base, CNC-carve the relief, laser-engrave the paths and labels. Include a "you are here" marker. The trails already exist — the map doesn''t.',
    '{Void,Prism}'::text[],
    true,
    'approved',
    10
  ),
  (
    'Magic Wheelchair costume',
    'A full costume built around a wheelchair, designed for a specific child. Multi-student, multi-night, real deadline. A Maker Night project, not a solo quest.',
    '{Forge,Folded,Prism}'::text[],
    true,
    'approved',
    11
  ),
  (
    'Fusion 360',
    'When Tinkercad or Carbide Create hits its wall — tolerances, complex curves, imported assemblies — this is what''s next. Steeper curve, dramatically better results.',
    '{Forge,Void}'::text[],
    false,
    'approved',
    12
  ),
  (
    'STL to relief carving',
    'A 3D file becomes a carved surface. A dog''s face. A topographic map. A baseball with laces. Import, toolpath, cut. The machine does what you tell it.',
    '{Void}'::text[],
    false,
    'approved',
    13
  ),
  (
    'Heat-set threaded inserts',
    'Brass in plastic, set with a soldering iron. The joint holds under real load. Not glue. Not friction. A mechanical connection.',
    '{Forge}'::text[],
    false,
    'approved',
    14
  ),
  (
    'Granite Hills signs',
    'Eight needed. More likely coming once the first ones go up. V-carve, weatherproof finish, real place to go back to. Talk to Mr. Cook — the chalkboard has the details.',
    '{Void}'::text[],
    true,
    'approved',
    15
  )
) as seed (title, body, guild_tags, recipient_waiting, status, sort_order)
where not exists (select 1 from public.beyond_tiles limit 1);
