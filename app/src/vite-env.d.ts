/// <reference types="vite/client" />

/** Injected by Electron Forge Vite plugin in the main process bundle */
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_REDIRECT_TO?: string;
  /** Master API base URL (e.g. http://127.0.0.1:3000) */
  readonly VITE_MASTER_API_URL?: string;
  /** Set to `true` with Vite dev + `server.proxy` to use `/master-api` (optional) */
  readonly VITE_MASTER_USE_PROXY?: string;
  /** Optional overrides when not using in-app project context */
  readonly VITE_MASTER_USER_ID?: string;
  readonly VITE_MASTER_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
