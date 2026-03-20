-- 001_bucket_setup.sql
-- Storage bucket and policies for generation assets.
--
-- Run this via the Supabase SQL editor or include in a migration.
-- The storage schema is managed by Supabase; these use the storage API tables.

-- ---------------------------------------------------------------------------
-- Create the private bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('generation-assets', 'generation-assets', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Storage policies — scoped to each user's own folder
-- ---------------------------------------------------------------------------

create policy "Users can upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'generation-assets'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can view own assets"
  on storage.objects for select
  using (
    bucket_id = 'generation-assets'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can delete own assets"
  on storage.objects for delete
  using (
    bucket_id = 'generation-assets'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
