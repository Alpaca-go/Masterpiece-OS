import type { VisualReferencePlatform, VisualReferenceRole, WebReferenceItem } from './creative-research/contracts.ts';

export const VISUAL_PLATFORM_DOMAINS: Readonly<Record<VisualReferencePlatform, string>> = Object.freeze({
  ZCOOL: 'zcool.com.cn',
  HUABAN: 'huaban.com',
  PINTEREST: 'pinterest.com',
});

const DESIGN_SIGNAL = /(品牌|VI|视觉|设计|包装|海报|版式|图形|字体|摄影|作品集|branding|identity|case study|packaging|graphic|typography|portfolio|design)/iu;
const LOW_VALUE_SIGNAL = /(招聘|促销|商品详情|新闻|资讯|表格|截图|banner|recruit|sale|news)/iu;

function hostname(value: string | undefined): string {
  if (!value) return '';
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./u, ''); }
  catch { return String(value).trim().toLowerCase().replace(/^www\./u, '').split(/[/:]/u)[0] || ''; }
}

function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function visualPlatformForReference(reference: Pick<WebReferenceItem, 'canonicalUrl' | 'sourceUrl' | 'publisherOrDomain'>): VisualReferencePlatform | undefined {
  const hosts = [hostname(reference.canonicalUrl), hostname(reference.sourceUrl)].filter(Boolean);
  return (Object.entries(VISUAL_PLATFORM_DOMAINS) as Array<[VisualReferencePlatform, string]>)
    .find(([, domain]) => hosts.some((host) => matchesDomain(host, domain)))?.[0];
}

export function isAllowedVisualSource(reference: Pick<WebReferenceItem, 'canonicalUrl' | 'sourceUrl' | 'publisherOrDomain'>): boolean {
  return Boolean(visualPlatformForReference(reference));
}

export function visualReferenceRole(reference: WebReferenceItem): VisualReferenceRole | undefined {
  if (reference.resourceType === 'IMAGE') return 'IMAGE';
  return DESIGN_SIGNAL.test(`${reference.title || ''} ${reference.canonicalUrl}`) ? 'DESIGN_CASE_PAGE' : undefined;
}

export function scoreVisualReference(reference: WebReferenceItem): number {
  const text = `${reference.title || ''} ${reference.publisherOrDomain}`;
  const resolution = (reference.imageWidth || 0) * (reference.imageHeight || 0);
  return 40
    + (reference.resourceType === 'IMAGE' ? 20 : 8)
    + (DESIGN_SIGNAL.test(text) ? 20 : 0)
    + (resolution >= 240_000 ? 15 : resolution > 0 ? -20 : 0)
    + (reference.remoteImageUrl ? 5 : 0)
    - (LOW_VALUE_SIGNAL.test(text) ? 30 : 0);
}

export function applyVisualSourcePolicy(items: WebReferenceItem[]): WebReferenceItem[] {
  return items.flatMap((item) => {
    const platform = visualPlatformForReference(item);
    const role = visualReferenceRole(item);
    if (!platform || !role) return [];
    if (item.imageWidth && item.imageHeight && item.imageWidth * item.imageHeight < 240_000) return [];
    const qualityScore = scoreVisualReference(item);
    if (qualityScore < 35) return [];
    return [{ ...item, platform, visualRole: role, qualityScore, searchIntent: 'VISUAL' as const }];
  }).sort((left, right) => (right.qualityScore || 0) - (left.qualityScore || 0) || left.resultRank - right.resultRank)
    .map((item, index) => ({ ...item, resultRank: index + 1 }));
}
