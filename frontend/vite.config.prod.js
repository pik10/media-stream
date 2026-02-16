import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production config - API requests will be proxied by nginx
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000
  }
});
