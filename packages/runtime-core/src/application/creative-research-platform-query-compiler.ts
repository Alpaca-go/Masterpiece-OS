import type { PlannedQuery, SearchQueryKind, VisualReferenceKeywordGroup, VisualReferencePlatform } from './creative-research/contracts.ts';
import { VISUAL_PLATFORM_DOMAINS } from './creative-research-visual-source-policy.ts';

const PLATFORM_SUFFIX: Record<VisualReferencePlatform, string> = {
  ZCOOL: '品牌设计',
  HUABAN: '视觉设计',
  PINTEREST: 'branding identity design',
};

function cleanKeyword(value: string): string {
  return String(value || '').replace(/site:\S+/giu, '').replace(/[，,。.!！?？；;：:、]/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, 36);
}

const PINTEREST_TRANSLATIONS: Array<[RegExp, string]> = [
  [/医美/u, 'medical aesthetics'], [/医学|医疗/u, 'healthcare'], [/诊所/u, 'clinic'],
  [/奢侈品|高端/u, 'luxury'], [/美术馆|博物馆/u, 'museum'], [/化妆品|美妆/u, 'cosmetics'],
  [/护肤/u, 'skincare'], [/包装/u, 'packaging'], [/餐饮/u, 'hospitality'], [/品牌/u, 'branding'],
];

function pinterestKeyword(value: string): string {
  if (!/[\u3400-\u9fff]/u.test(value)) return value;
  const translated = PINTEREST_TRANSLATIONS.filter(([pattern]) => pattern.test(value)).map(([, replacement]) => replacement);
  return [...new Set(translated)].join(' ') || value;
}

export function compilePlatformQueryText(group: VisualReferenceKeywordGroup, platform: VisualReferencePlatform): string {
  const keywords = group.keywords.map(cleanKeyword).filter(Boolean).slice(0, 2);
  const translated = platform === 'PINTEREST'
    ? [...new Set(keywords.map(pinterestKeyword))]
    : keywords;
  return `site:${VISUAL_PLATFORM_DOMAINS[platform]} ${[...translated, PLATFORM_SUFFIX[platform]].join(' ')}`.replace(/\s+/gu, ' ').trim();
}

export function lockQueryToPlatform(text: string, platform: VisualReferencePlatform): string {
  const unlocked = String(text || '').replace(/site:\S+/giu, '').replace(/\s+/gu, ' ').trim();
  return `site:${VISUAL_PLATFORM_DOMAINS[platform]} ${unlocked}`.trim();
}

export function compilePlatformQueries(input: {
  groups: VisualReferenceKeywordGroup[];
  trackIdsByGroup: Map<string, string>;
  createId(): string;
}): PlannedQuery[] {
  const platforms: VisualReferencePlatform[] = ['ZCOOL', 'HUABAN', 'PINTEREST'];
  const seen = new Set<string>();
  return input.groups.slice(0, 4).flatMap((group, groupIndex) => {
    const targets = input.groups.length === 4
      ? (groupIndex % 2 === 0 ? ['ZCOOL', 'PINTEREST'] : ['HUABAN', 'PINTEREST']) as VisualReferencePlatform[]
      : platforms;
    return targets.flatMap((platform) => {
      const text = compilePlatformQueryText(group, platform);
      const key = text.toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
      if (seen.has(key)) return [];
      seen.add(key);
      return [{
        id: input.createId(),
        trackId: input.trackIdsByGroup.get(group.id) || group.id,
        text,
        kind: (group.kind === 'INDUSTRY' ? 'CATEGORY' : 'CONCEPT') as SearchQueryKind,
        round: 'INITIAL' as const,
        rationale: group.rationale,
        intent: 'VISUAL' as const,
        locale: platform === 'PINTEREST' ? 'EN' as const : 'ZH' as const,
        groupId: group.id,
        platform,
      }];
    });
  });
}
