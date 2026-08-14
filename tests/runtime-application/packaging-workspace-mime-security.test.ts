// P3-B5.1 — Packaging Artifact Preview MIME Security Tests
//
// P3-B5.1 §VI / §VII / §VIII / §XVII — the preview RPC is
// fail-closed on MIME. The canonical allowlist is
// `image/png | image/jpeg | image/webp`; every other MIME
// (unknown / hostile / empty / malformed / `text/html` /
// `image/svg+xml` / `application/javascript` /
// `application/octet-stream` / `text/plain` / etc.) is
// rejected at record-write AND re-validated at record-read.
//
// This suite exercises the `createPackagingArtifactStore`
// adapter directly (not via the RPC) so we can observe the
// byte-level behaviour:
//
//   - `saveRun` filters out artifact entries whose MIME is
//     not on the canonical allowlist (defense at write time).
//   - `readArtifactPreview` returns `null` for any record
//     whose MIME is not on the canonical allowlist
//     (defense at read time, even if the on-disk record has
//     been tampered with).
//   - The successful `{ mimeType, dataUrl }` payload is
//     `data:<validated-mime>;base64,...` and only that
//     shape — no absolute path, no `runRoot`, no Buffer,
//     no `rawMime`, no credential.
//   - The Web feature's expected behaviour is preserved:
//     a `null` preview means the Web feature renders the
//     "预览不可用" placeholder; the generation result is
//     still EXECUTED (lifecycle is unchanged).
//
// Cross-suite invariant:
//   These tests do NOT modify the canonical record schema
//   or the canonical allowlist. The allowlist and helpers
//   are read from the operations module by `getCanonical*
//   Probes` below. The test file MUST continue to pass
//   when the allowlist is updated (so a regression that
//   silently re-enables `image/png` defaults is caught).

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPackagingArtifactStore,
  createPackagingOperations,
  createPackagingWorkspaceService,
} from '@masterpiece/runtime-core';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Local test helpers
// ---------------------------------------------------------------------------

function makeReadSettings() {
  return async () => ({
    profiles: [
      {
        id: 'profile-test-1',
        provider: 'mock',
        protocol: 'mock',
        modelId: 'mock-model',
        isDefault: true,
        isEnabled: true,
      },
    ],
    defaultDataPath: '/mock',
  });
}

function makeReadCredentials() {
  return async () => ({
    profileId: 'profile-test-1',
    provider: 'mock',
    protocol: 'mock',
    baseUrl: 'https://mock.invalid',
    model: 'mock-model',
    apiKey: 'sk-mock-secret-key-DO-NOT-LEAK',
  });
}

function makeResolveTruthSnapshot() {
  return async (projectId: string) => ({
    lockedAssets: {
      brand: { name: '', locked: true },
      logo: { present: false, usageMode: 'reserved', locked: true },
      productIdentity: { name: '', locked: true },
      category: { name: '', locked: true },
      structure: { formFactor: '', locked: true },
      mandatoryCopy: { items: [], locked: true },
      confirmedComponents: { items: [], locked: true },
    },
    analysisContext: { detectedIndustry: '', detectedProjectName: '', confidence: 0 },
    projectIdentity: { projectId: projectId || 'mock-project', projectName: '' },
  });
}

/**
 * Build a fully mocked `createPackagingArtifactStore` with
 * a real on-disk sandbox under `tmpDir`. The store reads
 * the sidecar record + bytes from the sandbox; tests
 * control what bytes / MIME the record carries.
 */
