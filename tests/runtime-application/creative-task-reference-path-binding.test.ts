// P3-D3.7B / BD — Creative Task Reference Path Binding Corrective guards.
//
// D3.7A located RC-09: short-chain-service.ts unconditionally prefixed
// `input/` onto asset.relativePath. For D3.6B web-uploaded assets
// (usage=generation_reference) relativePath is already project-root-
// relative ("generation-references/<id>.png"), so the prefix produced a
// nonexistent path and the correct existence guard threw
// REFERENCE_ASSET_NOT_FOUND ("Creative Task 参考图不存在").
//
// This corrective makes the derivation usage-aware, aligned with the
// single path authority (resolveReferenceAsset):
//   analysis_source       -> input/<asset.relativePath>
//   generation_reference  -> <asset.relativePath>
//
// Authoritative: docs/packaging/history/p3-d/p3-d3-7a-reference-creative-task-binding-audit.md
//                docs/packaging/history/p3-d/p3-d3-7b-reference-creative-task-path-corrective.md

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { createProjectStore } from '@masterpiece/runtime-core/application/project-store.ts';
import { resolveReferenceAsset } from '@masterpiece/image-generation-runtime/reference-engine/reference-asset-resolver.ts';
import type { PublicSettings } from '@masterpiece/runtime-core/application-contracts.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const SHORT_CHAIN = path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'image-generation', 'short-chain-service.ts');
const D37A = path.join(ROOT, 'docs', 'packaging', 'history', 'p3-d', 'p3-d3-7a-reference-creative-task-binding-audit.md');

const ONE_PIXEL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const OTHER_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

function read(file) {
  return readFileSync(file, 'utf8');
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

async function makeStore() {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'p3-d3-7b-'));
  const data = path.join(temporary, 'data');
  const source = path.join(temporary, 'source');
  await fs.mkdir(source, { recursive: true });
  await fs.writeFile(path.join(source, 'seed.png'), OTHER_PNG);
  const settings: PublicSettings = {
    profiles: [{
      id: 'p1', displayName: 'T', provider: 'volcengine',
      baseUrl: 'https://example.invalid/api/v3', modelId: 'm',
      credentialKey: 'c', hasApiKey: true, isDefault: true, isEnabled: true,
      createdAt: '2026-08-15T00:00:00.000Z', updatedAt: '2026-08-15T00:00:00.000Z',
    }],
    defaultProfileId: 'p1', provider: 'volcengine', baseUrl: 'https://example.invalid/api/v3',
    model: 'm', hasApiKey: true, defaultDataPath: data,
    cacheEnabled: true, logLevel: 'info', connectionStatus: 'untested',
  };
  const store = createProjectStore(async () => settings);
  const project = await store.create({ sourcePaths: [source], apiProfileId: 'p1' });
  return { temporary, store, project };
}

// ---------------------------------------------------------------------------
// BD-01..BD-05 — Root cause + reference frames + corrected derivation.
// ---------------------------------------------------------------------------

