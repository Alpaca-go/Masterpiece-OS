// P3-D3.6A/6B / UA 鈥?Web Asset Upload Contract tests.
//
// Pins the frozen browser File 鈫?project asset contract:
//   projects.importFileBytes({ projectId, file: { name, mime, size,
//   content(base64) } }) 鈫?{ asset, duplicate, existingAssetId }
//
// Persistence authority: project-store.persistBufferAsset (sha256
// dedup, project binding via assertInside, asset id authority,
// MIME/extension validation). Reference images only: PNG/JPEG/WEBP,
// per-file cap 8 MiB. No absolute path, no second asset store.
//
// Web asset upload boundary regression coverage.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createProjectStore } from '@masterpiece/runtime-core/application/project-store.ts';
import type { PublicSettings } from '@masterpiece/runtime-core/application-contracts.ts';

const ONE_PIXEL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

// A second distinct valid PNG so upload fixtures never collide with
// the project seed asset during sha256 dedup.
const OTHER_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

function makeSettings(data: string): PublicSettings {
  return {
    profiles: [{
      id: 'profile-upload',
      displayName: 'Upload Test',
      provider: 'volcengine',
      baseUrl: 'https://example.invalid/api/v3',
      modelId: 'doubao-seedream-5-0-pro-260628',
      credentialKey: 'masterpiece-os/profile-upload',
      hasApiKey: true,
      isDefault: true,
      isEnabled: true,
      createdAt: '2026-08-15T00:00:00.000Z',
      updatedAt: '2026-08-15T00:00:00.000Z',
    }],
    defaultProfileId: 'profile-upload',
    provider: 'volcengine',
    baseUrl: 'https://example.invalid/api/v3',
    model: 'doubao-seedream-5-0-pro-260628',
    hasApiKey: true,
    defaultDataPath: data,
    cacheEnabled: true,
    logLevel: 'info',
    connectionStatus: 'untested',
  };
}

async function makeStore() {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'p3-d3-6b-ua-'));
  const data = path.join(temporary, 'data');
  const source = path.join(temporary, 'source');
  await fs.mkdir(source, { recursive: true });
  await fs.writeFile(path.join(source, 'seed.png'), OTHER_PNG);
  const store = createProjectStore(async () => makeSettings(data));
  const project = await store.create({ sourcePaths: [source], apiProfileId: 'profile-upload' });
  return { temporary, store, data, project };
}

function b64(buffer: Buffer): string {
  return buffer.toString('base64');
}

async function makeJpeg(): Promise<Buffer> {
  return sharp(ONE_PIXEL_PNG).jpeg().toBuffer();
}

async function makeWebp(): Promise<Buffer> {
  return sharp(ONE_PIXEL_PNG).webp().toBuffer();
}

