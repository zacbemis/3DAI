-- 001_initial_schema.sql
-- Initial database schema for 3DAI

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type generation_status as enum (
  'queued',
  'running',
  'awaiting_review',
  'completed',
  'failed',
  'cancelled'
);

create type step_status as enum (
  'running',
  'completed',
  'failed'
);

create type asset_kind as enum (
  'render',
  'grid',
  'thumbnail'
);

-- ---------------------------------------------------------------------------
-- profiles — synced from auth.users via trigger
-- ---------------------------------------------------------------------------

create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  display_name text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- projects — optional folders to organise generations
-- ---------------------------------------------------------------------------

create table projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_projects_user on projects (user_id);

-- ---------------------------------------------------------------------------
-- generations — one row per prompt submission
-- ---------------------------------------------------------------------------

create table generations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles (id) on delete cascade,
  project_id    uuid references projects (id) on delete set null,
  prompt        text not null,
  status        generation_status not null default 'queued',
  model         text not null,
  auto_evaluate boolean not null default true,
  max_steps     int not null default 5,
  final_score   numeric,
  error         text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index idx_generations_user    on generations (user_id);
create index idx_generations_project on generations (project_id);
create index idx_generations_status  on generations (status);

-- ---------------------------------------------------------------------------
-- steps — each LLM → compile → evaluate cycle
-- ---------------------------------------------------------------------------

create table steps (
  id            uuid primary key default gen_random_uuid(),
  generation_id uuid not null references generations (id) on delete cascade,
  step_number   int not null,
  status        step_status not null default 'running',
  scad_code     text not null,
  score         numeric,
  feedback      jsonb,
  user_feedback text,
  error         text,
  duration_ms   int,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz,

  constraint uq_step_per_generation unique (generation_id, step_number)
);

create index idx_steps_generation on steps (generation_id);

-- ---------------------------------------------------------------------------
-- assets — every file produced during generation
-- ---------------------------------------------------------------------------

create table assets (
  id            uuid primary key default gen_random_uuid(),
  generation_id uuid not null references generations (id) on delete cascade,
  step_id       uuid references steps (id) on delete set null,
  kind          asset_kind not null,
  storage_path  text not null,
  file_name     text not null,
  mime_type     text not null,
  size_bytes    bigint,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create index idx_assets_generation on assets (generation_id);
create index idx_assets_step       on assets (step_id);
create index idx_assets_kind       on assets (kind);

-- ---------------------------------------------------------------------------
-- presets — saved user configuration defaults
-- ---------------------------------------------------------------------------

create table presets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  name       text not null,
  config     jsonb not null default '{}',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_presets_user on presets (user_id);

-- Ensure at most one default preset per user
create unique index uq_presets_default_per_user
  on presets (user_id) where (is_default = true);

-- ---------------------------------------------------------------------------
-- updated_at auto-refresh
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function public.set_updated_at();

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function public.set_updated_at();

create trigger trg_presets_updated_at
  before update on presets
  for each row execute function public.set_updated_at();
