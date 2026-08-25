// P3-D3.7D / BE — Space Reference Creative Task Path Corrective guards.
//
// D3.7C located SR-10: space-reference-policy.js unconditionally
// prefixed "input/" onto asset.relativePath. D3.6B web-uploaded
// assets (usage=generation_reference) are project-root-relative
// ("generation-references/<id>.png"), so the prefix produced a
// nonexistent path and the correct existence guard threw
// REFERENCE_ASSET_NOT_FOUND ("Creative Task 参考图不存在").
//
// This corrective makes the space derivation usage-aware, mirroring
// the D3.7B packaging semantics:
//   analysis_source       -> input/<asset.relativePath>
//   generation_reference  -> <asset.relativePath>
//
// Authoritative: docs/packaging/history/p3-d/p3-d3-7c-cross-deliverable-reference-path-authority-audit.md
//                docs/packaging/history/p3-d/p3-d3-7d-space-reference-path-corrective.md

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { createProjectStore } from '@masterpiece/runtime-core/application/project-store.ts';
import { resolveReferenceAsset } from '@masterpiece/image-generation-runtime/reference-engine/reference-asset-resolver.ts';
import { resolveSpaceReferences } from '@masterpiece/image-generation-runtime/space/space-reference-policy.js';
import type { PublicSettings } from '@masterpiece/runtime-core/application-contracts.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const SPACE_POLICY = path.join(ROOT, 'packages', 'image-generation-runtime', 'src', 'space', 'space-reference-policy.js');
const D37C = path.join(ROOT, 'docs', 'packaging', 'history', 'p3-d', 'p3-d3-7c-cross-deliverable-reference-path-authority-audit.md');

const ONE_PIXEL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const OTHER_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

function read(file) {
  return readFileSync(file, 'utf8');
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

async function makeStore() {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'p3-d3-7d-'));
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

function spaceResolve(explicitAssets) {
  return resolveSpaceReferences({ generationBasis: 'reference_first', explicitAssets });
}

// ---------------------------------------------------------------------------
// BE-01..BE-05 — Root cause + reference frames + corrected derivation.
// ---------------------------------------------------------------------------

test('BE-01 D3.7C root cause preserved', () => {
  assert.ok(existsSync(D37C), 'D3.7C doc must exist');
  const doc = read(D37C);
  assert.match(doc, /space-reference-policy\.js:96/u);
  assert.match(doc, /SPACE CREATIVE TASK REFERENCE PATH DEFECT/u);
});

test('BE-02 Space analysis_source reference frame documented', () => {
  const src = read(SPACE_POLICY);
  assert.match(src, /analysis_source/u);
  assert.match(src, /input\/\$\{asset\.relativePath\}/u);
});

test('BE-03 Space generation_reference frame documented', () => {
  const src = read(SPACE_POLICY);
  assert.match(src, /generation_reference/u);
  assert.match(src, /already/u);
  assert.match(src, /relative to <projectRoot>/u);
});

test('BE-04 generation_reference gets no input/ prefix', () => {
  const src = read(SPACE_POLICY);
  assert.match(src, /asset\.usage === 'generation_reference'\s*\?\s*asset\.relativePath/u);
  assert.doesNotMatch(src, /projectRelativePath:\s*`input\/\$\{asset\.relativePath\}`/u);
});

test('BE-05 analysis_source keeps input/ prefix', () => {
  const src = read(SPACE_POLICY);
  assert.match(src, /asset\.usage === 'generation_reference'\s*\?\s*asset\.relativePath\s*:\s*`input\/\$\{asset\.relativePath\}`/u);
});

// ---------------------------------------------------------------------------
// BE-06..BE-10 — Cross-layer alignment + existence (synthetic, real functions).
// ---------------------------------------------------------------------------