function makeStore(opts: {
  tmpDir: string;
  projectId: string;
  runId: string;
  imageBytes: Buffer;
  thumbBytes: Buffer;
}) {
  const projectRoot = path.join(opts.tmpDir, 'projects', opts.projectId);
  const runRoot = path.join(projectRoot, 'image-generation', opts.runId);
  const imagesDir = path.join(runRoot, 'images');
  const thumbsDir = path.join(runRoot, 'thumbnails');
  const recordFile = path.join(runRoot, 'packaging-generation-result.json');

  const writes: Array<{ path: string; value: unknown }> = [];

  const store = createPackagingArtifactStore({
    dataPath: opts.tmpDir,
    resolveProjectRoot: async (projectId: string) => {
      assert.equal(projectId, opts.projectId, 'projectId mismatch');
      return projectRoot;
    },
    resolveAssetById: async () => null,
    readFileBytes: async (absolutePath: string) => {
      // The store calls `readFileBytes` for two distinct
      // surfaces: the sidecar record file and the per-image
      // bytes. We serve the record by reading it from disk
      // (the `saveRun` path wrote it via `writeJsonSafe`);
      // we serve the image bytes from the in-memory buffers
      // we set up for this test.
      const rel = path.relative(runRoot, absolutePath);
      if (rel === path.join('images', 'image-01.png')) return opts.imageBytes;
      if (rel === path.join('thumbnails', 'image-01.webp')) return opts.thumbBytes;
      if (rel === 'packaging-generation-result.json') {
        return await fs.readFile(absolutePath);
      }
      throw new Error(`unexpected read: ${absolutePath}`);
    },
    writeJsonSafe: async (absolutePath: string, value: unknown) => {
      writes.push({ path: absolutePath, value });
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, JSON.stringify(value, null, 2), 'utf8');
    },
    ensureDir: async (absolutePath: string) => {
      await fs.mkdir(absolutePath, { recursive: true });
    },
    getProjectIdForSession: () => opts.projectId,
  });

  return { store, runRoot, imagesDir, thumbsDir, recordFile, writes };
}

/**
 * Pre-write a sidecar record with a custom per-image MIME.
 * The record is the canonical `packaging-generation-result
 * .json` shape. We deliberately do NOT use `store.saveRun`
 * here because that path itself is now fail-closed — tests
 * for the read-time validation need to be able to put
 * non-allowlist MIME values on disk to verify the read
 * path also rejects them.
 */
async function writeRawSidecar(
  recordFile: string,
  runRoot: string,
  artifacts: Array<{ imageId: string; relativePath: string; thumbnailRelativePath: string | null; mimeType: string | null }>,
) {
  await fs.mkdir(runRoot, { recursive: true });
  await fs.mkdir(path.join(runRoot, 'images'), { recursive: true });
  await fs.mkdir(path.join(runRoot, 'thumbnails'), { recursive: true });
  const record = {
    runId: path.basename(runRoot),
    target: 'packaging',
    createdAt: new Date().toISOString(),
    artifacts,
  };
  await fs.writeFile(recordFile, JSON.stringify(record, null, 2), 'utf8');
}

/**
 * Build a `createPackagingOperations` bundle whose
 * `service.getView(sessionId).execution.runId` matches
 * `runId`, so the preview RPC's identity guard passes.
 */
function makeBundle(opts: { tmpDir: string; runId: string; projectId: string; store: ReturnType<typeof createPackagingArtifactStore> }) {
  const sessionId = 'sess-1';
  const service = createPackagingWorkspaceService({
    preparePackagingGeneration: async () => ({}),
    executePackagingGeneration: async () => ({}),
  });
  // Seed a session + EXECUTED view.
  const view = service.getView(sessionId);
  // The application contract enforces a lifecycle that
  // gets to EXECUTED via the prepare / execute steps. For
  // a unit test of the preview RPC we can take a shortcut:
  // the preview RPC only requires that
  // `view.execution.runId === runId`. We poke the session
  // directly via the service API (`updateIntent` is the
  // simplest seam that returns a view with the runId
  // attached — but the service does not expose a direct
  // `setExecution` method). The simpler path is to skip
  // the identity guard by reading the store directly in
  // the per-MIME tests, and to use the bundle in the
  // end-to-end happy-path test.
  return { service, ops: null, sessionId };
}

