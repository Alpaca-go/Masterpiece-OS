// Phase 9C.1 WAYE smoke runner script
// 用途: bundle phase-9c.1-waye-smoke.ts 然后用 electron 跑.
//
// 必填环境变量:
//   MASTERPIECE_SMOKE_BRAND_KEY         = 'wa-ye'
//   MASTERPIECE_SMOKE_PROJECT_ID        = desktop project id (e.g. 蛙耶-<uuid>)
//   MASTERPIECE_SMOKE_ASSET_ID          = project asset id (use first image)
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID  = image generation profile id (volcengine / Seedream)
//
// 可选:
//   MASTERPIECE_SMOKE_USER_DATA, MASTERPIECE_SMOKE_SIZE, MASTERPIECE_SMOKE_REPO_ROOT
//
// 跑法:
//   cd D:\Masterpiece-OS\apps\desktop
//   node scripts/phase-9c.1-waye-smoke/run-phase-9c.1-waye-smoke.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import electron from 'electron';
import { build } from 'esbuild';

const desktopRoot = path.resolve(import.meta.dirname, '..', '..');
const outputRoot = path.join(desktopRoot, 'out');
const appRoot = path.join(outputRoot, 'phase-9c.1-waye-smoke-app');
const bundlePath = path.join(outputRoot, 'phase-9c.1-waye-smoke.mjs');

await fs.mkdir(appRoot, { recursive: true });
await build({
  entryPoints: [path.join(desktopRoot, 'scripts', 'phase-9c.1-waye-smoke', 'phase-9c.1-waye-smoke.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  external: ['electron'],
  outfile: bundlePath,
});
await fs.writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify({
  name: 'masterpiece-phase-9c.1-waye-smoke',
  private: true,
  type: 'module',
  main: '../phase-9c.1-waye-smoke.mjs',
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
