import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  resolve: { preserveSymlinks: false },
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
