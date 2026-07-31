// vite.renderer.config.mjs
// Renderer-only Vite dev server. The full electron.vite.config.ts
// drives the main + preload + renderer pipeline; here we strip
// down to just the renderer so the user can open the UI in a
// browser even when the Electron binary is unavailable (e.g. the
// postinstall download was blocked).
//
// The IPC bridge that the renderer normally talks to over Electron
// preload is unreachable here, so API calls will fail. The UI shell
// still loads so you can sanity-check styling, layout, and
// navigation flows. Use this only as a fallback when the regular
// `npm run web:dev` cannot start Electron.

import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoRoot = resolve(__dirname, '..', '..');

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
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
