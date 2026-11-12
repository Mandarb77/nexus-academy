-- Folded Path: rewrite required Tile 3 (keep slug folded-03-thing-that-moves)
-- and insert required Tile 4. Stretch + Tier 2 now unlock after Tile 4.
--
-- Display order: make room after Tile 3 (sort_order 3) for the new required tile.
update public.tiles set sort_order = 9 where slug = 'folded-boss';
update public.tiles set sort_order = 8 where slug = 'folded-tier2-readfield-book';
update public.tiles set sort_order = 7 where slug = 'folded-06-every-color-in-place';
update public.tiles set sort_order = 6 where slug = 'folded-05-complicated-beautiful';
update public.tiles set sort_order = 5 where slug = 'folded-04-one-shirt-one-person';

update public.tiles
set
  skill_name = 'Tile 3 · Your first pop-up mechanism',
  tile_description = $desc$Make a small pop-up for one person you can name. Pick one mechanism from our lesson: parallel creases or converging creases. Make it open, pop up, and close flat without tearing. Make one decision because of who it's for.$desc$,
  recipient_guidance = $hint$a person you can name.$hint$,
  steps = $steps$[
    {"description": "1. Pick your person. Write down one thing about them that will change what you make.", "requiresApproval": false},
    {"description": "2. Choose your mechanism: parallel creases or converging creases.", "requiresApproval": false},
    {"description": "3. Test it on scrap paper first. Fold it, open it, close it.", "requiresApproval": false},
    {"description": "4. Cut and score your real piece on the Cricut. The score lines are what make it work, so check them before you fold.", "requiresApproval": false},
    {"description": "5. Assemble it. Open and close it five times. If it tears or sticks, fix it.", "requiresApproval": false},
    {"description": "6. Take a photo of it open and a photo of it closed.", "requiresApproval": false},
    {"description": "7. Fill out your Patent: who it's for, the decision you made because of them, and what went wrong and what you fixed.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'folded-03-thing-that-moves';

insert into public.tiles (
  guild,
  skill_name,
  slug,
  sort_order,
  quest_kind,
  is_core,
  wp_value,
  gold_value,
  level4_eligible,
  tile_description,
  recipient_guidance,
  chips,
  steps,
  unlock_after_slugs,
  unlock_after_any_slugs
)
values (
  'Folded Path',
  'Tile 4 · Making a short book for a friend',
  'folded-04-short-book-for-a-friend',
  4,
  'required',
  true,
  10,
  3,
  false,
  $desc$Make a short pop-up book for a friend, with a story or idea that's about them. It needs at least three spreads (a spread is two facing pages). Use both parallel creases and converging creases somewhere in the book. You can go further with other mechanisms if you want, and the pop-up channel is a good place to find them.$desc$,
  $hint$a friend you can name.$hint$,
  $chips$[
    {"label": "Cricut", "kind": "platform"},
    {"label": "vinyl", "kind": "technique"},
    {"label": "paper engineering", "kind": "technique"}
  ]$chips$::jsonb,
  $steps$[
    {"description": "1. Pick your friend. Ask them one question about something they love, so you have something real to build the book around.", "requiresApproval": false},
    {"description": "2. Plan your book on paper: three spreads, a sketch of each, and one sentence of story for each.", "requiresApproval": false},
    {"description": "3. Decide which spread uses parallel creases and which uses converging creases. Mark them on your plan.", "requiresApproval": false},
    {"description": "4. Test each mechanism on scrap paper before you cut anything for real.", "requiresApproval": false},
    {"description": "5. Cut and score every page on the Cricut. Keep the score lines clean, since they're what make the pages move.", "requiresApproval": false},
    {"description": "6. Assemble the book. Open and close every spread ten times. If something tears or sticks, fix it.", "requiresApproval": false},
    {"description": "7. Add your words and finish the cover.", "requiresApproval": false},
    {"description": "8. Take a photo of each spread open, and one of the whole book closed.", "requiresApproval": false},
    {"description": "9. Fill out your Patent: your friend's name, what you learned from your question and how it changed the book, which spreads use which mechanism, and what went wrong and what you fixed.", "requiresApproval": false},
    {"description": "10. Give it to your friend.", "requiresApproval": false},
    {"description": "Going further (optional): use another pop-up mechanism you find on the pop-up channel. Name it on your Patent. You don't need to do this to finish the tile.", "requiresApproval": false}
  ]$steps$::jsonb,
  '{folded-03-thing-that-moves}',
  '{}'
)
on conflict (slug) do update set
  guild = excluded.guild,
  skill_name = excluded.skill_name,
  sort_order = excluded.sort_order,
  quest_kind = excluded.quest_kind,
  is_core = excluded.is_core,
  wp_value = excluded.wp_value,
  gold_value = excluded.gold_value,
  level4_eligible = excluded.level4_eligible,
  tile_description = excluded.tile_description,
  recipient_guidance = excluded.recipient_guidance,
  chips = excluded.chips,
  steps = excluded.steps,
  unlock_after_slugs = excluded.unlock_after_slugs,
  unlock_after_any_slugs = excluded.unlock_after_any_slugs;

update public.tiles
set unlock_after_slugs = '{folded-04-short-book-for-a-friend}'
where slug in ('folded-04-one-shirt-one-person', 'folded-tier2-readfield-book');
