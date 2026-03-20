-- 001_rls_policies.sql
-- Row Level Security: users can only access their own data.

-- ---------------------------------------------------------------------------
-- Enable RLS on all tables
-- ---------------------------------------------------------------------------

alter table profiles    enable row level security;
alter table projects    enable row level security;
alter table generations enable row level security;
alter table steps       enable row level security;
alter table assets      enable row level security;
alter table presets     enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------

create policy "Users can view own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can create own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- generations
-- ---------------------------------------------------------------------------

create policy "Users can view own generations"
  on generations for select
  using (auth.uid() = user_id);

create policy "Users can create own generations"
  on generations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own generations"
  on generations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own generations"
  on generations for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- steps — access via parent generation ownership
-- ---------------------------------------------------------------------------

create policy "Users can view steps of own generations"
  on steps for select
  using (
    exists (
      select 1 from generations g
      where g.id = generation_id and g.user_id = auth.uid()
    )
  );

create policy "Users can insert steps for own generations"
  on steps for insert
  with check (
    exists (
      select 1 from generations g
      where g.id = generation_id and g.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- assets — access via parent generation ownership
-- ---------------------------------------------------------------------------

create policy "Users can view assets of own generations"
  on assets for select
  using (
    exists (
      select 1 from generations g
      where g.id = generation_id and g.user_id = auth.uid()
    )
  );

create policy "Users can insert assets for own generations"
  on assets for insert
  with check (
    exists (
      select 1 from generations g
      where g.id = generation_id and g.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- presets
-- ---------------------------------------------------------------------------

create policy "Users can view own presets"
  on presets for select
  using (auth.uid() = user_id);

create policy "Users can create own presets"
  on presets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own presets"
  on presets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own presets"
  on presets for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Service-role bypass
-- ---------------------------------------------------------------------------
-- The API and worker services use the service_role key which bypasses RLS.
-- These policies only govern access via the anon/authenticated key (frontend).
