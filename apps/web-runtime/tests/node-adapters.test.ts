import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createNodeCredentialStore } from '../src/node-credential-store.ts';
import { createNodeRuntimePaths } from '../src/runtime-paths.ts';

test('Node runtime paths are explicit and preserve the configured user-data convention', () => {
  const paths = createNodeRuntimePaths({
    MASTERPIECE_USER_DATA_DIR: 'D:\\runtime-data',
    MASTERPIECE_PROMPT_ROOT: 'D:\\prompts',
  }, 'D:\\repo');
  assert.equal(paths.userData, path.resolve('D:\\runtime-data'));
  assert.equal(paths.settingsFile, path.join(paths.userData, 'settings.json'));
  assert.equal(paths.defaultDataPath, path.join(paths.userData, 'Masterpiece OS Data'));
  assert.equal(paths.promptRoot, path.resolve('D:\\prompts'));
});

test('Node credential adapter encrypts local secrets and honors environment override', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-node-credentials-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = createNodeCredentialStore(root, {});
  await store.write('profile-one', 'secret-value');
  assert.equal(await store.read('profile-one'), 'secret-value');
  const raw = await fs.readFile(path.join(root, 'profile-one.bin'));
  assert.equal(raw.includes(Buffer.from('secret-value')), false);
  const environmentStore = createNodeCredentialStore(root, { MASTERPIECE_API_KEY_PROFILE_ONE: 'environment-secret' });
  assert.equal(await environmentStore.read('profile-one'), 'environment-secret');
});

test('Node settings adapter preserves profile selection and keeps secrets out of settings JSON', async (t) => {
  const userData = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-node-settings-'));
  t.after(() => fs.rm(userData, { recursive: true, force: true }));
  process.env.MASTERPIECE_USER_DATA_DIR = userData;
  const settings = await import(`../src/node-settings-store.ts?test=${Date.now()}`);
  const saved = await settings.saveApiProfile({
    displayName: 'Test Qwen',
    provider: 'dashscope',
    protocol: 'openai-chat-multimodal',
    modelType: 'analysis',
    registryModelId: 'qwen3.6-plus',
    modelId: 'qwen3.6-plus',
    baseUrl: 'https://example.test/v1',
    apiKey: 'local-secret',
    isDefault: true,
    isEnabled: true,
  });
  assert.equal(saved.model, 'qwen3.6-plus');
  assert.equal(saved.hasApiKey, true);
  assert.equal((await settings.getProviderCredentials()).apiKey, 'local-secret');
  const serialized = await fs.readFile(path.join(userData, 'settings.json'), 'utf8');
  assert.equal(serialized.includes('local-secret'), false);
  delete process.env.MASTERPIECE_USER_DATA_DIR;
});
