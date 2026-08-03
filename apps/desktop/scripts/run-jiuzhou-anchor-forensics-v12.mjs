import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import electron from 'electron';
import { build } from 'esbuild';

const desktopRoot = path.resolve(import.meta.dirname, '..');
const outputRoot = path.join(desktopRoot, 'out');
const appRoot = path.join(outputRoot, 'jiuzhou-anchor-forensics-v12-app');
const bundlePath = path.join(outputRoot, 'jiuzhou-anchor-forensics-v12.mjs');

await fs.mkdir(appRoot, { recursive: true });
await build({
  entryPoints: [path.join(desktopRoot, 'scripts', 'jiuzhou-anchor-forensics-v12.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  external: ['electron'],
  outfile: bundlePath,
});
await fs.writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify({
  name: 'masterpiece-jiuzhou-anchor-forensics-v12',
  private: true,
  type: 'module',
  main: '../jiuzhou-anchor-forensics-v12.mjs',
}, null, 2)}\n`, 'utf8');

const childEnv = { ...process.env };
delete childEnv.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, [appRoot], {
  cwd: desktopRoot,
  env: childEnv,
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', (error) => {
  process.stderr.write(`无法启动 Electron 取证跑批进程: ${error.message}\n`);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
