// Shared TypeScript types mirroring the Supabase schema.
// Keep in sync with infra/supabase/migrations/001_initial_schema.sql

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type GenerationStatus =
  | "queued"
  | "running"
  | "awaiting_review"
  | "completed"
  | "failed"
  | "cancelled";

export type StepStatus = "running" | "completed" | "failed";

export type AssetKind = "render" | "grid" | "thumbnail";

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Generation {
  id: string;
  user_id: string;
  project_id: string | null;
  prompt: string;
  status: GenerationStatus;
  model: string;
  auto_evaluate: boolean;
  max_steps: number;
  final_score: number | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Step {
  id: string;
  generation_id: string;
  step_number: number;
  status: StepStatus;
  scad_code: string;
  score: number | null;
  feedback: Record<string, unknown> | null;
  user_feedback: string | null;
  error: string | null;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface Asset {
  id: string;
  generation_id: string;
  step_id: string | null;
  kind: AssetKind;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Preset {
  id: string;
  user_id: string;
  name: string;
  config: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Insert types (omit server-generated fields)
// ---------------------------------------------------------------------------

export type ProfileInsert = Pick<Profile, "id" | "email"> &
  Partial<Pick<Profile, "display_name" | "avatar_url">>;

export type ProjectInsert = Pick<Project, "user_id" | "name"> &
  Partial<Pick<Project, "description">>;

export type GenerationInsert = Pick<
  Generation,
  "user_id" | "prompt" | "model"
> &
  Partial<
    Pick<Generation, "project_id" | "auto_evaluate" | "max_steps" | "status">
  >;

export type StepInsert = Pick<Step, "generation_id" | "step_number" | "scad_code"> &
  Partial<Pick<Step, "status" | "score" | "feedback" | "user_feedback" | "error" | "duration_ms">>;

export type AssetInsert = Pick<
  Asset,
  "generation_id" | "kind" | "storage_path" | "file_name" | "mime_type"
> &
  Partial<Pick<Asset, "step_id" | "size_bytes" | "metadata">>;

export type PresetInsert = Pick<Preset, "user_id" | "name"> &
  Partial<Pick<Preset, "config" | "is_default">>;

// ---------------------------------------------------------------------------
// SSE event types
// ---------------------------------------------------------------------------

export interface SseStepEvent {
  type: "step";
  step_number: number;
  status: StepStatus;
  score: number | null;
  feedback: Record<string, unknown> | null;
  asset_urls: Partial<Record<AssetKind, string>>;
}

export type SseStage =
  | "queued"
  | "generating_scad"
  | "compiling"
  | "rendering"
  | "compositing"
  | "evaluating"
  | "revising"
  | "awaiting_review";

export interface SseStatusEvent {
  type: "status";
  stage: SseStage;
}

export interface SseCompleteEvent {
  type: "complete";
  final_score: number | null;
  asset_urls: Partial<Record<AssetKind, string>>;
}

export interface SseErrorEvent {
  type: "error";
  stage: string;
  message: string;
  retryable: boolean;
}

export interface SseCancelledEvent {
  type: "cancelled";
}

export type SseEvent =
  | SseStepEvent
  | SseStatusEvent
  | SseCompleteEvent
  | SseErrorEvent
  | SseCancelledEvent;
