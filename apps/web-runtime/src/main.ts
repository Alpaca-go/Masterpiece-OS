import { startNodeRuntimeHost } from './node-runtime-host.ts';

process.title = 'masterpiece-node-web-runtime';

const port = Number(process.env.MASTERPIECE_WEB_RPC_PORT || 4317);
const allowedOrigin = process.env.MASTERPIECE_WEB_ALLOWED_ORIGIN
  || process.env.MASTERPIECE_WEB_RENDERER_ORIGIN
  || 'http://127.0.0.1:5173';
const host = await startNodeRuntimeHost({ port, allowedOrigin });
console.info(JSON.stringify({
  event: 'NODE_WEB_HOST_READY',
  host: 'node',
  rpcUrl: host.url,
  allowedOrigin,
  operationCount: host.operationCount,
  pid: process.pid,
}));

let closing = false;
async function shutdown(signal: string): Promise<void> {
  if (closing) return;
  closing = true;
  console.info(JSON.stringify({ event: 'NODE_WEB_HOST_STOPPING', signal }));
  await host.close();
  console.info(JSON.stringify({ event: 'NODE_WEB_HOST_STOPPED', signal }));
  process.exitCode = 0;
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void shutdown(signal));
}
