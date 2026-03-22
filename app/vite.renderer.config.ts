import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import path from 'path';

// Tailwind: postcss.config.mjs (@tailwindcss/postcss). Avoid @tailwindcss/vite here — Forge
// bundles this file with esbuild and cannot load that ESM-only plugin.

// https://vitejs.dev/config
export default defineConfig({
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
});
