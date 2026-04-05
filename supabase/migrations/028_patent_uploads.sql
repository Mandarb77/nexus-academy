-- Add upload_url column to store the submitted photo/video URL.
alter table public.patents
  add column if not exists upload_url text;

-- Create the patent-uploads storage bucket (public so URLs work without signed tokens).
insert into storage.buckets (id, name, public, file_size_limit)
values ('patent-uploads', 'patent-uploads', true, 104857600)   -- 100 MB
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- Students may upload only into their own folder  (path = <student_uuid>/<plan_id>/filename)
drop policy if exists "Students upload own patent files" on storage.objects;
create policy "Students upload own patent files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'patent-uploads'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Students may replace / delete their own files
drop policy if exists "Students update own patent files" on storage.objects;
create policy "Students update own patent files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'patent-uploads'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "Students delete own patent files" on storage.objects;
create policy "Students delete own patent files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'patent-uploads'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Public read (bucket is public so files are reachable by URL already, but add policy for completeness)
drop policy if exists "Public read patent uploads" on storage.objects;
create policy "Public read patent uploads"
  on storage.objects for select to public
  using (bucket_id = 'patent-uploads');
