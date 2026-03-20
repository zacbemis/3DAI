---
name: ts_express_compose_mvp
overview: Electron + React desktop app for AI-powered 3D CAD generation. Node.js + Express TypeScript backend, Supabase for auth/data/storage, Docker Compose orchestration.
todos:
  - id: scaffold-monorepo
    content: Create TypeScript monorepo structure with apps/services/packages/infra and base tooling.
    status: pending
  - id: setup-database
    content: Write Supabase migration SQL, RLS policies, storage bucket setup, and shared TypeScript types.
    status: pending
  - id: build-express-api
    content: Implement Express TypeScript API with Supabase auth verification and generation/history endpoints.
    status: pending
  - id: implement-worker-loop
    content: Build Node worker loop for LLM/OpenSCAD/render/evaluate/revise with max step/retry constraints and optional auto-evaluate.
    status: pending
  - id: wire-redis-sse
    content: Integrate BullMQ + Redis pub/sub for queueing and SSE progress streaming.
    status: pending
  - id: frontend-desktop-screens
    content: Implement Electron + React screens for auth, prompt, live steps, final STL viewer, and history.
    status: pending
  - id: compose-dev-stack
    content: Create Docker Compose stack for api, worker, redis and document local development workflow.
    status: pending
isProject: false
---

# MVP Plan: TypeScript + Express + Docker Compose

## Finalized Stack

- Desktop: Electron + React + TypeScript.
- Backend: Node.js + Express + TypeScript (no Python/FastAPI).
- AI Model: Single model (e.g. GPT-4o) handles both SCAD code generation and vision-based evaluation.
- Modeling: OpenSCAD CLI invoked from Node worker service.
- Image composition: Node image library (prefer `sharp`, fallback `jimp`) for 2x2 labeled grid.
- 3D viewer: React Three Fiber (or Three.js directly if needed).
- Realtime updates: Server-Sent Events (SSE).
- Auth/DB/Storage: Supabase (Google OAuth + email/password + Postgres + Storage).
- Orchestration: Docker Compose for MVP.

## Service-Oriented Folder Structure

- [app/](app/) - Electron shell and preload.
- [services/api/](services/api/) - Express API (auth-aware routes, history queries, SSE endpoint).
- [services/worker/](services/worker/) - Background generation pipeline (LLM/OpenSCAD/vision loop).
- [packages/shared/](packages/shared/) - shared TypeScript types for DTOs/events.
- [infra/docker/](infra/docker/) - Docker Compose files and service env templates.
- [infra/supabase/](infra/supabase/) - schema SQL, RLS policy SQL, bucket setup notes.

## Runtime Architecture

