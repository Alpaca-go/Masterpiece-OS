import crypto from 'node:crypto';
import type { ReferenceSearchGateway, ReferenceSearchInput, SearchResultPage } from './creative-research/ports.ts';
import type { WebReferenceItem } from './creative-research/contracts.ts';
import { assertReferenceSearchInput, assertSearchResultPage } from './creative-research/search-contract.ts';
import { creativeResearchSearchError } from './creative-research-search-errors.ts';

const PROVIDER = 'baidu-search';
const DEFAULT_ENDPOINT = 'https://qianfan.baidubce.com/v2/ai_search/web_search';
export const BAIDU_REFERENCE_SEARCH_CREDENTIAL_ID = 'reference-search-baidu';
export const BAIDU_REFERENCE_RETENTION_POLICY = 'PROVENANCE_METADATA_ONLY';
const TRACKING_PARAMETERS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'spm', 'from', 'fr']);

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function createBaiduReferenceSearchCredentialReader(store: { read(profileId: string): Promise<string> }): () => Promise<string> {
  return () => store.read(BAIDU_REFERENCE_SEARCH_CREDENTIAL_ID);
}

interface BaiduReference {
  id?: string | number;
  title?: string;
  url?: string;
  website?: string;
  web_anchor?: string;
  type?: string;
  image?: { url?: string; width?: number; height?: number };
}

function normalizeUrl(value: string, removeTracking: boolean): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported URL protocol');
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  url.hash = '';
  if (removeTracking) {
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMETERS.has(key.toLowerCase())) url.searchParams.delete(key);
    }
  }
  return url.toString();
}

function stableReferenceId(resourceType: 'IMAGE' | 'WEB', canonicalUrl: string, remoteImageUrl?: string): string {
  const digest = crypto.createHash('sha256').update([PROVIDER, resourceType, canonicalUrl, remoteImageUrl || ''].join('\n')).digest('hex');
  return `webref-${digest.slice(0, 32)}`;
}

function positiveInteger(value: unknown): number | undefined {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : undefined;
}

function toReference(item: BaiduReference, input: ReferenceSearchInput, rank: number, retrievedAt: string): WebReferenceItem | null {
  if (typeof item.url !== 'string' || !item.url.trim()) return null;
  let sourceUrl: string;
  let canonicalUrl: string;
  try {
    sourceUrl = normalizeUrl(item.url, false);
    canonicalUrl = normalizeUrl(item.url, true);
  } catch {
    return null;
  }
  const resourceType = String(item.type || '').toLowerCase() === 'image' ? 'IMAGE' : 'WEB';
  let remoteImageUrl: string | undefined;
  if (typeof item.image?.url === 'string' && item.image.url.trim()) {
    try { remoteImageUrl = normalizeUrl(item.image.url, false); } catch { remoteImageUrl = undefined; }
  }
  if (resourceType === 'IMAGE' && !remoteImageUrl) return null;
  const publisherOrDomain = String(item.website || '').trim() || new URL(canonicalUrl).hostname;
  const reference: WebReferenceItem = {
    id: stableReferenceId(resourceType, canonicalUrl, remoteImageUrl),
    sessionId: input.sessionId,
    sourceType: 'WEB_REFERENCE',
    resourceType,
    sourceUrl,
    canonicalUrl,
    provider: PROVIDER,
    publisherOrDomain,
    queryId: input.queryId,
    matchedQueryIds: [input.queryId],
    resultRank: rank,
    tags: [],
    retrievedAt,
    createdAt: retrievedAt,
    ...(item.title?.trim() ? { title: item.title.trim() } : {}),
    ...(item.web_anchor?.trim() ? { attribution: item.web_anchor.trim() } : {}),
    ...(remoteImageUrl ? { remoteImageUrl, thumbnail: { url: remoteImageUrl } } : {}),
    ...(positiveInteger(item.image?.width) ? { imageWidth: positiveInteger(item.image?.width) } : {}),
    ...(positiveInteger(item.image?.height) ? { imageHeight: positiveInteger(item.image?.height) } : {}),
    licenseOrUsageStatus: 'UNKNOWN',
  };
  return reference;
}

