import assert from 'node:assert/strict';
import test from 'node:test';
import { startWebRpcServer } from '../src/main/web-rpc-server';

test('web RPC server invokes allow-listed handlers and exposes health', async () => {
  const calls: Array<{ channel: string; args: unknown[] }> = [];
  const server = await startWebRpcServer({
    port: 0,
    allowedOrigin: 'http://localhost:5173',
    async invoke(channel, args) {
      calls.push({ channel, args });
      return { ok: true };
    }
  });

  try {
    const health = await fetch(`${server.url}/_masterpiece/health`, {
      headers: { origin: 'http://localhost:5173' }
    });
    assert.equal(health.status, 200);
    assert.equal((await health.json() as { mode: string }).mode, 'web');

    const response = await fetch(`${server.url}/_masterpiece/rpc/projects%3Alist`, {
      method: 'POST',
      headers: {
        origin: 'http://localhost:5173',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ args: [] })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { result: { ok: true } });
    assert.deepEqual(calls, [{ channel: 'projects:list', args: [] }]);
  } finally {
    await server.close();
  }
});

test('web RPC server rejects an unrelated browser origin', async () => {
  const server = await startWebRpcServer({
    port: 0,
    allowedOrigin: 'http://localhost:5173',
    async invoke() {
      throw new Error('must not run');
    }
  });

  try {
    const response = await fetch(`${server.url}/_masterpiece/health`, {
      headers: { origin: 'https://untrusted.example' }
    });
    assert.equal(response.status, 403);
  } finally {
    await server.close();
  }
});
