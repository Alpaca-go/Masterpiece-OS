import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, '..');
// npm-workspaces hoists electron-vite to the root node_modules; the local
// apps/desktop/node_modules copy no longer exists. Try the root first,
// then the local one for safety.
const repoRoot = path.resolve(desktopRoot, '..', '..');
const cli = [path.join(repoRoot, 'node_modules', 'electron-vite', 'bin', 'electron-vite.js'), path.join(desktopRoot, 'node_modules', 'electron-vite', 'bin', 'electron-vite.js')].find((p) => existsSync(p));

const child = spawn(process.execPath, [cli, 'dev'], {
  cwd: desktopRoot,
  env: {
    ...process.env,
    MASTERPIECE_WEB_MODE: '1',
    MASTERPIECE_WEB_RPC_PORT: process.env.MASTERPIECE_WEB_RPC_PORT || '4317'
  },
  stdio: 'inherit'
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => child.kill(signal));
}

child.once('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exitCode = code ?? 1;
});