export function createBaiduReferenceSearchGateway(options: {
  readCredential: () => string | Promise<string>;
  fetch?: FetchLike;
  endpoint?: string;
  timeoutMs?: number;
  maxRetries?: 0 | 1;
  now?: () => string;
}): ReferenceSearchGateway {
  const fetchImpl = options.fetch || globalThis.fetch;
  const endpoint = options.endpoint || DEFAULT_ENDPOINT;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxRetries = options.maxRetries ?? 1;
  const now = options.now || (() => new Date().toISOString());

  return {
    async search(input): Promise<SearchResultPage> {
      try { assertReferenceSearchInput(input); } catch (error) {
        throw creativeResearchSearchError('QUERY_INVALID', error instanceof Error ? error.message : '搜索查询无效', { cause: error });
      }
      if ([...input.query].length > 72) throw creativeResearchSearchError('QUERY_INVALID', '百度搜索查询不得超过 72 个字符');
      const credential = String(await options.readCredential() || '').trim();
      if (!credential) throw creativeResearchSearchError('SEARCH_CREDENTIAL_REQUIRED', '缺少百度搜索凭据');
      let providerCalls = 0;
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        providerCalls += 1;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let response: Response;
        try {
          response = await fetchImpl(endpoint, {
            method: 'POST',
            headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: input.query }],
              search_source: 'baidu_search_v2',
              resource_type_filter: {
                web: { top_k: Math.min(input.limit ?? 10, 50) },
                image: { top_k: Math.min(input.limit ?? 10, 30) },
              },
            }),
            signal: controller.signal,
          });
        } catch (error) {
          clearTimeout(timer);
          const timedOut = controller.signal.aborted || (error instanceof Error && error.name === 'AbortError');
          if (timedOut && attempt < maxRetries) continue;
          throw creativeResearchSearchError(timedOut ? 'TIMEOUT' : 'PROVIDER_FAILED', timedOut ? '百度搜索请求超时' : '百度搜索请求失败', { retryable: timedOut, cause: error });
        }
        clearTimeout(timer);
        const text = await response.text();
        let payload: any;
        try { payload = text ? JSON.parse(text) : {}; } catch (error) {
          throw creativeResearchSearchError('RESPONSE_INVALID', '百度搜索返回了无效 JSON', { cause: error });
        }
        if (response.status === 401 || response.status === 403 || payload?.code === 216003) {
          throw creativeResearchSearchError('AUTH_FAILED', '百度搜索凭据无效');
        }
        if (response.status === 429) throw creativeResearchSearchError('RATE_LIMITED', '百度搜索请求受到速率限制', { retryable: true });
        if (response.status >= 500 && attempt < maxRetries) continue;
        if (response.status === 501 || response.status === 502) {
          throw creativeResearchSearchError('TIMEOUT', `百度搜索请求超时（HTTP ${response.status}）`, { retryable: true });
        }
        if (!response.ok) throw creativeResearchSearchError('PROVIDER_FAILED', `百度搜索请求失败（HTTP ${response.status}）`, { retryable: response.status >= 500 });
        if (!Array.isArray(payload?.references)) throw creativeResearchSearchError('RESPONSE_INVALID', '百度搜索响应缺少 references 数组');
        const retrievedAt = now();
        const seen = new Set<string>();
        const items: WebReferenceItem[] = [];
        for (const [index, candidate] of payload.references.entries()) {
          const reference = toReference(candidate || {}, input, index + 1, retrievedAt);
          if (!reference) continue;
          const dedupeKey = reference.resourceType === 'IMAGE' ? reference.remoteImageUrl! : reference.canonicalUrl;
          if (seen.has(dedupeKey)) continue;
          if (input.exclusions?.domains?.includes(reference.publisherOrDomain)
            || input.exclusions?.urls?.includes(reference.sourceUrl)
            || input.exclusions?.referenceIds?.includes(reference.id)) continue;
          seen.add(dedupeKey);
          items.push(reference);
        }
        const page = { items, provider: PROVIDER, query: input.query, providerCalls } as SearchResultPage;
        assertSearchResultPage(page, { query: input.query });
        return page;
      }
      throw creativeResearchSearchError('PROVIDER_FAILED', '百度搜索请求失败');
    },
  };
}
