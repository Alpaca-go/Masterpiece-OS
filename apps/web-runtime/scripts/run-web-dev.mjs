import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRuntimeRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(webRuntimeRoot, '..', '..');
const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const viteCli = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const rendererConfig = path.join(repoRoot, 'apps', 'web', 'vite.config.mjs');
const rpcPort = Number(process.env.MASTERPIECE_WEB_RPC_PORT || 4317);
const rendererPort = Number(process.env.MASTERPIECE_WEB_RENDERER_PORT || 5173);
const rendererOrigin = `http://127.0.0.1:${rendererPort}`;

const commonEnv = {
  ...process.env,
  MASTERPIECE_WEB_RPC_PORT: String(rpcPort),
  MASTERPIECE_WEB_RPC_URL: `http://127.0.0.1:${rpcPort}`,
  MASTERPIECE_WEB_ALLOWED_ORIGIN: rendererOrigin,
};
const children = [
  spawn(process.execPath, [tsxCli, path.join(webRuntimeRoot, 'src', 'main.ts')], {
    cwd: repoRoot,
    env: commonEnv,
    stdio: 'inherit',
  }),
  spawn(process.execPath, [viteCli, '--config', rendererConfig, '--port', String(rendererPort)], {
    cwd: repoRoot,
    env: commonEnv,
    stdio: 'inherit',
  }),
];

function stopChildren() {
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    } else {
      child.kill('SIGTERM');
    }
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    stopChildren();
    process.exit(0);
  });
}
for (const child of children) {
  child.once('exit', (code) => {
    if (code && process.exitCode == null) process.exitCode = code;
    stopChildren();
  });
}

process.stdout.write(`${JSON.stringify({
  event: 'NODE_WEB_RUNTIME_STARTING',
  rendererUrl: rendererOrigin,
  rpcUrl: `http://127.0.0.1:${rpcPort}`,
  electronSpawnCount: 0,
  desktopMainSpawnCount: 0,
})}\n`);
