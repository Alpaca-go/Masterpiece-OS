// Phase 9C.2 v2 — Brand Identity Validation & Spatial Strategy Selection runner script.
// 用途: bundle phase-9c.2-spatial-validation.ts 然后用 electron 跑.
// 跟 Phase 9C.2 v1 / 9C.1 WAYE smoke 同套路 (esbuild + electron).
//
// 必填环境变量:
//   MASTERPIECE_SMOKE_PROJECT_ID_JIUZHOU_AESTHETICS
//   MASTERPIECE_SMOKE_PROJECT_ID_WA_YE
//   MASTERPIECE_SMOKE_PROJECT_ID_FENG_TANG_TANG
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID
//   MASTERPIECE_SMOKE_PROJECT_ID_JZMX_ASSET_ID  (JZMX-ARCH-01 asset id)
//
// 跑法:
//   cd D:\Masterpiece-OS\apps\desktop
//   node scripts/phase-9c.2-spatial-validation/run-phase-9c.2-spatial-validation.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import electron from 'electron';
import { build } from 'esbuild';

const desktopRoot = path.resolve(import.meta.dirname, '..', '..');
const outputRoot = path.join(desktopRoot, 'out');
const appRoot = path.join(outputRoot, 'phase-9c.2-spatial-validation-app');
const bundlePath = path.join(outputRoot, 'phase-9c.2-spatial-validation.mjs');

await fs.mkdir(appRoot, { recursive: true });
await build({
  entryPoints: [path.join(desktopRoot, 'scripts', 'phase-9c.2-spatial-validation', 'phase-9c.2-spatial-validation.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  external: ['electron'],
  outfile: bundlePath,
});
await fs.writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify({
  name: 'masterpiece-phase-9c.2-spatial-validation',
  private: true,
  type: 'module',
  main: '../phase-9c.2-spatial-validation.mjs',
}, null, 2)}\n`, 'utf8');

const child = spawn(electron, [appRoot], {
  cwd: desktopRoot,
  env: { ...process.env, MASTERPIECE_SMOKE_REPO_ROOT: path.resolve(desktopRoot, '..', '..') },
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', (error) => {
  process.stderr.write(`Cannot start Electron process: ${error.message}\n`);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
