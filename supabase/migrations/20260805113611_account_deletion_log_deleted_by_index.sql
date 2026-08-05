create index account_deletion_log_deleted_by_idx
  on public.account_deletion_log (deleted_by);
