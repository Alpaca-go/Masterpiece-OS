// Phase 9C.2 — Reports-only runner (re-generate per-preset & integrated reports
// from already-saved outputs, without re-running image generation).
//
// 用法: cd D:\Masterpiece-OS\apps\desktop
//   node scripts/phase-9c.2-spatial-calibration/run-report-only.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import electron from 'electron';

const desktopRoot = path.resolve(import.meta.dirname, '..', '..');
const REPO_ROOT = process.env.MASTERPIECE_SMOKE_REPO_ROOT?.trim()
  || path.resolve(desktopRoot, '..', '..');
const OUTPUT_DIR = process.env.MASTERPIECE_SMOKE_OUTPUT_DIR?.trim()
  || path.join(REPO_ROOT, 'docs', 'reference', 'phase-9c.2-calibration');
const TESTS_ROOT = path.join(REPO_ROOT, 'space-generator', 'v1-experimental', 'tests', 'spatial-calibration');

const bundlePath = path.join(desktopRoot, 'out', 'phase-9c.2-report-only.mjs');
const appRoot = path.join(desktopRoot, 'out', 'phase-9c.2-report-only-app');
await fs.mkdir(appRoot, { recursive: true });

await build({
  entryPoints: [path.join(desktopRoot, 'scripts', 'phase-9c.2-spatial-calibration', 'phase-9c.2-report-only.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  external: ['electron'],
  outfile: bundlePath,
});
await fs.writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify({
  name: 'masterpiece-phase-9c.2-report-only',
  private: true,
  type: 'module',
  main: '../phase-9c.2-report-only.mjs',
}, null, 2)}\n`, 'utf8');

const child = spawn(electron, [appRoot], {
  cwd: desktopRoot,
  env: { ...process.env, MASTERPIECE_SMOKE_REPO_ROOT: REPO_ROOT },
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', (err) => { process.stderr.write(`Cannot start: ${err.message}\n`); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
