import { createBaiduReferenceSearchGateway } from '@masterpiece/runtime-core/application/creative-research-reference-search-baidu.ts';

const confirmed = process.argv.includes('--confirm-live');
const credential = String(process.env.MASTERPIECE_REFERENCE_SEARCH_BAIDU_API_KEY || '').trim();

if (!confirmed || !credential) {
  console.log(JSON.stringify({
    status: 'NOT_RUN',
    reason: !confirmed ? 'requires --confirm-live' : 'MASTERPIECE_REFERENCE_SEARCH_BAIDU_API_KEY is missing',
    provider: 'baidu-search',
    query: '新中式餐饮品牌设计',
  }));
  process.exitCode = 2;
} else {
  const startedAt = Date.now();
  const gateway = createBaiduReferenceSearchGateway({ readCredential: () => credential });
  try {
    const result = await gateway.search({
      sessionId: 'manual-smoke', queryId: `manual-${startedAt}`,
      query: '新中式餐饮品牌设计', kind: 'CATEGORY', limit: 5,
    });
    console.log(JSON.stringify({
      status: 'COMPLETED', provider: result.provider, query: result.query,
      providerCalls: result.providerCalls, referenceCount: result.items.length,
      imageCount: result.items.filter((item) => item.resourceType === 'IMAGE').length,
      webCount: result.items.filter((item) => item.resourceType === 'WEB').length,
      durationMs: Date.now() - startedAt,
      retention: 'PROVENANCE_METADATA_ONLY',
    }));
  } catch (error) {
    console.error(JSON.stringify({
      status: 'FAILED', provider: 'baidu-search',
      code: error && typeof error === 'object' && 'code' in error ? error.code : 'UNKNOWN',
      durationMs: Date.now() - startedAt,
    }));
    process.exitCode = 1;
  }
}
