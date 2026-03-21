-- 001_bucket_setup.sql
-- Storage bucket for render images (grids, thumbnails).
-- STL files are cached on the user's local filesystem, not in cloud storage.

insert into storage.buckets (id, name, public)
values ('renders', 'renders', false)
on conflict (id) do nothing;

-- Convention-based paths:
--   users/{user_id}/prompts/{prompt_id}/grid.png
--   users/{user_id}/prompts/{prompt_id}/thumbnail.png
--   users/{user_id}/prompts/{prompt_id}/render_{angle}.png

create policy "Users can upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'renders'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can view own renders"
  on storage.objects for select
  using (
    bucket_id = 'renders'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can delete own renders"
  on storage.objects for delete
  using (
    bucket_id = 'renders'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
