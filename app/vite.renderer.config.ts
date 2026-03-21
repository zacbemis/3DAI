import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Tailwind: postcss.config.mjs (@tailwindcss/postcss). Avoid @tailwindcss/vite here — Forge
// bundles this file with esbuild and cannot load that ESM-only plugin.

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
});