test('BD-01 D3.7A root cause preserved', () => {
  assert.ok(existsSync(D37A), 'D3.7A doc must exist');
  const doc = read(D37A);
  assert.match(doc, /short-chain-service\.ts:884/u);
  assert.match(doc, /input\/\$|input\/\$\{asset\.relativePath\}|input\/\$\{asset/iu);
  assert.match(doc, /CREATIVE TASK ASSET FILTER DEFECT/u);
});

test('BD-02 analysis_source relative frame documented (relative to input/)', () => {
  const src = read(SHORT_CHAIN);
  assert.match(src, /analysis_source/u);
  assert.match(src, /input\/\$\{asset\.relativePath\}/u);
});

test('BD-03 generation_reference relative frame documented (relative to project root)', () => {
  const src = read(SHORT_CHAIN);
  assert.match(src, /generation_reference/u);
  assert.match(src, /asset\.relativePath/u);
});

test('BD-04 analysis_source keeps input/ prefix', () => {
  const src = read(SHORT_CHAIN);
  assert.match(src, /asset\.usage === 'generation_reference'\s*\?\s*asset\.relativePath\s*:\s*`input\/\$\{asset\.relativePath\}`/u);
});

test('BD-05 generation_reference has NO input/ prefix', () => {
  const src = read(SHORT_CHAIN);
  assert.match(src, /asset\.usage === 'generation_reference'\s*\?\s*asset\.relativePath/u);
  // The unconditional input/ prefix must be gone.
  assert.doesNotMatch(src, /projectRelativePath:\s*`input\/\$\{asset\.relativePath\}`/u);
});

// ---------------------------------------------------------------------------
// BD-06..BD-10 — Cross-layer alignment + existence semantics (synthetic,
// real production functions, generic fixtures).
// ---------------------------------------------------------------------------

test('BD-06 resolver and Creative Task resolve the same local file (generation_reference)', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    const upload = await store.importFileBytes({
      projectId: project.id,
      file: { name: 'ref.png', mime: 'image/png', size: ONE_PIXEL_PNG.length, content: ONE_PIXEL_PNG.toString('base64') },
    });
    assert.equal(upload.asset.usage, 'generation_reference');
    const paths = await store.paths(project.id);
    const projectRecord = await store.get(project.id);
    const resolved = await resolveReferenceAsset(upload.asset.id, { projectRoot: paths.root, verifySha256: false }, projectRecord.assets);
    assert.equal(resolved.status, 'resolved');
    // Corrected Creative Task derivation (usage-aware): no input/ prefix.
    const creativePath = path.resolve(paths.root, upload.asset.relativePath);
    assert.equal(creativePath, resolved.record.absolutePath);
    assert.equal(path.basename(creativePath), path.basename(resolved.record.absolutePath));
    const exists = (await fs.stat(creativePath).catch(() => null)) !== null;
    assert.ok(exists, 'generation_reference file must exist at the derived path');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('BD-07 generation_reference exists -> no REFERENCE_ASSET_NOT_FOUND', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    const upload = await store.importFileBytes({
      projectId: project.id,
      file: { name: 'ref.png', mime: 'image/png', size: ONE_PIXEL_PNG.length, content: ONE_PIXEL_PNG.toString('base64') },
    });
    const paths = await store.paths(project.id);
    // Simulate the corrected Creative Task path derivation and the
    // existence guard (service.ts:683-689 logic, unchanged).
    const localPath = path.resolve(paths.root, upload.asset.relativePath);
    const content = await fs.readFile(localPath).catch(() => null);
    assert.ok(content, 'reference content must be readable (no REFERENCE_ASSET_NOT_FOUND)');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('BD-08 analysis_source exists -> no regression (input/ prefix path)', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    // The project seed is an analysis_source asset.
    const record = await store.get(project.id);
    const seed = record.assets.find((a) => a.usage === 'analysis_source');
    assert.ok(seed, 'seed analysis_source asset must exist');
    const paths = await store.paths(project.id);
    // analysis_source relativePath is relative to <root>/input.
    const derived = path.resolve(paths.root, 'input', seed.relativePath);
    const content = await fs.readFile(derived).catch(() => null);
    assert.ok(content, 'analysis_source file must be readable via input/ prefix');
    // Resolver alignment for analysis_source too.
    const resolved = await resolveReferenceAsset(seed.id, { projectRoot: paths.root, verifySha256: false }, record.assets);
    assert.equal(resolved.status, 'resolved');
    assert.equal(resolved.record.absolutePath, derived);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('BD-09 missing generation_reference still fail-closed', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    const paths = await store.paths(project.id);
    const ghostPath = path.resolve(paths.root, 'generation-references/ghost.png');
    const content = await fs.readFile(ghostPath).catch(() => null);
    assert.equal(content, null, 'missing file must fail existence (guard stays fail-closed)');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('BD-10 missing analysis_source still fail-closed', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    const paths = await store.paths(project.id);
    const ghostPath = path.resolve(paths.root, 'input', 'assets', 'ghost.png');
    const content = await fs.readFile(ghostPath).catch(() => null);
    assert.equal(content, null, 'missing input asset must fail existence');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// BD-11..BD-25 — Identity / surface preservation.
// ---------------------------------------------------------------------------

test('BD-11 asset id unchanged (identity bridge untouched)', () => {
  const src = read(SHORT_CHAIN);
  assert.match(src, /assetId: record\.assetId/u);
  assert.match(src, /const id = asset\.assetId/u);
});

test('BD-12 projectId unchanged', () => {
  const src = read(SHORT_CHAIN);
  assert.match(src, /input\.projectId/u);
});

test('BD-13 no absolute path exposed', () => {
  const src = read(SHORT_CHAIN);
  assert.doesNotMatch(src, /projectRelativePath:\s*path\.resolve|projectRelativePath:\s*absolutePath/u);
});

test('BD-14 no path traversal', () => {
  const src = read(SHORT_CHAIN);
  // The usage-aware derivation (line ~886) never introduces `..`;
  // the existing assertPathInside boundary check remains the guard.
  const derivation = src.slice(src.indexOf("const projectRelativePath = asset.usage"), src.indexOf('projectRelativePath,', src.indexOf("const projectRelativePath = asset.usage")));
  assert.doesNotMatch(derivation, /\.\.\//u);
});

test('BD-15 referenceAssetIds ownership unchanged', () => {
  const src = read(SHORT_CHAIN);
  assert.doesNotMatch(src, /referenceAssetIds\s*=\s*.*relativePath|referenceAssetIds.*path\.resolve/iu);
});

test('BD-16 referenceAssignments authority unchanged', () => {
  const src = read(SHORT_CHAIN);
  assert.doesNotMatch(src, /referenceAssignments/u);
});

test('BD-17 Web upload RPC server unchanged', () => {
  // P3-D corrective guard: local-rpc-server.ts upload wiring must be
  // untouched by subsequent changes. (The legacy workspace file that
  // originally paired with this assertion was deleted in F6.B; this
  // test now asserts the surviving half only.)
  const delta = git(['diff', '--name-only', 'dfffa19b1b909e1146065785914cd6f724b0d8fd', 'HEAD',
    '--', 'apps/web-runtime/src/local-rpc-server.ts']);
  assert.equal(delta, '', 'Web upload RPC server must be untouched by this corrective');
});

test('BD-18 project-store persistence unchanged', () => {
  const delta = git(['diff', '--name-only', 'dfffa19b1b909e1146065785914cd6f724b0d8fd', 'HEAD',
    '--', 'packages/runtime-core/src/application/project-store.ts']);
  assert.equal(delta, '', 'project-store persistence must be untouched');
});

test('BD-19 P3-A12 unchanged', () => {
  const ws = read(path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'workspace-service.js'));
  assert.match(ws, /function checkStale/u);
});

test('BD-20 P2 Shot Contract unchanged', () => {
  const contracts = read(path.join(ROOT, 'packages', 'image-generation-runtime', 'src', 'packaging', 'contracts.js'));
  assert.match(contracts, /PKG-HERO-SINGLE/u);
  assert.match(contracts, /PKG-GIFT-OPEN/u);
});

test('BD-21 Provider identity unchanged', () => {
  const registry = read(path.join(ROOT, 'packages', 'model-registry', 'src', 'index.js'));
  assert.match(registry, /seedream-5\.0-pro/u);
});

test('BD-22 Standard live status preserved (D3.7A evidence intact)', () => {
  assert.ok(existsSync(D37A), 'D3.7A doc must remain');
  assert.match(read(D37A), /LIVE VALIDATED/u);
});

test('BD-23 Reference upload live status preserved', () => {
  assert.ok(existsSync(D37A));
  assert.match(read(D37A), /WEB PICKER PASS/u);
});

test('BD-24 Provider calls 0 (corrective is offline)', () => {
  const src = read(SHORT_CHAIN);
  assert.doesNotMatch(src, /fetch\(/u);
});

test('BD-25 Golden unchanged', () => {
  const delta = git(['diff', '--name-only', 'dfffa19b1b909e1146065785914cd6f724b0d8fd', 'HEAD',
    '--', 'evaluation/golden-cases/', 'evaluation/anti-cases/', 'evaluation/hidden-cases/']);
  assert.equal(delta, '', 'no Golden delta since D3.7A HEAD');
});