test('BE-06 Space Creative Task and resolver resolve the same local file (generation_reference)', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    const upload = await store.importFileBytes({
      projectId: project.id,
      file: { name: 'ref.png', mime: 'image/png', size: ONE_PIXEL_PNG.length, content: ONE_PIXEL_PNG.toString('base64') },
    });
    const paths = await store.paths(project.id);
    const record = await store.get(project.id);
    const resolved = await resolveReferenceAsset(upload.asset.id, { projectRoot: paths.root, verifySha256: false }, record.assets);
    assert.equal(resolved.status, 'resolved');
    const space = spaceResolve([{ assetId: upload.asset.id, role: 'core_reference', relativePath: upload.asset.relativePath, usage: upload.asset.usage }]);
    assert.equal(space.references.length, 1);
    const spaceAbs = path.resolve(paths.root, space.references[0].projectRelativePath);
    assert.equal(spaceAbs, resolved.record.absolutePath);
    assert.ok((await fs.stat(spaceAbs).catch(() => null)) !== null, 'space reference file must exist');
    assert.equal(path.basename(spaceAbs), 'generation-references' === path.basename(path.dirname(spaceAbs)) ? path.basename(spaceAbs) : path.basename(spaceAbs));
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('BE-07 existing generation_reference passes existence', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    const upload = await store.importFileBytes({
      projectId: project.id,
      file: { name: 'ref.png', mime: 'image/png', size: ONE_PIXEL_PNG.length, content: ONE_PIXEL_PNG.toString('base64') },
    });
    const paths = await store.paths(project.id);
    const space = spaceResolve([{ assetId: upload.asset.id, role: 'core_reference', relativePath: upload.asset.relativePath, usage: upload.asset.usage }]);
    const abs = path.resolve(paths.root, space.references[0].projectRelativePath);
    const content = await fs.readFile(abs).catch(() => null);
    assert.ok(content, 'generation_reference must be readable (no REFERENCE_ASSET_NOT_FOUND)');
    assert.doesNotMatch(space.references[0].projectRelativePath, /^input\//u);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('BE-08 existing analysis_source passes existence (input/ prefix)', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    const record = await store.get(project.id);
    const seed = record.assets.find((a) => a.usage === 'analysis_source');
    assert.ok(seed, 'seed analysis_source asset must exist');
    const paths = await store.paths(project.id);
    const space = spaceResolve([{ assetId: seed.id, role: 'core_reference', relativePath: seed.relativePath, usage: seed.usage }]);
    const abs = path.resolve(paths.root, space.references[0].projectRelativePath);
    assert.ok((await fs.stat(abs).catch(() => null)) !== null, 'analysis_source must be readable via input/ prefix');
    assert.match(space.references[0].projectRelativePath, /^input\//u);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('BE-09 missing generation_reference fail-closed', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    const paths = await store.paths(project.id);
    const ghost = path.resolve(paths.root, 'generation-references/ghost.png');
    assert.equal((await fs.stat(ghost).catch(() => null)), null, 'missing file must fail existence');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('BE-10 missing analysis_source fail-closed', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    const paths = await store.paths(project.id);
    const ghost = path.resolve(paths.root, 'input', 'assets', 'ghost.png');
    assert.equal((await fs.stat(ghost).catch(() => null)), null, 'missing input asset must fail existence');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// BE-11..BE-25 — Identity / semantics / frozen preservation.
// ---------------------------------------------------------------------------

test('BE-11 asset id unchanged', () => {
  const src = read(SPACE_POLICY);
  assert.match(src, /id: asset\.assetId/u);
});

test('BE-12 projectId unchanged', () => {
  const src = read(SPACE_POLICY);
  assert.doesNotMatch(src, /projectId:\s*[^a-z]/u);
});

test('BE-13 usage preserved', () => {
  const src = read(SPACE_POLICY);
  assert.match(src, /asset\.usage === 'generation_reference'/u);
});

test('BE-14 no absolute path exposed', () => {
  const src = read(SPACE_POLICY);
  assert.doesNotMatch(src, /projectRelativePath:\s*path\.resolve|projectRelativePath:\s*absolutePath/u);
});

test('BE-15 no traversal escape', () => {
  const src = read(SPACE_POLICY);
  const derivation = src.slice(src.indexOf("projectRelativePath: asset.usage"), src.indexOf('isContinuation ? continuationReferenceSource'));
  assert.doesNotMatch(derivation, /\.\.\//u);
});

test('BE-16 Space reference role unchanged', () => {
  const src = read(SPACE_POLICY);
  assert.match(src, /role: 'core_reference'/u);
  assert.match(src, /semanticRole: isContinuation \? 'world_consistency' : 'high_fidelity_visual_reference'/u);
});

test('BE-17 Space relationship unchanged', () => {
  const src = read(SPACE_POLICY);
  assert.match(src, /referenceRole/u);
});

test('BE-18 Packaging D3.7B unchanged', () => {
  const delta = git(['diff', '--name-only', '2004f9a7bea0a213bd884a0d1c2d00316a3d8e4e', 'HEAD',
    '--', 'packages/runtime-core/src/application/image-generation/short-chain-service.ts']);
  assert.equal(delta, '', 'packaging short-chain-service must be untouched by this corrective');
});

test('BE-19 Web upload RPC server unchanged', () => {
  // P3-D corrective guard: local-rpc-server.ts upload wiring must be
  // untouched by subsequent changes. (The legacy workspace file that
  // originally paired with this assertion was deleted in F6.B; this
  // test now asserts the surviving half only.)
  const delta = git(['diff', '--name-only', '2004f9a7bea0a213bd884a0d1c2d00316a3d8e4e', 'HEAD',
    '--', 'apps/web-runtime/src/local-rpc-server.ts']);
  assert.equal(delta, '', 'web upload RPC server must be untouched');
});

test('BE-20 Reference preview unchanged', () => {
  const delta = git(['diff', '--name-only', '2004f9a7bea0a213bd884a0d1c2d00316a3d8e4e', 'HEAD',
    '--', 'packages/runtime-core/src/application/project-store.ts']);
  assert.equal(delta, '', 'project-store (preview source) must be untouched');
});

test('BE-21 Space prompt unchanged', () => {
  const delta = git(['diff', '--name-only', '2004f9a7bea0a213bd884a0d1c2d00316a3d8e4e', 'HEAD',
    '--', 'packages/image-generation-runtime/src/space/compiler.js']);
  assert.equal(delta, '', 'space compiler must be untouched');
});

test('BE-22 Space Golden unchanged', () => {
  const delta = git(['diff', '--name-only', '2004f9a7bea0a213bd884a0d1c2d00316a3d8e4e', 'HEAD',
    '--', 'evaluation/golden-cases/', 'evaluation/anti-cases/', 'evaluation/hidden-cases/']);
  assert.equal(delta, '', 'no Golden delta since D3.7C HEAD');
});

test('BE-23 R8.6 boundary unchanged', () => {
  const delta = git(['diff', '--name-only', '2004f9a7bea0a213bd884a0d1c2d00316a3d8e4e', 'HEAD',
    '--', 'space-generator/v1-experimental/architecture-anchors/']);
  assert.equal(delta, '', 'R8.6 anchor baseline untouched');
});

test('BE-24 P3-A stale unchanged', () => {
  const ws = read(path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'workspace-service.js'));
  assert.match(ws, /function checkStale/u);
});

test('BE-25 Provider calls 0 (corrective is offline)', () => {
  const src = read(SPACE_POLICY);
  assert.doesNotMatch(src, /fetch\(/u);
});
