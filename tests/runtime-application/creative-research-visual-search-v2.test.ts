import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createCreativeResearchReferenceImageCache } from '@masterpiece/runtime-core/application/creative-research-reference-image-cache.ts';
import { createCreativeResearchReferenceSearchService } from '@masterpiece/runtime-core/application/creative-research-reference-search-service.ts';
import { creativeResearchSearchError } from '@masterpiece/runtime-core/application/creative-research-search-errors.ts';
import type { SearchQuery, WebReferenceItem } from '@masterpiece/runtime-core/application/creative-research/contracts.ts';

const NOW = '2026-08-30T08:00:00.000Z';

function reference(remoteImageUrl = 'https://93.184.216.34/reference.png'): WebReferenceItem {
  return {
    id: 'reference-1', sessionId: 'session-1', sourceType: 'WEB_REFERENCE', resourceType: 'IMAGE',
    sourceUrl: 'https://example.com/case', canonicalUrl: 'https://example.com/case', remoteImageUrl,
    provider: 'baidu-search', publisherOrDomain: 'example.com', queryId: 'query-1', resultRank: 1,
    tags: [], retrievedAt: NOW, createdAt: NOW, searchIntent: 'VISUAL', imageStatus: 'PENDING',
  };
}

test('Visual Search v2 caches a validated remote image as persistent WebP', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-research-image-cache-'));
  try {
    const source = await sharp({ create: { width: 640, height: 480, channels: 3, background: '#ccbbaa' } }).png().toBuffer();
    const cache = createCreativeResearchReferenceImageCache({
      readDefaultDataPath: () => temporary,
      fetch: async () => new Response(source, { status: 200, headers: { 'content-type': 'image/png', 'content-length': String(source.byteLength) } }),
    });
    const cached = await cache.cache(reference());
    assert.equal(cached.imageStatus, 'READY');
    assert.match(cached.cachedImageUrl || '', /\/_masterpiece\/creative-research\/session-1\/references\/reference-1\/image\.webp$/u);
    const target = path.join(temporary, 'creative-research', 'session-1', 'assets', 'references', 'reference-1');
    assert.equal((await sharp(await fs.readFile(path.join(target, 'image.webp'))).metadata()).format, 'webp');
    const metadata = JSON.parse(await fs.readFile(path.join(target, 'metadata.json'), 'utf8'));
    assert.equal(metadata.width, 640);
    assert.equal(metadata.height, 480);
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
});

test('Visual Search v2 rejects private hosts, SVG, and undersized images without losing reference provenance', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-research-image-reject-'));
  try {
    let calls = 0;
    const privateResult = await createCreativeResearchReferenceImageCache({
      readDefaultDataPath: () => temporary, fetch: async () => { calls += 1; return new Response(); },
    }).cache(reference('http://127.0.0.1/private.png'));
    assert.equal(privateResult.imageStatus, 'UNAVAILABLE');
    assert.equal(calls, 0);
    assert.equal(privateResult.sourceUrl, 'https://example.com/case');

    const svgResult = await createCreativeResearchReferenceImageCache({
      readDefaultDataPath: () => temporary,
      fetch: async () => new Response('<svg/>', { status: 200, headers: { 'content-type': 'image/svg+xml' } }),
    }).cache(reference());
    assert.equal(svgResult.imageStatus, 'UNAVAILABLE');

    const disguisedSvgResult = await createCreativeResearchReferenceImageCache({
      readDefaultDataPath: () => temporary,
      fetch: async () => new Response('<svg width="640" height="480"></svg>', { status: 200, headers: { 'content-type': 'image/png' } }),
    }).cache(reference());
    assert.equal(disguisedSvgResult.imageStatus, 'UNAVAILABLE');
    assert.match(disguisedSvgResult.imageUnavailableReason || '', /format/u);

    const small = await sharp({ create: { width: 320, height: 200, channels: 3, background: '#000' } }).png().toBuffer();
    const smallResult = await createCreativeResearchReferenceImageCache({
      readDefaultDataPath: () => temporary,
      fetch: async () => new Response(small, { status: 200, headers: { 'content-type': 'image/png' } }),
    }).cache(reference());
    assert.equal(smallResult.imageStatus, 'UNAVAILABLE');
    assert.match(smallResult.imageUnavailableReason || '', /600x400/u);
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
});

test('fatal credential errors stop a search batch before additional queued queries start', async () => {
  const pending: SearchQuery[] = Array.from({ length: 6 }, (_, index) => ({
    id: `query-${index}`, sessionId: 'session-1', text: `query ${index}`, kind: 'CONCEPT', batch: 'batch',
    status: 'PENDING', derivedFromKeywordIds: [], createdAt: NOW, intent: index < 3 ? 'VISUAL' : 'KNOWLEDGE',
  }));
  let calls = 0;
  const service = createCreativeResearchReferenceSearchService({
    sessions: { async create(value) { return value; }, async get() { return { id: 'session-1', projectId: 'p', status: 'RESEARCH', sourceDocumentIds: [], createdAt: NOW, updatedAt: NOW }; }, async save(value) { return value; }, async listByProject() { return []; } },
    briefs: { async saveRevision(value) { return value; }, async getActiveRevision() { return null; }, async listRevisions() { return []; } },
    plans: { async save(value) { return value; }, async get() { return null; } },
    history: { async appendQuery(value) { return value; }, async recordQueryProgress(_s, id, update) { return { ...pending.find((item) => item.id === id)!, ...update }; }, async listSessionSearchHistory() { return pending; } },
    references: { async storeReference(value) { return value; }, async getReference() { return null; }, async listSessionReferences() { return []; }, async saveSelection(value) { return value; }, async listSelections() { return []; }, async saveRegion(value) { return value; }, async listRegions() { return []; }, async saveNegativeSignal(value) { return value; }, async listNegativeSignals() { return []; } },
    gateway: { async search() { calls += 1; throw creativeResearchSearchError('AUTH_FAILED', 'invalid credential'); } },
  });
  await assert.rejects(service.executeSearchBatch('session-1'), (error: any) => error.code === 'AUTH_FAILED');
  assert.ok(calls <= 2, `expected no more than in-flight workers, got ${calls}`);
});
