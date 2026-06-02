-- Patent ledger — additive column for the "delivery" artifact on the Record panel.
-- UI: src/components/PatentLedger.tsx (Panel iii). Nullable, safe to apply anytime.
--
-- delivery_url — public URL (patent-uploads bucket) of a photo/video of the FINISHED object,
--                ideally with the recipient. Distinct from `upload_url` (the Work-panel proof
--                that the piece was made). The ledger reads/writes this best-effort and tolerates
--                its absence, so the form keeps working even before this migration is applied.

alter table public.patents
  add column if not exists delivery_url text;
