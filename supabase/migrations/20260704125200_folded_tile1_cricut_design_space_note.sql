-- Folded Path Tile 1 · First Cut: append Cricut Design Space / Cuttle note to quest brief only.

update public.tiles
set tile_description = tile_description || $append$

One important note: don't buy anything in Cricut Design Space. The built-in library costs money. You don't need it — design in Cuttle.xyz, export as SVG, and import it into Design Space. If you want icons or images, the Noun Project (thenounproject.com) has thousands of free SVGs. Check the Field Guide for links.$append$
where slug = 'folded-01-first-cut'
  and coalesce(tile_description, '') not like '%don''t buy anything in Cricut Design Space%';
