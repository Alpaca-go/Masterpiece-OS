// Phase 9B Spatial Intelligence Smoke runner script
// 用途: bundle phase-9b-spatial-intelligence-smoke.ts 然后用 electron 跑.
//
// 必填环境变量:
//   MASTERPIECE_SMOKE_PROJECT_ID
//   MASTERPIECE_SMOKE_TEXT_PROFILE_ID
//   MASTERPIECE_SMOKE_IMAGE_PROFILE_ID
//   MASTERPIECE_SMOKE_BRAND_KEY ('jiuzhou-aesthetics' | 'feng-tang-tang' | 'yi-ji-liang-fang')
//   MASTERPIECE_SMOKE_DNA_PATH (绝对路径)
//   MASTERPIECE_SMOKE_SPATIAL_INTENT_PATH (绝对路径)
//
// 跑法:
//   cd apps/desktop
//   node scripts/phase-9b/run-phase-9b-smoke.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import electron from 'electron';
import { build } from 'esbuild';

const desktopRoot = path.resolve(import.meta.dirname, '..', '..');
const outputRoot = path.join(desktopRoot, 'out');
const appRoot = path.join(outputRoot, 'phase-9b-smoke-app');
const bundlePath = path.join(outputRoot, 'phase-9b-spatial-intelligence-smoke.mjs');

await fs.mkdir(appRoot, { recursive: true });
await build({
  entryPoints: [path.join(desktopRoot, 'scripts', 'phase-9b', 'phase-9b-spatial-intelligence-smoke.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  external: ['electron'],
  outfile: bundlePath,
});
await fs.writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify({
  name: 'masterpiece-phase-9b-smoke',
  private: true,
  type: 'module',
  main: '../phase-9b-spatial-intelligence-smoke.mjs',
}, null, 2)}\n`, 'utf8');

const child = spawn(electron, [appRoot], {
  cwd: desktopRoot,
  env: process.env,
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
