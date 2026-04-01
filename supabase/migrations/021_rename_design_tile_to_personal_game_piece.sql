-- Rename Forge tile in existing databases.
-- Keeps tile IDs stable so existing completions/patents remain linked.

update public.tiles
set skill_name = 'Design Your Personal Game Piece'
where lower(trim(guild)) = 'forge'
  and lower(regexp_replace(trim(skill_name), '\s+', ' ', 'g')) = 'design for 3d printing';

