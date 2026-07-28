import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, '..');
const cli = path.join(desktopRoot, 'node_modules', 'electron-vite', 'bin', 'electron-vite.js');

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
