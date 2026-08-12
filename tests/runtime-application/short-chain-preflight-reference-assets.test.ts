// r2.0 §4.11 / Phase C-3: preflightReferenceAssets service test.
//
// Exercises the vnext-service.preflightReferenceAssets method end-to-end
// against a real on-disk project fixture (no Electron, no IPC). Pins:
//   - happy path: real PNG file in input/assets/ is detected, MIME is
//     reported, SHA is computed, role is high_fidelity_visual_reference.
//   - mixed path: one resolved, one missing (REFERENCE_ASSET_NOT_FOUND),
//     one PDF (REFERENCE_ASSET_FORMAT_UNSUPPORTED), one not-ready
//     (REFERENCE_ASSET_NOT_READY). The service returns all four as a
//     fail-soft map; no throw.
//   - empty input: returns an empty results array, no project lookup.
//   - duplicate IDs are de-duplicated before the resolver sees them.

import assert from 'node:assert/strict';
import { promises as fsp } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { ProjectAsset } from '@masterpiece/runtime-core/application-contracts.ts';
import { createShortChainGenerationService } from '@masterpiece/runtime-core/application/image-generation/short-chain-service.ts';

const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
]);
const PDF_HEADER = Buffer.from('%PDF-1.4\nfake body for size > 16\n', 'utf8');

function makePng(totalBytes = 64): Buffer {
  const out = Buffer.alloc(totalBytes, 0);
  PNG_HEADER.copy(out);
  return out;
}

function makePdf(totalBytes = 64): Buffer {
  const out = Buffer.alloc(totalBytes, 0);
  PDF_HEADER.copy(out, 0, 0, PDF_HEADER.length);
  return out;
}

async function sha256Hex(buf: Buffer): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(buf).digest('hex');
}

interface Fixture {
  projectRoot: string;
  projectId: string;
  assets: ProjectAsset[];
  projects: { paths: (id: string) => Promise<{ root: string }>; get: (id: string) => Promise<{ assets: ProjectAsset[] }> };
}

async function buildFixture(): Promise<Fixture> {
  const projectRoot = await fsp.mkdtemp(path.join(tmpdir(), 'preflight-c3-'));
  const inputAssetsDir = path.join(projectRoot, 'input', 'assets');
  await fsp.mkdir(inputAssetsDir, { recursive: true });

  const pngBuf = makePng();
  const pdfBuf = makePdf();
  const pngPath = path.join(inputAssetsDir, 'a-good.png');
  const pdfPath = path.join(inputAssetsDir, 'a-pdf.pdf');
  await fsp.writeFile(pngPath, pngBuf);
  await fsp.writeFile(pdfPath, pdfBuf);

  const projectId = 'project-preflight-c3';
  const assets: ProjectAsset[] = [
    {
      id: 'asset-png',
      batchId: 'batch-c3',
      sourceType: 'file',
      originalName: 'a-good.png',
      relativePath: 'assets/a-good.png',
      mimeType: 'image/png',
      sizeBytes: pngBuf.length,
      sha256: await sha256Hex(pngBuf),
      status: 'ready',
    },
    {
      id: 'asset-pdf',
      batchId: 'batch-c3',
      sourceType: 'file',
      originalName: 'a-pdf.pdf',
      relativePath: 'assets/a-pdf.pdf',
      mimeType: 'application/pdf',
      sizeBytes: pdfBuf.length,
      sha256: await sha256Hex(pdfBuf),
      status: 'ready',
    },
    {
      id: 'asset-pending',
      batchId: 'batch-c3',
      sourceType: 'file',
      originalName: 'a-pending.png',
      relativePath: 'assets/a-pending.png',
      mimeType: 'image/png',
      sizeBytes: 0,
      sha256: '',
      status: 'ignored',
    },
  ];
  return {
    projectRoot,
    projectId,
    assets,
    projects: {
      paths: async (id: string) => {
        assert.equal(id, projectId, 'paths() should be called with the projectId from input');
        return { root: projectRoot };
      },
      get: async (id: string) => {
        assert.equal(id, projectId, 'get() should be called with the projectId from input');
        return { assets };
      },
    },
  };
}

async function withFixture<T>(fn: (f: Fixture) => Promise<T>): Promise<T> {
  const f = await buildFixture();
  try {
    return await fn(f);
  } finally {
    await fsp.rm(f.projectRoot, { recursive: true, force: true });
  }
}

