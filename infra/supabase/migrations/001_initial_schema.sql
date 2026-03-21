-- 001_initial_schema.sql
-- 3DAI database schema: users, projects, prompts

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type prompt_status as enum (
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- users — synced from auth.users via trigger
-- ---------------------------------------------------------------------------

create table users (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text,
  avatar_url   text,
  defaults     jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column users.defaults is
  'User-level defaults: model, max_steps, auto_evaluate, style hints';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
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
-- projects — owned by a user, groups related prompts
-- ---------------------------------------------------------------------------

create table projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  name        text not null,
  description text,
  config      jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on column projects.config is
  'Project-level overrides: model, max_steps, auto_evaluate';

create index idx_projects_user on projects (user_id);

-- ---------------------------------------------------------------------------
-- prompts — one row per user prompt, stores final result
-- ---------------------------------------------------------------------------

create table prompts (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects (id) on delete cascade,
  user_id      uuid not null references users (id) on delete cascade,
  prompt       text not null,
  scad_code    text,
  status       prompt_status not null default 'queued',
  score        numeric,
  error        text,
  model        text not null,
  auto_evaluate boolean not null default true,
  max_steps    int not null default 5 check (max_steps between 1 and 20),
  created_at   timestamptz not null default now(),
  completed_at timestamptz,

  constraint chk_score_range check (score is null or score between 0 and 10)
);

comment on column prompts.scad_code is
  'Final/best OpenSCAD code produced by the generation loop. Null while generating.';
comment on column prompts.score is
  'Final vision-model score (null if auto_evaluate was off or generation failed).';
comment on column prompts.user_id is
  'Denormalised from projects for RLS and simpler queries.';

create index idx_prompts_project on prompts (project_id);
create index idx_prompts_user    on prompts (user_id);
create index idx_prompts_status  on prompts (status);
create index idx_prompts_created on prompts (project_id, created_at desc);

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

create trigger trg_users_updated_at
  before update on users
  for each row execute function public.set_updated_at();

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function public.set_updated_at();
