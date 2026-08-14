import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

async function rpc(baseUrl: string, channel: string, args: unknown[], expectedStatus = 200) {
  const response = await fetch(`${baseUrl}/_masterpiece/rpc/${encodeURIComponent(channel)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5173' },
    body: JSON.stringify({ args }),
  });
  assert.equal(response.status, expectedStatus);
  return response.json() as Promise<{ result?: any; error?: string }>;
}

test('Node Runtime Host binds all 155 channels to the Shared Registry without Electron', async (t) => {
  const userData = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-node-host-'));
  process.env.MASTERPIECE_USER_DATA_DIR = userData;
  process.env.MASTERPIECE_WEB_OPEN_PATH = '0';
  const { startNodeRuntimeHost } = await import(`../src/node-runtime-host.ts?test=${Date.now()}`);
  const host = await startNodeRuntimeHost({
    port: 0,
    allowedOrigin: 'http://127.0.0.1:5173',
    currentDirectory: path.resolve('.'),
  });
  t.after(async () => {
    await host.close();
    await fs.rm(userData, { recursive: true, force: true });
    delete process.env.MASTERPIECE_USER_DATA_DIR;
    delete process.env.MASTERPIECE_WEB_OPEN_PATH;
  });

  assert.equal(host.operationCount, 155);
  const healthResponse = await fetch(`${host.url}/_masterpiece/health`);
  assert.deepEqual(
    (({ ok, mode, host: hostKind }) => ({ ok, mode, host: hostKind }))(await healthResponse.json() as any),
    { ok: true, mode: 'web', host: 'node' },
  );
  assert.ok(Array.isArray((await rpc(host.url, 'settings:get', [])).result.profiles));
  assert.ok(Array.isArray((await rpc(host.url, 'projects:list', [])).result));
  assert.ok(Array.isArray((await rpc(host.url, 'document-context:list-runs', [])).result));
  assert.ok(Array.isArray((await rpc(host.url, 'reference-anchor:list-runs', [])).result));
  assert.equal((await rpc(host.url, 'analysis:cancel', ['__no_active_project__'])).result, false);
  assert.ok((await rpc(host.url, 'image-generation:get-capabilities', [])).result.modelId);
  assert.ok((await rpc(host.url, 'image-generation:short-chain-options', [])).result);
  const invalidCompile = await rpc(host.url, 'image-generation:short-chain-compile', [{ projectId: '__missing__' }], 500);
  assert.ok(invalidCompile.error);
});