- `api` service handles:
  - `POST /api/generations` (create generation + enqueue task)
  - `GET /api/generations/:id/stream` (SSE)
  - `GET /api/generations` (list user's generations)
  - `GET /api/generations/:id` (generation detail with steps + assets)
  - `POST /api/generations/:id/continue` (submit user feedback + trigger next step when auto_evaluate=false)
  - `POST /api/generations/:id/cancel` (cancel a running/awaiting_review generation)
  - `GET /api/generations/:id/steps/:stepNumber/stl` (enqueue on-demand STL compile via worker, return result)
  - `GET /api/projects` / `POST /api/projects` (project management)
  - `GET /api/presets` / `POST /api/presets` (user presets)
- `worker` service handles:
  - **Generation loop:**
    1. LLM creates/revises OpenSCAD code.
    2. Write `step_n.scad` to temp workspace.
    3. Run OpenSCAD to produce 4 angle renders (STL is not persisted — SCAD code is saved in DB).
    4. Combine renders into labeled 2x2 grid. Downscale one render as a thumbnail for history/list views.
    5. Upload render/grid/thumbnail assets to Supabase Storage.
    6. If `auto_evaluate` is true: send renders to the AI model for score/feedback, then revise and loop.
    7. If `auto_evaluate` is false: persist step, set generation status to `awaiting_review`, emit progress, and stop. User reviews and triggers continue via the API.
    8. Persist step and emit progress via Redis pub/sub.
    9. Repeat until score >= 8, max steps reached, or user stops.
  - **On-demand STL compilation:** compiles SCAD code from DB when requested (OpenSCAD only runs in the worker container).
  - **Cancellation:** checks for cancelled status between steps and aborts if found.
- `api` and `worker` coordinate via Redis-backed queue (BullMQ).

## Compose Services (MVP)

- `desktop-dev` (optional local dev wrapper)
- `web` (React dev/build)
- `api` (Express)
- `worker` (Node TS worker)
- `redis` (queue + pub/sub for progress)
- Supabase stays managed cloud (no local supabase containers required for MVP)

## Data Model in Supabase

### `profiles`
Synced from `auth.users` via database trigger.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | FK to auth.users |
| email | text | |
| display_name | text | nullable |
| avatar_url | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `projects`
Optional folders to organize generations.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | → profiles |
| name | text | |
| description | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `generations`
One row per prompt submission.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | → profiles |
| project_id | uuid FK | nullable (ungrouped) |
| prompt | text | the user's natural language request |
| status | enum | queued, running, awaiting_review, completed, failed, cancelled |
| model | text | which AI model was used |
| auto_evaluate | boolean | default true; when false, worker stops after each step for manual review |
| max_steps | int | default 5 |
| final_score | numeric | nullable, set on completion |
| error | text | nullable, set on failure |
| created_at | timestamptz | |
| completed_at | timestamptz | nullable |

### `steps`
Each LLM → compile → evaluate cycle within a generation.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| generation_id | uuid FK | → generations |
| step_number | int | 1-indexed |
| status | enum | running, completed, failed |
| scad_code | text | the OpenSCAD source produced at this step |
| score | numeric | nullable, from vision evaluation (null if auto_evaluate off) |
| feedback | jsonb | nullable, flexible AI model vision response |
| user_feedback | text | nullable, manual feedback from user (auto_evaluate=false flow) |
| error | text | nullable, compilation or processing error for this step |
| duration_ms | int | nullable |
| created_at | timestamptz | |
| completed_at | timestamptz | nullable |

### `assets`
Every file produced during generation.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| generation_id | uuid FK | → generations |
| step_id | uuid FK | nullable (for final/merged assets) |
| kind | enum | render, grid, thumbnail |
| storage_path | text | path in Supabase Storage bucket |
| file_name | text | display name |
| mime_type | text | |
| size_bytes | bigint | nullable |
| metadata | jsonb | nullable (camera angle, dimensions, etc.) |
| created_at | timestamptz | |

### `presets`
Saved user configuration defaults.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | → profiles |
| name | text | |
| config | jsonb | model prefs, max_steps, auto_evaluate default, style hints |
| is_default | boolean | default false |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## Storage Policy

- Private bucket: `generation-assets`.
- Object paths:
  - `users/{user_id}/generations/{generation_id}/step_{n}/...`
  - `users/{user_id}/generations/{generation_id}/final/...`
- Worker uploads renders and grids. SCAD code is stored inline in the `steps` table.
- STL files are **not persisted** — they are compiled on demand from SCAD code via the API.
- API returns short-lived signed URLs for image assets and compiles STLs on the fly for download/3D viewer.

## SSE Event Contracts

- `step`: step number, status, score (if evaluated), feedback, asset URLs.
- `status`: granular stage updates (`queued`, `generating_scad`, `compiling`, `rendering`, `compositing`, `evaluating`, `revising`, `awaiting_review`).
- `complete`: final asset URLs + final score.
- `error`: stage, message, retryable.
- `cancelled`: emitted when a generation is cancelled mid-run.

## Auto-Evaluate Behavior

When `auto_evaluate` is **true** (default):
- After each step's renders are produced, the AI model scores the output via its vision capability.
- If score >= 8, generation completes. Otherwise the model revises using its own feedback.
- Fully autonomous loop up to `max_steps`.

When `auto_evaluate` is **false**:
- After each step's renders are produced, the worker stops and sets generation status to `awaiting_review`.
- The user can inspect the renders in the UI, load the STL on demand in the 3D viewer, and provide written feedback.
- The user triggers `POST /api/generations/:id/continue` with their feedback, which is stored in `steps.user_feedback` and fed to the AI model for the next step.
- Gives the user full control over the refinement process.

## Key Risks and Mitigations

- OpenSCAD process failures/timeouts in containers.
  - Mitigation: explicit timeouts, max 3 compile-retries, stderr-driven repair prompt.
- OAuth in Electron context.
  - Mitigation: browser-based OAuth + deep-link callback and secure token handoff.
- Queue/SSE synchronization complexity.
  - Mitigation: Redis pub/sub channel keyed by generation ID and idempotent status writes in DB.
- Asset storage growth.
  - Mitigation: retention policy for non-final assets (configurable per user/generation age).

## MVP Delivery Phases

1. Monorepo scaffolding (`apps`, `services`, `packages`, `infra`).
2. Supabase schema migration, RLS policies, storage bucket, shared TypeScript types.
3. Express API + auth middleware + Supabase integration.
4. Worker pipeline with OpenSCAD and image grid composition.
5. Redis queue + SSE streaming from generation progress.
6. Desktop UI screens: auth, prompt, live steps, final viewer/history.
7. Docker Compose wiring + dev scripts + env documentation.

## High-Level Flow

```mermaid
flowchart TD
user[DesktopUser] --> desktop[ReactInElectron]
desktop --> api[ExpressAPI]
api --> queue[RedisBullMQ]
queue --> worker[GenerationWorker]
worker --> openscad[OpenSCADCLI]
worker -->|evaluate + generate| ai[AIModel]
worker --> supabase[SupabaseDBStorage]
worker --> pubsub[RedisPubSub]
pubsub --> api
api --> sse[SSEStream]
sse --> desktop
desktop -->|continue / cancel| api
```
