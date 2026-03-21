/// <reference types="vite/client" />

/** Injected by Electron Forge Vite plugin in the main process bundle */
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_REDIRECT_TO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
