import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import electron from 'electron';
import { build } from 'esbuild';

const desktopRoot = path.resolve(import.meta.dirname, '..');
const outputRoot = path.join(desktopRoot, 'out');
const appRoot = path.join(outputRoot, 'real-provider-visual-decision-smoke-app');
const bundlePath = path.join(outputRoot, 'real-provider-visual-decision-smoke.mjs');

await fs.mkdir(appRoot, { recursive: true });
await build({
  entryPoints: [path.join(desktopRoot, 'scripts', 'real-provider-visual-decision-smoke.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  external: ['electron'],
  outfile: bundlePath,
});
await fs.writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify({
  name: 'masterpiece-real-provider-visual-decision-smoke',
  private: true,
  type: 'module',
  main: '../real-provider-visual-decision-smoke.mjs',
}, null, 2)}\n`, 'utf8');

const child = spawn(electron, [appRoot], {
  cwd: desktopRoot,
  env: process.env,
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', (error) => {
  process.stderr.write(`无法启动 Electron 验收进程：${error.message}\n`);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
