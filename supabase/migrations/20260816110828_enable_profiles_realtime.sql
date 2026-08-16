-- Live WP/gold on student Workshop without a manual refresh.
-- AuthContext already subscribes to profiles UPDATE; 005 left this publication line commented.

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end;
$$;
