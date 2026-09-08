-- Checkbox ticks used to broadcast the full old+new patent row (replica identity FULL).
-- Gate listeners only need NEW; OLD PK is enough for Realtime filters.
-- StudentReviewAlertSync already treats incomplete payload.old as a heuristic.

alter table public.patents replica identity default;
