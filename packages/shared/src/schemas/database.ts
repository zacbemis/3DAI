// Shared TypeScript types mirroring the Supabase schema.
// Keep in sync with infra/supabase/migrations/001_initial_schema.sql

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type PromptStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  defaults: UserDefaults;
  created_at: string;
  updated_at: string;
}

export interface UserDefaults {
  model?: string;
  max_steps?: number;
  auto_evaluate?: boolean;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  config: ProjectConfig;
  created_at: string;
  updated_at: string;
}

export interface ProjectConfig {
  model?: string;
  max_steps?: number;
  auto_evaluate?: boolean;
}

export interface Prompt {
  id: string;
  project_id: string;
  user_id: string;
  prompt: string;
  scad_code: string | null;
  status: PromptStatus;
  score: number | null;
  error: string | null;
  model: string;
  auto_evaluate: boolean;
  max_steps: number;
  created_at: string;
  completed_at: string | null;
}

// ---------------------------------------------------------------------------
// Insert types (omit server-generated fields)
// ---------------------------------------------------------------------------

export type UserInsert = Pick<User, "id" | "email"> &
  Partial<Pick<User, "display_name" | "avatar_url" | "defaults">>;

export type ProjectInsert = Pick<Project, "user_id" | "name"> &
  Partial<Pick<Project, "description" | "config">>;

export type PromptInsert = Pick<Prompt, "project_id" | "user_id" | "prompt" | "model"> &
  Partial<Pick<Prompt, "auto_evaluate" | "max_steps" | "status">>;

export type PromptUpdate = Partial<
  Pick<Prompt, "scad_code" | "status" | "score" | "error" | "completed_at">
>;

export type ProjectUpdate = Partial<
  Pick<Project, "name" | "description" | "config">
>;

export type UserUpdate = Partial<
  Pick<User, "display_name" | "avatar_url" | "defaults">
>;

// ---------------------------------------------------------------------------
// SSE event types (streamed during generation)
// ---------------------------------------------------------------------------

export type SseStage =
  | "queued"
  | "generating_scad"
  | "compiling"
  | "rendering"
  | "compositing"
  | "evaluating"
  | "revising";

export interface SseStatusEvent {
  type: "status";
  stage: SseStage;
  step: number;
  max_steps: number;
}

export interface SseCompleteEvent {
  type: "complete";
  score: number | null;
  scad_code: string;
}

export interface SseErrorEvent {
  type: "error";
  message: string;
  retryable: boolean;
}

export interface SseCancelledEvent {
  type: "cancelled";
}

export type SseEvent =
  | SseStatusEvent
  | SseCompleteEvent
  | SseErrorEvent
  | SseCancelledEvent;

// ---------------------------------------------------------------------------
// Storage path helpers
// ---------------------------------------------------------------------------

export function renderBasePath(userId: string, promptId: string): string {
  return `users/${userId}/prompts/${promptId}`;
}

export function gridPath(userId: string, promptId: string): string {
  return `${renderBasePath(userId, promptId)}/grid.png`;
}

export function thumbnailPath(userId: string, promptId: string): string {
  return `${renderBasePath(userId, promptId)}/thumbnail.png`;
}
