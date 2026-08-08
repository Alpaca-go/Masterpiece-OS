// Electron launcher for the Phase R8 golden image generator.
// Bundles generate-golden-images.ts with esbuild and runs it under Electron
// so safeStorage can decrypt the Desktop API key.
//
// Usage from repo root:
//   node apps/desktop/scripts/run-golden-images.mjs
//   $env:SPACE_GOLDEN_BRAND='jiuzhou-aesthetics'; node apps/desktop/scripts/run-golden-images.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import electron from 'electron';
import { build } from 'esbuild';

const desktopRoot = path.resolve(import.meta.dirname, '..');
const outputRoot = path.join(desktopRoot, 'out');
const appRoot = path.join(outputRoot, 'golden-images-app');
const bundlePath = path.join(outputRoot, 'golden-images.mjs');

await fs.mkdir(appRoot, { recursive: true });
await build({
  entryPoints: [path.join(desktopRoot, 'scripts', 'space-quality', 'generate-golden-images.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  external: ['electron'],
  outfile: bundlePath,
});
await fs.writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify({
  name: 'masterpiece-golden-images',
  private: true,
  type: 'module',
  main: '../golden-images.mjs',
}, null, 2)}\n`, 'utf8');

const child = spawn(electron, [appRoot], {
  cwd: desktopRoot,
  env: {
    ...process.env,
    SPACE_AB_REPO_ROOT: path.resolve(desktopRoot, '..', '..'),
  },
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', (error) => {
  process.stderr.write(`无法启动 Electron golden image 进程: ${error.message}\n`);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
