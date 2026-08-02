// Phase WAYE Brand Visual Smoke runner script.
// 用途: bundle phase-waye-brand-visual-smoke.ts 然后用 electron 跑.
//
// 必填环境变量:
//   MASTERPIECE_SMOKE_PROJECT_ID        (wa-ye desktop project, e.g. 8d73845c-...)
//   MASTERPIECE_SMOKE_TEXT_PROFILE_ID    (qwen3.6-plus / 文字分析 profile)
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID   (volcengine / Seedream 5.0 Pro image profile)
//
// 跑法:
//   cd D:\Masterpiece-OS\apps\desktop
//   node scripts/phase-waye-brand-visual-smoke/run-phase-waye-brand-visual-smoke.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import electron from 'electron';
import { build } from 'esbuild';

const desktopRoot = path.resolve(import.meta.dirname, '..', '..');
const outputRoot = path.join(desktopRoot, 'out');
const appRoot = path.join(outputRoot, 'phase-waye-brand-visual-smoke-app');
const bundlePath = path.join(outputRoot, 'phase-waye-brand-visual-smoke.mjs');

await fs.mkdir(appRoot, { recursive: true });
await build({
  entryPoints: [path.join(desktopRoot, 'scripts', 'phase-waye-brand-visual-smoke', 'phase-waye-brand-visual-smoke.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  external: ['electron'],
  outfile: bundlePath,
});
await fs.writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify({
  name: 'masterpiece-phase-waye-brand-visual-smoke',
  private: true,
  type: 'module',
  main: '../phase-waye-brand-visual-smoke.mjs',
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
