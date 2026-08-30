import dns from 'node:dns/promises';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import sharp from 'sharp';
import type { WebReferenceItem } from './creative-research/contracts.ts';
import { assertInside } from './analysis-contract.ts';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function safeId(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value)) throw new Error('invalid reference cache identifier');
  return value;
}

function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b! >= 16 && b! <= 31) || (a === 192 && b === 168);
  }
  const normalized = address.toLowerCase();
  return normalized === '::1' || normalized === '::' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:') || normalized.startsWith('::ffff:127.') || normalized.startsWith('::ffff:10.') || normalized.startsWith('::ffff:192.168.');
}

async function assertPublicUrl(value: string): Promise<URL> {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('unsupported image URL');
  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((item) => isPrivateAddress(item.address))) throw new Error('private image host rejected');
  return url;
}

async function fetchImage(fetchImpl: typeof fetch, source: string, timeoutMs: number): Promise<{ bytes: Buffer; mediaType: string; finalUrl: string }> {
  let url = await assertPublicUrl(source);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { redirect: 'manual', signal: controller.signal, headers: { Accept: 'image/jpeg,image/png,image/webp,image/gif' } });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location || redirects === 3) throw new Error('invalid image redirect');
        url = await assertPublicUrl(new URL(location, url).toString());
        continue;
      }
      if (!response.ok) throw new Error(`image download HTTP ${response.status}`);
      const mediaType = (response.headers.get('content-type') || '').split(';')[0]!.trim().toLowerCase();
      if (!ALLOWED_TYPES.has(mediaType)) throw new Error('unsupported image MIME type');
      const declared = Number(response.headers.get('content-length') || 0);
      if (declared > MAX_IMAGE_BYTES) throw new Error('image exceeds 10 MB');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('image response body is missing');
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        size += result.value.byteLength;
        if (size > MAX_IMAGE_BYTES) { await reader.cancel(); throw new Error('image exceeds 10 MB'); }
        chunks.push(result.value);
      }
      return { bytes: Buffer.concat(chunks), mediaType, finalUrl: url.toString() };
    } finally { clearTimeout(timer); }
  }
  throw new Error('image redirect limit exceeded');
}

export function createCreativeResearchReferenceImageCache(options: {
  readDefaultDataPath: () => string | Promise<string>;
  fetch?: typeof fetch;
  timeoutMs?: number;
}) {
  const fetchImpl = options.fetch || globalThis.fetch;
  return Object.freeze({
    async cache(reference: WebReferenceItem): Promise<WebReferenceItem> {
      if (!reference.remoteImageUrl) return { ...reference, imageStatus: 'UNAVAILABLE', imageUnavailableReason: 'NO_REMOTE_IMAGE' };
      try {
        const sessionId = safeId(reference.sessionId);
        const referenceId = safeId(reference.id);
        const root = path.join(path.resolve(await options.readDefaultDataPath()), 'creative-research');
        const target = assertInside(root, path.join(root, sessionId, 'assets', 'references', referenceId));
        const downloaded = await fetchImage(fetchImpl, reference.remoteImageUrl, options.timeoutMs ?? 15_000);
        const image = sharp(downloaded.bytes, { animated: false, failOn: 'error' });
        const metadata = await image.metadata();
        if (!metadata.format || !['jpeg', 'png', 'webp', 'gif'].includes(metadata.format)) throw new Error('decoded image format is not allowed');
        if (!metadata.width || !metadata.height || metadata.width < 600 || metadata.height < 400) throw new Error('image dimensions below 600x400');
        const encoded = await image.webp({ quality: 86 }).toBuffer();
        await fs.mkdir(target, { recursive: true });
        await fs.writeFile(path.join(target, 'image.webp'), encoded);
        await fs.writeFile(path.join(target, 'metadata.json'), JSON.stringify({
          sourceUrl: reference.sourceUrl,
          platform: reference.platform,
          originalImageUrl: reference.remoteImageUrl,
          finalUrl: downloaded.finalUrl,
          sourceMediaType: downloaded.mediaType,
          width: metadata.width, height: metadata.height, bytes: encoded.byteLength,
          retrievedAt: reference.retrievedAt,
          cachedAt: new Date().toISOString(),
        }, null, 2), 'utf8');
        return {
          ...reference, imageStatus: 'READY', localAssetId: referenceId,
          cachedImageUrl: `/_masterpiece/creative-research/${encodeURIComponent(sessionId)}/references/${encodeURIComponent(referenceId)}/image.webp`,
          imageWidth: metadata.width, imageHeight: metadata.height,
        };
      } catch (error) {
        return { ...reference, imageStatus: 'UNAVAILABLE', imageUnavailableReason: error instanceof Error ? error.message : 'image cache failed' };
      }
    },
  });
}

export type CreativeResearchReferenceImageCache = ReturnType<typeof createCreativeResearchReferenceImageCache>;