function makeService(projects: Fixture['projects']) {
  return createShortChainGenerationService(
    projects as never,
    { getShortChain: async () => null, rebuildShortChain: async () => null } as never,
    () => ({}) as never,
  );
}

test('C-3 preflightReferenceAssets: empty assetIds returns empty results, no project lookup', async () => {
  const fixture = await buildFixture();
  const svc = makeService(fixture.projects);
  const out = await svc.preflightReferenceAssets({ projectId: fixture.projectId, assetIds: [] });
  assert.equal(out.projectId, fixture.projectId);
  assert.deepEqual(out.results, []);
  await fsp.rm(fixture.projectRoot, { recursive: true, force: true });
});

test('C-3 preflightReferenceAssets: happy path resolves a real PNG with role=high_fidelity_visual_reference', async () => {
  await withFixture(async (f) => {
    const svc = makeService(f.projects);
    const out = await svc.preflightReferenceAssets({ projectId: f.projectId, assetIds: ['asset-png'] });
    assert.equal(out.projectId, f.projectId);
    assert.equal(out.results.length, 1);
    const r = out.results[0]!;
    assert.equal(r.status, 'resolved');
    assert.equal(r.assetId, 'asset-png');
    if (r.status !== 'resolved') throw new Error('unreachable');
    assert.equal(r.record.role, 'core_reference');
    assert.equal(r.record.relativePath, 'assets/a-good.png');
    assert.equal(r.record.mime, 'image/png');
    assert.equal(r.record.sizeBytes, 64);
    assert.match(r.record.absolutePath, /a-good\.png$/);
    assert.equal(r.record.sha256.length, 64, 'sha256 is hex-256');
  });
});

test('C-3 preflightReferenceAssets: mixed batch — resolved + NOT_FOUND + FORMAT_UNSUPPORTED + NOT_READY', async () => {
  await withFixture(async (f) => {
    const svc = makeService(f.projects);
    const out = await svc.preflightReferenceAssets({
      projectId: f.projectId,
      assetIds: ['asset-png', 'asset-does-not-exist', 'asset-pdf', 'asset-pending'],
    });
    assert.equal(out.results.length, 4);
    const byId = new Map(out.results.map((r) => [r.assetId, r]));

    // resolved
    const png = byId.get('asset-png');
    assert.ok(png && png.status === 'resolved', 'asset-png should resolve');
    // not found
    const missing = byId.get('asset-does-not-exist');
    assert.ok(missing && missing.status === 'failed', 'asset-does-not-exist should fail');
    if (missing && missing.status === 'failed') {
      assert.equal(missing.failure.code, 'REFERENCE_ASSET_NOT_FOUND');
    }
    // format unsupported (PDF signature)
    const pdf = byId.get('asset-pdf');
    assert.ok(pdf && pdf.status === 'failed', 'asset-pdf should fail');
    if (pdf && pdf.status === 'failed') {
      assert.equal(pdf.failure.code, 'REFERENCE_ASSET_FORMAT_UNSUPPORTED');
    }
    // not ready (status pending)
    const pending = byId.get('asset-pending');
    assert.ok(pending && pending.status === 'failed', 'asset-pending should fail');
    if (pending && pending.status === 'failed') {
      assert.equal(pending.failure.code, 'REFERENCE_ASSET_NOT_READY');
    }
  });
});

test('C-3 preflightReferenceAssets: duplicate IDs are de-duplicated', async () => {
  await withFixture(async (f) => {
    const svc = makeService(f.projects);
    const out = await svc.preflightReferenceAssets({
      projectId: f.projectId,
      assetIds: ['asset-png', 'asset-png', 'asset-png'],
    });
    assert.equal(out.results.length, 1, 'duplicate IDs collapse to a single result');
    assert.equal(out.results[0]!.status, 'resolved');
  });
});

test('C-3 preflightReferenceAssets: never throws — fail-soft semantics', async () => {
  await withFixture(async (f) => {
    const svc = makeService(f.projects);
    // Send only an ID that does not exist. The renderer relies on the
    // fail-soft contract; the handler MUST return a result, not throw.
    const out = await svc.preflightReferenceAssets({
      projectId: f.projectId,
      assetIds: ['asset-does-not-exist'],
    });
    assert.equal(out.results.length, 1);
    assert.equal(out.results[0]!.status, 'failed');
    if (out.results[0]!.status === 'failed') {
      assert.equal(out.results[0]!.failure.code, 'REFERENCE_ASSET_NOT_FOUND');
    }
  });
});
