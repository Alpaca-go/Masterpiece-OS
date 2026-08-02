// Phase 9C Vertical Test smoke runner script
// 用途: bundle phase-9c-vertical-test-smoke.ts 然后用 electron 跑.
//
// 必填环境变量:
//   MASTERPIECE_SMOKE_PROJECT_ID
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID
//
// 可选环境变量:
//   MASTERPIECE_SMOKE_BRAND_KEY   (默认 'jiuzhou-aesthetics')
//   MASTERPIECE_SMOKE_SIZE        (默认 '1024*576' 16:9)
//   MASTERPIECE_SMOKE_USER_DATA   (默认 APPDATA/masterpiece-os-desktop)
//   MASTERPIECE_SMOKE_REPO_ROOT   (默认 desktop/../..)
//   MASTERPIECE_SMOKE_SCENE_IDS   (默认全 8 个, 逗号分隔子集)
//
// 跑法:
//   cd D:\Masterpiece-OS\apps\desktop
//   node scripts/phase-9c-vertical-test/run-phase-9c-vertical-test.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import electron from 'electron';
import { build } from 'esbuild';

const desktopRoot = path.resolve(import.meta.dirname, '..', '..');
const outputRoot = path.join(desktopRoot, 'out');
const appRoot = path.join(outputRoot, 'phase-9c-vertical-test-app');
const bundlePath = path.join(outputRoot, 'phase-9c-vertical-test-smoke.mjs');

await fs.mkdir(appRoot, { recursive: true });
await build({
  entryPoints: [path.join(desktopRoot, 'scripts', 'phase-9c-vertical-test', 'phase-9c-vertical-test-smoke.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  external: ['electron'],
  outfile: bundlePath,
});
await fs.writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify({
  name: 'masterpiece-phase-9c-vertical-test',
  private: true,
  type: 'module',
  main: '../phase-9c-vertical-test-smoke.mjs',
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
