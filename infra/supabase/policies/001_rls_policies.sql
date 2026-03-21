-- 001_rls_policies.sql
-- Row Level Security: users can only access their own data.
-- The API service uses the service_role key which bypasses RLS.
-- These policies govern access via the anon/authenticated key (frontend/Electron app).
-- Note: user rows are created by the handle_new_user trigger (security definer), not by the client.

alter table users    enable row level security;
alter table projects enable row level security;
alter table prompts  enable row level security;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

create policy "Users can view own profile"
  on users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on users for update
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
-- prompts
-- ---------------------------------------------------------------------------

create policy "Users can view own prompts"
  on prompts for select
  using (auth.uid() = user_id);

create policy "Users can create own prompts"
  on prompts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own prompts"
  on prompts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own prompts"
  on prompts for delete
  using (auth.uid() = user_id);
