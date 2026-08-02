// Phase 9C v0.1 Brands smoke runner script
// 用途: bundle phase-9c-v0.1-brands-smoke.ts 然后用 electron 跑.
//
// 必填环境变量:
//   MASTERPIECE_SMOKE_BRAND_KEY         ('feng-tang-tang' | 'yi-ji-liang-fang' | 'wa-ye')
//   MASTERPIECE_SMOKE_PROJECT_ID
//   MASTERPIECE_SMOKE_ASSET_ID
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID
//
// 可选:
//   MASTERPIECE_SMOKE_USER_DATA, MASTERPIECE_SMOKE_SIZE, MASTERPIECE_SMOKE_REPO_ROOT
//   MASTERPIECE_SMOKE_USE_PHASE_9C (默认 true, 设 'false' 强制 base v0.1)
//
// 跑法:
//   cd D:\Masterpiece-OS\apps\desktop
//   node scripts/phase-9c-v0.1-brands/run-phase-9c-v0.1-brands.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import electron from 'electron';
import { build } from 'esbuild';

const desktopRoot = path.resolve(import.meta.dirname, '..', '..');
const outputRoot = path.join(desktopRoot, 'out');
const appRoot = path.join(outputRoot, 'phase-9c-v0.1-brands-app');
const bundlePath = path.join(outputRoot, 'phase-9c-v0.1-brands-smoke.mjs');

await fs.mkdir(appRoot, { recursive: true });
await build({
  entryPoints: [path.join(desktopRoot, 'scripts', 'phase-9c-v0.1-brands', 'phase-9c-v0.1-brands-smoke.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  external: ['electron'],
  outfile: bundlePath,
});
await fs.writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify({
  name: 'masterpiece-phase-9c-v0.1-brands',
  private: true,
  type: 'module',
  main: '../phase-9c-v0.1-brands-smoke.mjs',
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
