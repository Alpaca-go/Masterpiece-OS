// vite.renderer.config.mjs
// Renderer-only Vite dev server for the primary Web entry. Runtime calls are
// proxied to apps/web-runtime's Node HTTP host. Electron keeps its separate
// electron.vite.config.ts pipeline and does not participate in this entry.

import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoRoot = resolve(__dirname, '..', '..');

export default defineConfig({
  root: resolve(__dirname, '..', 'web'),
  plugins: [react()],
  resolve: {
    preserveSymlinks: false,
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: true,
    proxy: {
      '/_masterpiece': {
        target: process.env.MASTERPIECE_WEB_RPC_URL ?? 'http://127.0.0.1:4317',
        changeOrigin: false,
      },
    },
  },
});
