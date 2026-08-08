// R8.5 redirected stability smoke launcher.
// Runs 3 text-only JZMX reception generations against the live Seedream
// provider using the Phase 9B action-verb IR compiler. Requires a real API
// key via Electron safeStorage — this costs provider credits.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const electron = require('electron');
const { build } = await import('esbuild');

const desktopRoot = path.resolve(__dirname, '..');
const outDir = path.join(desktopRoot, 'out');
const appRoot = path.join(outDir, 'r85-redirect-stability-app');
const bundlePath = path.join(outDir, 'r85-redirect-stability.mjs');

await fs.mkdir(appRoot, { recursive: true });
await build({
  entryPoints: [path.join(desktopRoot, 'scripts', 'r85-redirect-stability-smoke.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  external: ['electron'],
  outfile: bundlePath,
});
await fs.writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify({
  name: 'masterpiece-r85-redirect-stability',
  private: true,
  type: 'module',
  main: '../r85-redirect-stability.mjs',
}, null, 2)}\n`, 'utf8');

const child = spawn(electron, [appRoot], {
  cwd: desktopRoot,
  env: process.env,
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', (error) => {
  process.stderr.write(`无法启动 R8.5 stability smoke 进程：${error.message}\n`);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
