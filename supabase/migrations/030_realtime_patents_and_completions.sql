-- Enable Realtime for tables the student patent pages subscribe to.
-- This lets approval changes push to connected students without a manual refresh.
alter publication supabase_realtime add table public.patents;
alter publication supabase_realtime add table public.skill_completions;
