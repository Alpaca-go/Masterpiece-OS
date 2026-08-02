// Phase v1.0 Spatial Intent Presets Validation Smoke runner script.
// 用途: bundle phase-v1-preset-validation.ts 之后用 electron 跑.
// 跟 9C.1 WAYE smoke 一个套路 (esbuild bundle + electron spawn).
//
// 必填环境变量:
//   MASTERPIECE_SMOKE_BRAND_KEY         = 'jiuzhou-aesthetics'
//   MASTERPIECE_SMOKE_PROJECT_ID        = desktop project id (e.g. 九州美学-a7a56ed7-<uuid>)
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID  = image profile id (Seedream 5.0 Pro)
//   MASTERPIECE_SMOKE_SPACE_TYPE        = 'exterior' (default)
//
// 可选:
//   MASTERPIECE_SMOKE_USER_DATA, MASTERPIECE_SMOKE_SIZE, MASTERPIECE_SMOKE_REPO_ROOT,
//   MASTERPIECE_SMOKE_OUTPUT_DIR
//
// 跑法:
//   1. 复制 JZMX-ARCH-01.png 到 <dataPath>/<projectId>/input/assets/JZMX-ARCH-01-reference.png
//      (harness 会在第一次跑时自动复制 — 如果不存在)
//   2. 跑:
//      cd D:\Masterpiece-OS\apps\desktop
//      node scripts/phase-v1-preset-validation/run-phase-v1-preset-validation.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import electron from 'electron';
import { build } from 'esbuild';

const desktopRoot = path.resolve(import.meta.dirname, '..', '..');
const outputRoot = path.join(desktopRoot, 'out');
const appRoot = path.join(outputRoot, 'phase-v1-preset-validation-app');
const bundlePath = path.join(outputRoot, 'phase-v1-preset-validation.mjs');

await fs.mkdir(appRoot, { recursive: true });
await build({
  entryPoints: [path.join(desktopRoot, 'scripts', 'phase-v1-preset-validation', 'phase-v1-preset-validation.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  external: ['electron'],
  outfile: bundlePath,
});
await fs.writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify({
  name: 'masterpiece-phase-v1-preset-validation',
  private: true,
  type: 'module',
  main: '../phase-v1-preset-validation.mjs',
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
