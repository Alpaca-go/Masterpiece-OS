import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

const configDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve('src/main/index.ts')
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve('src/preload/index.ts'),
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    }
  },
  renderer: {
    root: resolve(configDir, '..', 'web'),
    plugins: [react()],
    build: {
      rollupOptions: {
        input: resolve(configDir, '..', 'web', 'index.html')
      }
    },
    server: {
      proxy: {
        '/_masterpiece': {
          target: process.env.MASTERPIECE_WEB_RPC_URL ?? 'http://127.0.0.1:4317',
          changeOrigin: false
        }
      }
    }
  }
});
