import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');

test('anchor production reads the configured runtime data path', async () => {
  const applicationSource = await fs.readFile(
    path.join(repoRoot, 'packages', 'runtime-core', 'src', 'application', 'creative-intelligence-application-service.ts'),
    'utf8',
  );
  assert.match(applicationSource, /defaultDataPath[\s\S]{0,80}creative-intelligence-runs/u);

  const anchorSource = await fs.readFile(
    path.join(repoRoot, 'packages', 'runtime-core', 'src', 'application', 'anchor-production-service.ts'),
    'utf8',
  );
  assert.match(anchorSource, /readDataDir\(\)[\s\S]{0,80}creative-intelligence-runs/u);
});

test('Node host resolves settings before creating runtime services', async () => {
  const hostSource = await fs.readFile(
    path.join(repoRoot, 'apps', 'web-runtime', 'src', 'node-runtime-host.ts'),
    'utf8',
  );
  const startIndex = hostSource.indexOf('export async function startNodeRuntimeHost');
  const firstAwait = hostSource.slice(startIndex).match(/await\s+(\w+)\s*\(/u);
  assert.ok(firstAwait, 'host must perform an await during startup');
  assert.equal(firstAwait[1], 'getSettings', 'host must resolve settings before runtime services');
});
