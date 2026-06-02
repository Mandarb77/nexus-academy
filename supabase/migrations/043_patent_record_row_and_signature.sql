-- Patent ledger redo — additive columns for Record panel row vii + maker's signature.
-- UI: src/components/PatentLedger.tsx | both nullable, safe to apply anytime.
--
-- field_5            — Record panel row vii (reflective close). Null = not answered.
-- maker_signature_url — public URL of the maker's signature image in patent-uploads bucket.
--
-- The ledger UI treats both as optional and tolerates their absence (best-effort read/write),
-- so the form keeps working even if this migration has not been applied yet.

alter table public.patents
  add column if not exists field_5 text,
  add column if not exists maker_signature_url text;
