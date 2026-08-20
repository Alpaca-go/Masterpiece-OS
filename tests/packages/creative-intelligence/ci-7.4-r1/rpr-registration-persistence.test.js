/**
 * CI-W1C.7.4-R1 — Registration / Persistence (RPR-01..07).
 *
 * Covers `project-store.registerPlanningBriefFromPath` +
 * `removePlanningBrief`:
 *   - RPR-01 register writes file
 *   - RPR-02 metadata updated
 *   - RPR-03 reload preserves record
 *   - RPR-04 duplicate same content dedupes
 *   - RPR-05 changed content invalidates identity/fingerprint
 *   - RPR-06 path traversal refused
 *   - RPR-07 removal invalidates derived state
 *
 * Zero-network. Pure project-store mutator semantics.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const projectStoreUrl = pathToFileURL(
  path.join(repoRoot, 'packages/runtime-core/src/application/project-store.ts')
).href;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAMPLE_BRIEF = `# 品牌策略简报
品牌定位: 测试品牌定位
行业: 测试行业
品牌承诺: 测试品牌承诺
`;

async function setup() {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-rpr-'));
  const sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-rpr-src-'));
  // A project needs at least one source asset. Drop a tiny PNG.
  await fs.writeFile(path.join(sourceDir, 'logo.png'), Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
    0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
    0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44,
    0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d,
    0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
    0x60, 0x82
  ]));
  const settings = {
    defaultDataPath: dataDir,
    profiles: [
      {
        id: 'test-profile',
        displayName: 'Test',
        provider: 'mock',
        protocol: 'openai-chat-multimodal',
        modelType: 'analysis',
        modelId: 'mock-fixture-v0.1',
        baseUrl: 'http://localhost:9999',
        credentialKey: 'test',
        hasApiKey: false,
        isDefault: true,
        isEnabled: true,
        createdAt: '2026-08-20T00:00:00.000Z',
        updatedAt: '2026-08-20T00:00:00.000Z'
      }
    ],
    modelRegistry: [],
    defaultProfileId: 'test-profile',
    provider: 'mock',
    baseUrl: 'http://localhost:9999',
    model: 'mock-fixture-v0.1',
    hasApiKey: false,
    cacheEnabled: false,
    logLevel: 'info',
    connectionStatus: 'untested'
  };
  await fs.writeFile(path.join(dataDir, 'settings.json'), JSON.stringify(settings, null, 2), 'utf8');

  const { createProjectStore } = await import(projectStoreUrl);
  const store = createProjectStore(async () => settings);
  const project = await store.create({
    projectName: 'RPR-Test',
    apiProfileId: 'test-profile',
    sourcePaths: [sourceDir]
  });
  const paths = await store.paths(project.id);
  return { dataDir, sourceDir, store, project, projectRoot: paths.root };
}

async function teardown(ctx) {
  await fs.rm(ctx.dataDir, { recursive: true, force: true });
  await fs.rm(ctx.sourceDir, { recursive: true, force: true });
}

async function writeBrief(dir, name, content) {
  const briefPath = path.join(dir, name);
  await fs.writeFile(briefPath, content, 'utf8');
  return briefPath;
}

// ---------------------------------------------------------------------------
// RPR-01 — register writes file
// ---------------------------------------------------------------------------

test('RPR-01: register writes the brief file into planning-briefs/ and returns a PlanningBriefRecord', async () => {
  const ctx = await setup();
  try {
    const briefPath = await writeBrief(ctx.sourceDir, 'brand-strategy.md', SAMPLE_BRIEF);
    const record = await ctx.store.registerPlanningBriefFromPath({
      projectId: ctx.project.id,
      sourcePath: briefPath
    });
    const absolute = path.join(ctx.projectRoot, record.relativePath);
    const stat = await fs.stat(absolute);
    assert.ok(stat.isFile(), `brief file not written at ${absolute}`);
    assert.equal(record.filename, 'brand-strategy.md');
    assert.equal(record.extension, '.md');
    assert.equal(record.sourceType, 'planning_document');
    assert.ok(record.contentHash.length === 64, 'contentHash must be 64-char hex');
    assert.ok(record.registeredAt && /^\d{4}-\d{2}-\d{2}T/.test(record.registeredAt), 'registeredAt must be ISO');
  } finally {
    await teardown(ctx);
  }
});

// ---------------------------------------------------------------------------
// RPR-02 — metadata updated
// ---------------------------------------------------------------------------

test('RPR-02: register updates project.planningBriefFiles metadata', async () => {
  const ctx = await setup();
  try {
    const briefPath = await writeBrief(ctx.sourceDir, 'plan.md', SAMPLE_BRIEF);
    const record = await ctx.store.registerPlanningBriefFromPath({
      projectId: ctx.project.id,
      sourcePath: briefPath
    });
    const reloaded = await ctx.store.get(ctx.project.id);
    assert.ok(Array.isArray(reloaded.planningBriefFiles), 'planningBriefFiles must be an array');
    assert.equal(reloaded.planningBriefFiles.length, 1);
    assert.equal(reloaded.planningBriefFiles[0].sourceId, record.sourceId);
    assert.equal(reloaded.planningBriefFiles[0].filename, 'plan.md');
    assert.equal(reloaded.planningBriefFiles[0].contentHash, record.contentHash);
  } finally {
    await teardown(ctx);
  }
});

// ---------------------------------------------------------------------------
// RPR-03 — reload preserves record
// ---------------------------------------------------------------------------

test('RPR-03: reload preserves the same record (sourceId + contentHash stable)', async () => {
  const ctx = await setup();
  try {
    const briefPath = await writeBrief(ctx.sourceDir, 'stable.md', SAMPLE_BRIEF);
    const r1 = await ctx.store.registerPlanningBriefFromPath({ projectId: ctx.project.id, sourcePath: briefPath });
    const r2 = await ctx.store.registerPlanningBriefFromPath({ projectId: ctx.project.id, sourcePath: briefPath });
    assert.equal(r1.sourceId, r2.sourceId, 'register must be idempotent for the same content');
    const reloaded = await ctx.store.get(ctx.project.id);
    assert.equal(reloaded.planningBriefFiles.length, 1, 'must not duplicate on re-register');
  } finally {
    await teardown(ctx);
  }
});

// ---------------------------------------------------------------------------
// RPR-04 — duplicate same content dedupes
// ---------------------------------------------------------------------------

test('RPR-04: duplicate same content dedupes (same sourceId returned, no second file)', async () => {
  const ctx = await setup();
  try {
    const p1 = await writeBrief(ctx.sourceDir, 'a.md', SAMPLE_BRIEF);
    const p2 = await writeBrief(ctx.sourceDir, 'b.md', SAMPLE_BRIEF);
    const r1 = await ctx.store.registerPlanningBriefFromPath({ projectId: ctx.project.id, sourcePath: p1 });
    const r2 = await ctx.store.registerPlanningBriefFromPath({ projectId: ctx.project.id, sourcePath: p2 });
    assert.equal(r1.sourceId, r2.sourceId);
    const reloaded = await ctx.store.get(ctx.project.id);
    assert.equal(reloaded.planningBriefFiles.length, 1);
  } finally {
    await teardown(ctx);
  }
});

// ---------------------------------------------------------------------------
// RPR-05 — changed content invalidates identity
// ---------------------------------------------------------------------------

test('RPR-05: changed content invalidates identity (new sourceId + new contentHash)', async () => {
  const ctx = await setup();
  try {
    const p1 = await writeBrief(ctx.sourceDir, 'v1.md', SAMPLE_BRIEF);
    const r1 = await ctx.store.registerPlanningBriefFromPath({ projectId: ctx.project.id, sourcePath: p1 });
    const changed = SAMPLE_BRIEF + '\n品牌承诺: 这是变更后的承诺\n';
    const p2 = await writeBrief(ctx.sourceDir, 'v2.md', changed);
    const r2 = await ctx.store.registerPlanningBriefFromPath({ projectId: ctx.project.id, sourcePath: p2 });
    assert.notEqual(r1.sourceId, r2.sourceId);
    assert.notEqual(r1.contentHash, r2.contentHash);
    const reloaded = await ctx.store.get(ctx.project.id);
    assert.equal(reloaded.planningBriefFiles.length, 2);
  } finally {
    await teardown(ctx);
  }
});

// ---------------------------------------------------------------------------
// RPR-06 — path traversal / missing source refused
// ---------------------------------------------------------------------------

test('RPR-06: register refuses a non-existent source path with PLANNING-BRIEF-SOURCE-MISSING', async () => {
  const ctx = await setup();
  try {
    await assert.rejects(
      () => ctx.store.registerPlanningBriefFromPath({
        projectId: ctx.project.id,
        sourcePath: path.join(ctx.sourceDir, 'does-not-exist.md')
      }),
      /PLANNING-BRIEF-SOURCE-MISSING/
    );
    // Sanity: nothing was registered.
    const reloaded = await ctx.store.get(ctx.project.id);
    assert.equal((reloaded.planningBriefFiles ?? []).length, 0);
  } finally {
    await teardown(ctx);
  }
});

test('RPR-06b: register refuses an unsupported extension', async () => {
  const ctx = await setup();
  try {
    const unsupported = await writeBrief(ctx.sourceDir, 'evil.png', 'fake image content');
    await assert.rejects(
      () => ctx.store.registerPlanningBriefFromPath({
        projectId: ctx.project.id,
        sourcePath: unsupported
      }),
      /PLANNING-BRIEF-UNSUPPORTED-EXT/
    );
  } finally {
    await teardown(ctx);
  }
});

// ---------------------------------------------------------------------------
// RPR-07 — removal invalidates derived state
// ---------------------------------------------------------------------------

test('RPR-07: removePlanningBrief deletes the on-disk file + drops the metadata row', async () => {
  const ctx = await setup();
  try {
    const briefPath = await writeBrief(ctx.sourceDir, 'removable.md', SAMPLE_BRIEF);
    const record = await ctx.store.registerPlanningBriefFromPath({ projectId: ctx.project.id, sourcePath: briefPath });
    const absolute = path.join(ctx.projectRoot, record.relativePath);
    assert.ok(await fs.stat(absolute).then(() => true).catch(() => false), 'file must exist before removal');
    await ctx.store.removePlanningBrief(ctx.project.id, record.sourceId);
    assert.ok(!(await fs.stat(absolute).then(() => true).catch(() => false)), 'file must be deleted after removal');
    const reloaded = await ctx.store.get(ctx.project.id);
    assert.equal(reloaded.planningBriefFiles.length, 0, 'metadata row must be removed');
    // Idempotent: removing again is a no-op (no throw).
    const r2 = await ctx.store.removePlanningBrief(ctx.project.id, record.sourceId);
    assert.equal(r2.planningBriefFiles.length, 0);
  } finally {
    await teardown(ctx);
  }
});
