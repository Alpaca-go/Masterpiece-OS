import test from 'node:test';
import assert from 'node:assert/strict';
import { applyVisualSourcePolicy, isAllowedVisualSource, visualPlatformForReference } from '@masterpiece/runtime-core/application/creative-research-visual-source-policy.ts';
import { compilePlatformQueries } from '@masterpiece/runtime-core/application/creative-research-platform-query-compiler.ts';
import type { VisualReferenceKeywordGroup, WebReferenceItem } from '@masterpiece/runtime-core/application/creative-research/contracts.ts';

const NOW = '2026-08-31T00:00:00.000Z';
function item(url: string, title = '品牌视觉设计案例', resourceType: 'IMAGE' | 'WEB' = 'IMAGE'): WebReferenceItem {
  return { id: url, sessionId: 's', sourceType: 'WEB_REFERENCE', resourceType, sourceUrl: url, canonicalUrl: url,
    remoteImageUrl: resourceType === 'IMAGE' ? 'https://img.example/reference.jpg' : undefined,
    imageWidth: 1200, imageHeight: 800, provider: 'baidu-search', publisherOrDomain: new URL(url).hostname,
    queryId: 'q', resultRank: 1, title, tags: [], retrievedAt: NOW, createdAt: NOW, searchIntent: 'VISUAL' };
}

test('source-locked policy accepts only ZCOOL, Huaban, and Pinterest including subdomains', () => {
  assert.equal(visualPlatformForReference(item('https://www.zcool.com.cn/work/1')), 'ZCOOL');
  assert.equal(visualPlatformForReference(item('https://huaban.com/pins/1')), 'HUABAN');
  assert.equal(visualPlatformForReference(item('https://uk.pinterest.com/pin/1')), 'PINTEREST');
  assert.equal(isAllowedVisualSource(item('https://news.example.com/article')), false);
  assert.equal(isAllowedVisualSource({ ...item('https://news.example.com/article'), publisherOrDomain: 'pinterest.com' }), false);
  const filtered = applyVisualSourcePolicy([
    item('https://www.zcool.com.cn/work/1'), item('https://huaban.com/pins/1'), item('https://pinterest.com/pin/1'),
    item('https://baijiahao.baidu.com/article'), item('https://www.sohu.com/news'),
  ]);
  assert.deepEqual(filtered.map((value) => value.platform), ['ZCOOL', 'HUABAN', 'PINTEREST']);
  assert.ok(filtered.every((value) => value.visualRole === 'IMAGE' && typeof value.qualityScore === 'number'));
});

test('platform compiler emits nine group-bound domain constrained visual queries', () => {
  const groups: VisualReferenceKeywordGroup[] = [
    { id: 'industry', kind: 'INDUSTRY', title: '行业属性', keywords: ['医美', '医学'], rationale: 'industry', priority: 1 },
    { id: 'positioning', kind: 'POSITIONING', title: '气质定位', keywords: ['奢侈品', '美术馆'], rationale: 'positioning', priority: 2 },
    { id: 'cross', kind: 'CROSS_CATEGORY', title: '跨类目补充', keywords: ['化妆品', '高端护肤'], rationale: 'cross', priority: 3 },
  ];
  let sequence = 0;
  const queries = compilePlatformQueries({ groups, trackIdsByGroup: new Map(groups.map((group) => [group.id, `track-${group.id}`])), createId: () => `q-${++sequence}` });
  assert.equal(queries.length, 9);
  assert.ok(queries.every((query) => query.intent === 'VISUAL' && query.groupId && query.platform));
  assert.ok(queries.filter((query) => query.platform === 'ZCOOL').every((query) => query.text.startsWith('site:zcool.com.cn ')));
  assert.ok(queries.filter((query) => query.platform === 'HUABAN').every((query) => query.text.startsWith('site:huaban.com ')));
  assert.ok(queries.filter((query) => query.platform === 'PINTEREST').every((query) => query.text.startsWith('site:pinterest.com ')));
});
