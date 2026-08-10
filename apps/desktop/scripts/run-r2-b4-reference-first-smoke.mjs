// R2.0 B-4 Reference-First cross-scene smoke launcher.
// Bundles apps/desktop/scripts/r2-b4-reference-first-smoke.ts and runs it
// under Electron so it can read the user's API key from safeStorage.
// This costs provider credits — only run with explicit user authorization.
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
const appRoot = path.join(outDir, 'r2-b4-reference-first-app');
const bundlePath = path.join(outDir, 'r2-b4-reference-first.mjs');

await fs.mkdir(appRoot, { recursive: true });
await build({
  entryPoints: [path.join(desktopRoot, 'scripts', 'r2-b4-reference-first-smoke.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  external: ['electron'],
  outfile: bundlePath,
});
await fs.writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify({
  name: 'masterpiece-r2-b4-reference-first',
  private: true,
  type: 'module',
  main: '../r2-b4-reference-first.mjs',
}, null, 2)}\n`, 'utf8');

const child = spawn(electron, [appRoot], {
  cwd: desktopRoot,
  env: process.env,
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', (error) => {
  process.stderr.write(`Cannot start R2-B4 smoke process: ${error.message}\n`);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
