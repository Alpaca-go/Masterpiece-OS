// Phase 9C.2 — Spatial Intent Presets Calibration runner script.
// 用途: bundle phase-9c.2-spatial-calibration.ts 之后用 electron 跑.
// 跟 Phase v1.0 preset-validation / 9C.1 WAYE smoke 同套路 (esbuild + electron).
//
// 必填环境变量:
//   MASTERPIECE_SMOKE_PROJECT_ID_JIUZHOU_AESTHETICS
//   MASTERPIECE_SMOKE_PROJECT_ID_WA_YE
//   MASTERPIECE_SMOKE_PROJECT_ID_FENG_TANG_TANG
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID
//
// 跑法:
//   cd D:\Masterpiece-OS\apps\desktop
//   node scripts/phase-9c.2-spatial-calibration/run-phase-9c.2-spatial-calibration.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import electron from 'electron';
import { build } from 'esbuild';

const desktopRoot = path.resolve(import.meta.dirname, '..', '..');
const outputRoot = path.join(desktopRoot, 'out');
const appRoot = path.join(outputRoot, 'phase-9c.2-spatial-calibration-app');
const bundlePath = path.join(outputRoot, 'phase-9c.2-spatial-calibration.mjs');

await fs.mkdir(appRoot, { recursive: true });
await build({
  entryPoints: [path.join(desktopRoot, 'scripts', 'phase-9c.2-spatial-calibration', 'phase-9c.2-spatial-calibration.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  external: ['electron'],
  outfile: bundlePath,
});
await fs.writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify({
  name: 'masterpiece-phase-9c.2-spatial-calibration',
  private: true,
  type: 'module',
  main: '../phase-9c.2-spatial-calibration.mjs',
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
