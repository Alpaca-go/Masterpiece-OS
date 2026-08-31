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

test('Node Runtime Host binds all 232 channels to the Shared Registry without Electron', async (t) => {
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

  // Creative Research adds the bounded delete-session channel after the
  // direction and Visual Search capability set.
  assert.equal(host.operationCount, 232);
  const healthResponse = await fetch(`${host.url}/_masterpiece/health`);
  assert.deepEqual(
    (({ ok, mode, host: hostKind }) => ({ ok, mode, host: hostKind }))(await healthResponse.json() as any),
    { ok: true, mode: 'web', host: 'node' },
  );
  assert.ok(Array.isArray((await rpc(host.url, 'settings:get', [])).result.profiles));
  assert.ok(Array.isArray((await rpc(host.url, 'projects:list', [])).result));
  assert.ok(Array.isArray((await rpc(host.url, 'document-context:list-runs', [])).result));
  assert.ok(Array.isArray((await rpc(host.url, 'reference-anchor:list-runs', [])).result));
  assert.deepEqual((await rpc(host.url, 'creative-research:get-search-credential-status', [])).result, {
    provider: 'baidu-search', configured: false,
  });
  const credentialSave = await rpc(host.url, 'creative-research:save-search-credential', ['r4-host-secret']);
  assert.deepEqual(credentialSave.result, { provider: 'baidu-search', configured: true });
  assert.doesNotMatch(JSON.stringify(credentialSave), /r4-host-secret/u);
  assert.deepEqual((await rpc(host.url, 'creative-research:delete-search-credential', [])).result, {
    provider: 'baidu-search', configured: false,
  });
  assert.equal((await rpc(host.url, 'analysis:cancel', ['__no_active_project__'])).result, false);
  assert.ok((await rpc(host.url, 'image-generation:get-capabilities', [])).result.modelId);
  assert.ok((await rpc(host.url, 'image-generation:short-chain-options', [])).result);
  const invalidCompile = await rpc(host.url, 'image-generation:short-chain-compile', [{ projectId: '__missing__' }], 500);
  assert.ok(invalidCompile.error);
});

// P3-D3.6A/6B — Web Asset Upload Contract: channel-aware body cap.
// The upload channel gets 64 MiB; every other RPC keeps 10 MiB.
// Verified via the exported selector (no multi-MiB allocation) and
// via the real RPC server for an invalid-argument upload (must reach
// the operation, not be rejected as transport-level malformed).
test('P3-D3.6B body cap: upload channel 64 MiB, general RPC 10 MiB', async () => {
  const { resolveBodyCap } = await import('../src/local-rpc-server.ts');
  assert.equal(resolveBodyCap('projects:import-file-bytes'), 64 * 1024 * 1024);
  assert.equal(resolveBodyCap('projects:create-from-browser-files'), 64 * 1024 * 1024);
  assert.equal(resolveBodyCap('projects:import-browser-files'), 64 * 1024 * 1024);
  assert.equal(resolveBodyCap('document-context:import-documents'), 64 * 1024 * 1024);
  assert.equal(resolveBodyCap('creative-research:import-curated-references'), 64 * 1024 * 1024);
  assert.equal(resolveBodyCap('projects:list'), 10 * 1024 * 1024);
  assert.equal(resolveBodyCap('image-generation:start-validated-short-chain'), 10 * 1024 * 1024);
  assert.equal(resolveBodyCap('settings:get'), 10 * 1024 * 1024);
});

test('P3-D3.6B upload RPC reaches the operation (structured error, no transport failure)', async (t) => {
  const userData = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-node-host-upload-'));
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
  // Missing project → structured UPLOAD error from the operation
  // (proves the channel is wired end-to-end through the server).
  const response = await fetch(`${host.url}/_masterpiece/rpc/projects%3Aimport-file-bytes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5173' },
    body: JSON.stringify({ args: [{ projectId: '00000000-0000-4000-8000-000000000000', file: { name: 'a.png', mime: 'image/png', size: 1, content: 'x' } }] }),
  });
  assert.equal(response.status, 500);
  const body = await response.json() as { error?: string };
  assert.match(body.error ?? '', /UPLOAD_PROJECT_NOT_FOUND/u);
});

test('CI-W1B.1 document import RPC persists browser-uploaded documents and returns real paths', async (t) => {
  const userData = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-node-host-doc-import-'));
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
  const content = Buffer.from('# 项目方案\n品牌与业务说明', 'utf8');
  const response = await fetch(`${host.url}/_masterpiece/rpc/document-context%3Aimport-documents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5173' },
    body: JSON.stringify({
      args: [{
        documents: [
          { name: '方案.md', content: content.toString('base64'), size: content.length },
          { name: '资料.txt', content: Buffer.from('资料', 'utf8').toString('base64'), size: 6 },
        ],
      }],
    }),
  });
  assert.equal(response.status, 200);
  const result = await response.json() as { result?: string[] };
  assert.ok(Array.isArray(result.result), 'import returns a path array');
  assert.equal(result.result!.length, 2);
  for (const filePath of result.result!) {
    assert.equal((await fs.stat(filePath)).isFile(), true, `${filePath} must exist`);
  }
  assert.equal(await fs.readFile(result.result![0]!, 'utf8'), content.toString('utf8'));

  const rejected = await fetch(`${host.url}/_masterpiece/rpc/document-context%3Aimport-documents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5173' },
    body: JSON.stringify({ args: [{ documents: [{ name: 'virus.exe', content: 'eA==', size: 1 }] }] }),
  });
  assert.equal(rejected.status, 500);
  const rejectedBody = await rejected.json() as { error?: string };
  assert.match(rejectedBody.error ?? '', /WEB_DOCUMENT_IMPORT_UNSUPPORTED/u);

  const empty = await fetch(`${host.url}/_masterpiece/rpc/document-context%3Aimport-documents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5173' },
    body: JSON.stringify({ args: [{ documents: [] }] }),
  });
  assert.equal(empty.status, 500);
  const emptyBody = await empty.json() as { error?: string };
  assert.match(emptyBody.error ?? '', /WEB_DOCUMENT_IMPORT_EMPTY/u);
});
