// R8.6 final smoke launcher.
// Runs the R8.5.2-rc1 frozen generation core (phase9b_quality, refs=0) against
// the live Seedream provider for the R8.6 final smoke set:
//   JZMX reception + entrance, FTT dining/open-kitchen, YJLF reception/consultation.
// Requires a real API key via Electron safeStorage — this costs provider credits.
//
// The underlying runner (r85-redirect-stability-smoke.ts) is parameterized; env
// vars R85_OUTPUT_ROOT / R85_BASELINE_LABEL / R85_REDIRECT_LABEL / R85_RUNID_PREFIX /
// R85_TASKID_PREFIX / R85_EPOCH_LABEL / R85_RUN_INSTRUCTION relabel the emitted
// records as r8.6 golden-baseline artifacts. Defaults keep the R8.5 gate labels.
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
const appRoot = path.join(outDir, 'r86-final-smoke-app');
const bundlePath = path.join(outDir, 'r86-final-smoke.mjs');

await fs.mkdir(appRoot, { recursive: true });
await build({
  entryPoints: [path.join(desktopRoot, 'scripts', 'r85-redirect-stability-smoke.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  external: ['electron'],
  outfile: bundlePath,
});
await fs.writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify({
  name: 'masterpiece-r86-final-smoke',
  private: true,
  type: 'module',
  main: '../r86-final-smoke.mjs',
}, null, 2)}\n`, 'utf8');

const child = spawn(electron, [appRoot], {
  cwd: desktopRoot,
  env: process.env,
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', (error) => {
  process.stderr.write(`无法启动 R8.6 final smoke 进程：${error.message}\n`);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