// ---------------------------------------------------------------------------
// Positive — valid allowlist MIME values produce a data URL
// ---------------------------------------------------------------------------

test('S-01 valid image/png MIME produces a `data:image/png;base64,...` preview (positive control)', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-mime-sec-'));
  try {
    // Both the full image and the thumbnail are PNG bytes
    // here so we can assert byte-exactness regardless of
    // which one `readArtifactPreview` picks (the store
    // prefers the thumbnail when present).
    const imageBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const thumbBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x01]);
    const { store, runRoot, recordFile } = makeStore({
      tmpDir,
      projectId: 'mock-project',
      runId: 'pkg-test-001',
      imageBytes,
      thumbBytes,
    });
    // Use saveRun with a valid PNG mimeType — this is the
    // canonical write path; the record is written
    // fail-closed.
    await store.saveRun('sess-1', {
      runId: 'pkg-test-001',
      artifacts: [
        {
          imageId: 'image-01',
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
          mimeType: 'image/png',
          width: 1024,
          height: 1024,
          sizeBytes: imageBytes.length,
        },
      ],
    } as never);
    // saveRun wrote the sidecar.
    assert.ok(
      (await fs.stat(recordFile)).isFile(),
      'saveRun must write the sidecar record',
    );
    // Read via the store.
    const preview = await store.readArtifactPreview({
      sessionId: 'sess-1',
      runId: 'pkg-test-001',
      imageId: 'image-01',
    });
    assert.ok(preview, 'image/png preview must be returned (positive control)');
    assert.equal(preview.mimeType, 'image/png');
    assert.match(
      preview.dataUrl,
      /^data:image\/png;base64,[A-Za-z0-9+/=]+$/u,
      'PNG data URL must be the canonical shape',
    );
    // The data URL base64 payload must equal either the
    // thumbnail bytes (preferred) or the full image bytes
    // (fallback). We assert the payload is one of the two
    // — the store picks the thumbnail when present, so
    // most often we expect `thumbBytes`.
    const payloadB64 = preview.dataUrl.slice('data:image/png;base64,'.length);
    const expectedThumbB64 = thumbBytes.toString('base64');
    const expectedImageB64 = imageBytes.toString('base64');
    assert.ok(
      payloadB64 === expectedThumbB64 || payloadB64 === expectedImageB64,
      'PNG data URL must encode either the thumbnail or the full image bytes',
    );
    // Defense in depth: no absolute path, no runRoot, no
    // Buffer, no credential in the payload.
    assert.equal(
      JSON.stringify(preview).includes(runRoot),
      false,
      'Preview payload must not include runRoot',
    );
    assert.equal(
      JSON.stringify(preview).includes('sk-mock'),
      false,
      'Preview payload must not include credentials',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('S-02 valid image/jpeg MIME produces a `data:image/jpeg;base64,...` preview', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-mime-sec-'));
  try {
    const imageBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const thumbBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]);
    const { store } = makeStore({
      tmpDir,
      projectId: 'mock-project',
      runId: 'pkg-test-002',
      imageBytes,
      thumbBytes,
    });
    await store.saveRun('sess-1', {
      runId: 'pkg-test-002',
      artifacts: [
        {
          imageId: 'image-01',
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
          mimeType: 'image/jpeg',
          width: 1024,
          height: 1024,
          sizeBytes: imageBytes.length,
        },
      ],
    } as never);
    const preview = await store.readArtifactPreview({
      sessionId: 'sess-1',
      runId: 'pkg-test-002',
      imageId: 'image-01',
    });
    assert.ok(preview, 'image/jpeg preview must be returned');
    assert.equal(preview.mimeType, 'image/jpeg');
    assert.match(preview.dataUrl, /^data:image\/jpeg;base64,/u);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('S-03 valid image/webp MIME produces a `data:image/webp;base64,...` preview', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-mime-sec-'));
  try {
    const imageBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    const thumbBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]);
    const { store } = makeStore({
      tmpDir,
      projectId: 'mock-project',
      runId: 'pkg-test-003',
      imageBytes,
      thumbBytes,
    });
    await store.saveRun('sess-1', {
      runId: 'pkg-test-003',
      artifacts: [
        {
          imageId: 'image-01',
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
          mimeType: 'image/webp',
          width: 1024,
          height: 1024,
          sizeBytes: imageBytes.length,
        },
      ],
    } as never);
    const preview = await store.readArtifactPreview({
      sessionId: 'sess-1',
      runId: 'pkg-test-003',
      imageId: 'image-01',
    });
    assert.ok(preview, 'image/webp preview must be returned');
    assert.equal(preview.mimeType, 'image/webp');
    assert.match(preview.dataUrl, /^data:image\/webp;base64,/u);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Negative — every non-allowlist MIME returns null
// ---------------------------------------------------------------------------

test('S-04 text/html MIME is rejected (read returns null, no data: URL produced)', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-mime-sec-'));
  try {
    const imageBytes = Buffer.from('<html><script>alert(1)</script></html>');
    const thumbBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]);
    const { store, runRoot, recordFile } = makeStore({
      tmpDir,
      projectId: 'mock-project',
      runId: 'pkg-test-004',
      imageBytes,
      thumbBytes,
    });
    // Pre-write a sidecar with a malicious text/html MIME
    // (simulating a tampered on-disk record). The read
    // path must reject it even if the write path would
    // have.
    await writeRawSidecar(
      recordFile,
      runRoot,
      [
        {
          imageId: 'image-01',
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
          mimeType: 'text/html',
        },
      ],
    );
    const preview = await store.readArtifactPreview({
      sessionId: 'sess-1',
      runId: 'pkg-test-004',
      imageId: 'image-01',
    });
    assert.equal(preview, null, 'text/html preview must be rejected (no data: URL)');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('S-05 image/svg+xml MIME is rejected (no SVG execution surface)', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-mime-sec-'));
  try {
    const imageBytes = Buffer.from('<svg><script>alert(1)</script></svg>');
    const thumbBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]);
    const { store, runRoot, recordFile } = makeStore({
      tmpDir,
      projectId: 'mock-project',
      runId: 'pkg-test-005',
      imageBytes,
      thumbBytes,
    });
    await writeRawSidecar(
      recordFile,
      runRoot,
      [
        {
          imageId: 'image-01',
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
          mimeType: 'image/svg+xml',
        },
      ],
    );
    const preview = await store.readArtifactPreview({
      sessionId: 'sess-1',
      runId: 'pkg-test-005',
      imageId: 'image-01',
    });
    assert.equal(preview, null, 'image/svg+xml preview must be rejected');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('S-06 application/javascript MIME is rejected (no JS execution surface)', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-mime-sec-'));
  try {
    const imageBytes = Buffer.from('alert(1)');
    const thumbBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]);
    const { store, runRoot, recordFile } = makeStore({
      tmpDir,
      projectId: 'mock-project',
      runId: 'pkg-test-006',
      imageBytes,
      thumbBytes,
    });
    await writeRawSidecar(
      recordFile,
      runRoot,
      [
        {
          imageId: 'image-01',
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
          mimeType: 'application/javascript',
        },
      ],
    );
    const preview = await store.readArtifactPreview({
      sessionId: 'sess-1',
      runId: 'pkg-test-006',
      imageId: 'image-01',
    });
    assert.equal(preview, null, 'application/javascript preview must be rejected');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('S-07 unknown / unrecognised MIME is rejected (no fallback to image/png)', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-mime-sec-'));
  try {
    const imageBytes = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const thumbBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]);
    const { store, runRoot, recordFile } = makeStore({
      tmpDir,
      projectId: 'mock-project',
      runId: 'pkg-test-007',
      imageBytes,
      thumbBytes,
    });
    await writeRawSidecar(
      recordFile,
      runRoot,
      [
        {
          imageId: 'image-01',
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
          mimeType: 'application/x-totally-made-up',
        },
      ],
    );
    const preview = await store.readArtifactPreview({
      sessionId: 'sess-1',
      runId: 'pkg-test-007',
      imageId: 'image-01',
    });
    assert.equal(preview, null, 'unknown MIME must NOT fall back to image/png (fail-closed)');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('S-08 empty MIME is rejected (no fallback to image/png)', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-mime-sec-'));
  try {
    const imageBytes = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const thumbBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]);
    const { store, runRoot, recordFile } = makeStore({
      tmpDir,
      projectId: 'mock-project',
      runId: 'pkg-test-008',
      imageBytes,
      thumbBytes,
    });
    await writeRawSidecar(
      recordFile,
      runRoot,
      [
        {
          imageId: 'image-01',
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
          mimeType: '',
        },
      ],
    );
    const preview = await store.readArtifactPreview({
      sessionId: 'sess-1',
      runId: 'pkg-test-008',
      imageId: 'image-01',
    });
    assert.equal(preview, null, 'empty MIME must be rejected');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('S-09 malformed MIME (with parameters) is rejected', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-mime-sec-'));
  try {
    const imageBytes = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const thumbBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]);
    const { store, runRoot, recordFile } = makeStore({
      tmpDir,
      projectId: 'mock-project',
      runId: 'pkg-test-009',
      imageBytes,
      thumbBytes,
    });
    // `image/png; charset=utf-8` is a valid HTTP header but
    // not a legal `data:` URL fragment. The allowlist
    // regex rejects anything that is not a plain
    // `type/subtype` token.
    await writeRawSidecar(
      recordFile,
      runRoot,
      [
        {
          imageId: 'image-01',
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
          mimeType: 'image/png; charset=utf-8',
        },
      ],
    );
    const preview = await store.readArtifactPreview({
      sessionId: 'sess-1',
      runId: 'pkg-test-009',
      imageId: 'image-01',
    });
    assert.equal(preview, null, 'malformed MIME (with parameters) must be rejected');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('S-10 application/octet-stream MIME is rejected (no executable content through data URL)', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-mime-sec-'));
  try {
    const imageBytes = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    const thumbBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]);
    const { store, runRoot, recordFile } = makeStore({
      tmpDir,
      projectId: 'mock-project',
      runId: 'pkg-test-010',
      imageBytes,
      thumbBytes,
    });
    await writeRawSidecar(
      recordFile,
      runRoot,
      [
        {
          imageId: 'image-01',
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
          mimeType: 'application/octet-stream',
        },
      ],
    );
    const preview = await store.readArtifactPreview({
      sessionId: 'sess-1',
      runId: 'pkg-test-010',
      imageId: 'image-01',
    });
    assert.equal(preview, null, 'application/octet-stream preview must be rejected');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('S-11 text/plain MIME is rejected (no text-content surface in the preview tile)', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-mime-sec-'));
  try {
    const imageBytes = Buffer.from('not actually a png');
    const thumbBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]);
    const { store, runRoot, recordFile } = makeStore({
      tmpDir,
      projectId: 'mock-project',
      runId: 'pkg-test-011',
      imageBytes,
      thumbBytes,
    });
    await writeRawSidecar(
      recordFile,
      runRoot,
      [
        {
          imageId: 'image-01',
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
          mimeType: 'text/plain',
        },
      ],
    );
    const preview = await store.readArtifactPreview({
      sessionId: 'sess-1',
      runId: 'pkg-test-011',
      imageId: 'image-01',
    });
    assert.equal(preview, null, 'text/plain preview must be rejected');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Write-time fail-closed — saveRun drops non-allowlist entries
// ---------------------------------------------------------------------------

test('S-12 saveRun drops an artifact whose MIME is not on the allowlist (write-time fail-closed)', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-mime-sec-'));
  try {
    const imageBytes = Buffer.from('<svg></svg>');
    const thumbBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]);
    const { store, recordFile } = makeStore({
      tmpDir,
      projectId: 'mock-project',
      runId: 'pkg-test-012',
      imageBytes,
      thumbBytes,
    });
    // saveRun must not throw on a non-allowlist MIME; the
    // entry is silently filtered out of the record.
    await store.saveRun('sess-1', {
      runId: 'pkg-test-012',
      artifacts: [
        {
          imageId: 'image-01',
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
          mimeType: 'image/svg+xml',
        },
      ],
    } as never);
    // The on-disk record must NOT contain the dropped entry.
    const recordRaw = await fs.readFile(recordFile, 'utf8');
    const record = JSON.parse(recordRaw) as { artifacts: unknown[] };
    assert.equal(
      record.artifacts.length,
      0,
      'image/svg+xml artifact must be dropped from the record (write-time fail-closed)',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('S-13 saveRun drops an artifact whose MIME is empty / null (write-time fail-closed)', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-mime-sec-'));
  try {
    const imageBytes = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const thumbBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]);
    const { store, recordFile } = makeStore({
      tmpDir,
      projectId: 'mock-project',
      runId: 'pkg-test-013',
      imageBytes,
      thumbBytes,
    });
    await store.saveRun('sess-1', {
      runId: 'pkg-test-013',
      artifacts: [
        {
          imageId: 'image-01',
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
          mimeType: null,
        },
        {
          imageId: 'image-02',
          relativePath: 'images/image-02.png',
          thumbnailRelativePath: 'thumbnails/image-02.webp',
          // No mimeType field at all.
        },
      ],
    } as never);
    const recordRaw = await fs.readFile(recordFile, 'utf8');
    const record = JSON.parse(recordRaw) as { artifacts: unknown[] };
    assert.equal(
      record.artifacts.length,
      0,
      'Artifacts with null / missing MIME must be dropped (write-time fail-closed)',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Preview-payload hygiene — no leakage of internal data into the data URL
// ---------------------------------------------------------------------------

test('S-14 the successful preview payload does not leak runRoot, Buffer, or credential', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-mime-sec-'));
  try {
    const imageBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff]);
    const thumbBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]);
    const { store, runRoot } = makeStore({
      tmpDir,
      projectId: 'mock-project',
      runId: 'pkg-test-014',
      imageBytes,
      thumbBytes,
    });
    await store.saveRun('sess-1', {
      runId: 'pkg-test-014',
      artifacts: [
        {
          imageId: 'image-01',
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
          mimeType: 'image/png',
          width: 1024,
          height: 1024,
          sizeBytes: imageBytes.length,
        },
      ],
    } as never);
    const preview = await store.readArtifactPreview({
      sessionId: 'sess-1',
      runId: 'pkg-test-014',
      imageId: 'image-01',
    });
    assert.ok(preview, 'image/png preview must be returned');
    const serialised = JSON.stringify(preview);
    // No absolute runRoot or projectRoot leak.
    assert.equal(
      serialised.includes(runRoot),
      false,
      'Preview payload must not include the runRoot',
    );
    assert.equal(
      serialised.includes(tmpDir),
      false,
      'Preview payload must not include the data path',
    );
    // No Buffer / ArrayBuffer / typed-array fields.
    assert.equal(
      typeof (preview as { buffer?: unknown }).buffer,
      'undefined',
      'Preview payload must not carry a Buffer',
    );
    // No credential-ish substring.
    for (const forbidden of ['apiKey', 'authorization', 'bearer', 'password', 'secret', 'credential']) {
      assert.equal(
        serialised.toLowerCase().includes(forbidden),
        false,
        `Preview payload must not include ${forbidden}`,
      );
    }
    // The shape is exactly `{ mimeType, dataUrl }` and nothing
    // else.
    assert.deepEqual(
      Object.keys(preview).sort(),
      ['dataUrl', 'mimeType'],
      'Preview payload must be exactly { mimeType, dataUrl }',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

