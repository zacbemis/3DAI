import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
    build: {
    lib: {
        entry: 'src/main.ts',
      formats: ['es'], // THIS IS THE FIX: Force ES modules
        fileName: () => 'main.js',
    },
    rollupOptions: {
      // Ensure electron and other native nodes are not bundled
        external: ['electron'], 
    },
    },
});