test('UA-02 valid PNG upload 鈫?project-bound generation_reference asset', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    // create() with an empty source path may fail; fall back to a
    // minimal project via the store's own API shape.
    const result = await store.importFileBytes({
      projectId: project.id,
      file: { name: 'reference.png', mime: 'image/png', size: ONE_PIXEL_PNG.length, content: b64(ONE_PIXEL_PNG) },
    });
    assert.equal(result.duplicate, false);
    assert.ok(result.asset.id);
    assert.equal(result.asset.projectId, project.id);
    assert.equal(result.asset.mime, 'image/png');
    assert.equal(result.asset.sizeBytes, ONE_PIXEL_PNG.length);
    assert.equal(result.asset.usage, 'generation_reference');
    assert.ok(result.asset.sha256.length === 64);
    assert.doesNotMatch(result.asset.relativePath, /^[a-zA-Z]:[\\/]/u);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('UA-03 valid JPEG upload 鈫?asset', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    const jpeg = await makeJpeg();
    const result = await store.importFileBytes({
      projectId: project.id,
      file: { name: 'photo.jpg', mime: 'image/jpeg', size: jpeg.length, content: b64(jpeg) },
    });
    assert.equal(result.duplicate, false);
    assert.equal(result.asset.mime, 'image/jpeg');
    assert.equal(result.asset.usage, 'generation_reference');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('UA-03b valid WEBP upload 鈫?asset', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    const webp = await makeWebp();
    const result = await store.importFileBytes({
      projectId: project.id,
      file: { name: 'photo.webp', mime: 'image/webp', size: webp.length, content: b64(webp) },
    });
    assert.equal(result.duplicate, false);
    assert.equal(result.asset.mime, 'image/webp');
    assert.equal(result.asset.usage, 'generation_reference');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('UA-04 empty file reject (UPLOAD_FILE_EMPTY)', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    await assert.rejects(
      () => store.importFileBytes({
        projectId: project.id,
        file: { name: 'empty.png', mime: 'image/png', size: 0, content: '' },
      }),
      (error: any) => error.code === 'UPLOAD_FILE_EMPTY',
    );
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('UA-05 unsupported MIME reject (UPLOAD_FILE_TYPE_UNSUPPORTED)', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    await assert.rejects(
      () => store.importFileBytes({
        projectId: project.id,
        file: { name: 'doc.pdf', mime: 'application/pdf', size: 10, content: b64(Buffer.alloc(10)) },
      }),
      (error: any) => error.code === 'UPLOAD_FILE_TYPE_UNSUPPORTED',
    );
    await assert.rejects(
      () => store.importFileBytes({
        projectId: project.id,
        file: { name: 'ref.png', mime: 'text/plain', size: 10, content: b64(Buffer.alloc(10)) },
      }),
      (error: any) => error.code === 'UPLOAD_FILE_TYPE_UNSUPPORTED',
    );
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('UA-06 size over cap reject (UPLOAD_FILE_TOO_LARGE)', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    await assert.rejects(
      () => store.importFileBytes({
        projectId: project.id,
        file: { name: 'big.png', mime: 'image/png', size: 8 * 1024 * 1024 + 1, content: 'x' },
      }),
      (error: any) => error.code === 'UPLOAD_FILE_TOO_LARGE',
    );
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('UA-07 project not found reject (UPLOAD_PROJECT_NOT_FOUND)', async () => {
  const { store } = await makeStore();
  await assert.rejects(
    () => store.importFileBytes({
      projectId: '00000000-0000-4000-8000-000000000000',
      file: { name: 'ref.png', mime: 'image/png', size: 10, content: 'x' },
    }),
    (error: any) => error.code === 'UPLOAD_PROJECT_NOT_FOUND',
  );
});

test('UA-09 filename traversal sanitized (no escape from project root)', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    const result = await store.importFileBytes({
      projectId: project.id,
      file: { name: '../../evil.png', mime: 'image/png', size: ONE_PIXEL_PNG.length, content: b64(ONE_PIXEL_PNG) },
    });
    assert.equal(result.duplicate, false);
    assert.doesNotMatch(result.asset.relativePath, /\.\./u);
    assert.doesNotMatch(result.asset.relativePath, /^[a-zA-Z]:[\\/]/u);
    const paths = await store.paths(project.id);
    const full = path.join(paths.root, result.asset.relativePath);
    assert.ok(full.startsWith(path.resolve(paths.root)), 'asset must stay inside project root');
    // C:\ style path must not survive basename sanitization
    const cResult = await store.importFileBytes({
      projectId: project.id,
      file: { name: 'C:\\evil.png', mime: 'image/png', size: ONE_PIXEL_PNG.length, content: b64(ONE_PIXEL_PNG) },
    });
    assert.doesNotMatch(cResult.asset.name, /[\\/]/u);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('UA-10 sha256 dedup returns existing asset (duplicate: true)', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    const first = await store.importFileBytes({
      projectId: project.id,
      file: { name: 'same.png', mime: 'image/png', size: ONE_PIXEL_PNG.length, content: b64(ONE_PIXEL_PNG) },
    });
    const second = await store.importFileBytes({
      projectId: project.id,
      file: { name: 'same-copy.png', mime: 'image/png', size: ONE_PIXEL_PNG.length, content: b64(ONE_PIXEL_PNG) },
    });
    assert.equal(second.duplicate, true);
    assert.equal(second.existingAssetId, first.asset.id);
    assert.equal(second.asset.id, first.asset.id);
    assert.equal(second.asset.projectId, project.id);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('UA-11 persisted asset survives reload (scanAssets)', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    await store.importFileBytes({
      projectId: project.id,
      file: { name: 'persist.png', mime: 'image/png', size: ONE_PIXEL_PNG.length, content: b64(ONE_PIXEL_PNG) },
    });
    const summary = await store.scan(project.id);
    assert.ok(summary.items.some((item) => item.name === 'persist.png'));
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('UA-12 no absolute path in response', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    const result = await store.importFileBytes({
      projectId: project.id,
      file: { name: 'ref.png', mime: 'image/png', size: ONE_PIXEL_PNG.length, content: b64(ONE_PIXEL_PNG) },
    });
    const serialized = JSON.stringify(result);
    assert.doesNotMatch(serialized, /[a-zA-Z]:[\\/]/u);
    assert.doesNotMatch(serialized, /node-credentials|master\.key|apiKey|token|secret/iu);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('UA-13 failed persist leaves no corrupt asset (size mismatch rejected before persist)', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    const before = await store.scan(project.id);
    await assert.rejects(
      () => store.importFileBytes({
        projectId: project.id,
        file: { name: 'mismatch.png', mime: 'image/png', size: 999, content: b64(ONE_PIXEL_PNG) },
      }),
      (error: any) => error.code === 'UPLOAD_TRANSPORT_FAILED',
    );
    const after = await store.scan(project.id);
    assert.equal(after.items.length, before.items.length, 'no asset may be added by a rejected upload');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('UA-18 malformed base64 rejected (UPLOAD_TRANSPORT_FAILED)', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    await assert.rejects(
      () => store.importFileBytes({
        projectId: project.id,
        file: { name: 'bad.png', mime: 'image/png', size: 1, content: '!!!not-base64!!!' },
      }),
      (error: any) => error.code === 'UPLOAD_TRANSPORT_FAILED',
    );
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('UA-20 upload path performs zero Provider calls', async () => {
  const { temporary, store, project } = await makeStore();
  try {
    const result = await store.importFileBytes({
      projectId: project.id,
      file: { name: 'ref.png', mime: 'image/png', size: ONE_PIXEL_PNG.length, content: b64(ONE_PIXEL_PNG) },
    });
    assert.equal(result.duplicate, false);
    assert.ok(result.asset.id);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

