import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

import path from 'path';
import { fileURLToPath } from 'url';

// Tailwind: postcss.config.mjs (@tailwindcss/postcss). Avoid @tailwindcss/vite here — Forge
// bundles this file with esbuild and cannot load that ESM-only plugin.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config
// Load `VITE_*` from both `app/.env` (canonical) and `app/src/.env` so env is found if the file
// was created in the wrong folder (Vite’s default envDir is `app/`, not `src/`).
export default defineConfig(({ mode }) => {
  const root = __dirname;
  const env = {
    ...loadEnv(mode, path.join(root, 'src'), 'VITE_'),
    ...loadEnv(mode, root, 'VITE_'),
  };

  const defineEnv = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
  );

  return {
    define: defineEnv,
    plugins: [react()],
    server: {
      // Same-origin proxy → master on :3000 (avoids CORS / "Failed to fetch" from Electron renderer → localhost:3000)
      proxy: {
        '/master-api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/master-api/, ''),
        },
      },
    },
  };
});
