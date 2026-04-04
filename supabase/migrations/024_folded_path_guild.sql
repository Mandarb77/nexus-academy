-- Add the Folded Path guild with its single patent-flow quest tile.
insert into public.tiles (guild, skill_name, wp_value) values
  ('Folded Path', 'Design Your Personal Sticker', 20)
on conflict (guild, skill_name) do nothing;
