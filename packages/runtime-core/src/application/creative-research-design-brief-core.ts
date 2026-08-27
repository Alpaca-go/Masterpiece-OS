import type {
  DesignBriefDraftMaterial,
  DocumentIntakeMaterial,
  LinkedProjectBrief,
} from './creative-research/adapter-contracts.ts';
import {
  DESIGN_BRIEF_FIELDS,
  SEARCH_KEYWORD_KINDS,
  type DesignBriefField,
  type SearchKeywordKind,
} from './creative-research/contracts.ts';
import { creativeResearchError } from './creative-research-errors.ts';

const CAPS = Object.freeze({
  scenarios: 8,
  coreMessages: 8,
  constraints: 16,
  conceptKeywords: 12,
  visualKeywords: 12,
  searchKeywordSuggestions: 24,
});

const FACTUAL_FIELDS: readonly DesignBriefField[] = [
  'projectSummary', 'designTask', 'audience', 'scenarios', 'coreMessages', 'constraints',
];

function cleanText(value: unknown, max = 1200): string {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim().slice(0, max) : '';
}

function cleanList(value: unknown, cap: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    const cleaned = cleanText(item, 240);
    const key = cleaned.toLocaleLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= cap) break;
  }
  return result;
}

export function parseCreativeResearchModelJson(text: string): Record<string, unknown> {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/iu)?.[1]?.trim();
  const candidate = fenced || trimmed.slice(trimmed.indexOf('{'), trimmed.lastIndexOf('}') + 1);
  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('root must be an object');
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw creativeResearchError(
      'CREATIVE_RESEARCH_MODEL_OUTPUT_INVALID',
      `Design Brief 模型输出不是有效 JSON：${(error as Error).message}`,
    );
  }
}

export function buildDesignBriefMessages(input: DocumentIntakeMaterial & {
  designerNotes: string[];
  linkedProjectBrief?: LinkedProjectBrief | null;
}): Array<{ role: 'system' | 'user'; content: string }> {
  const evidence = input.evidence.map((item) => ({
    id: item.id,
    sourceDocumentId: item.sourceDocumentId,
    locator: item.locator,
    excerpt: item.excerpt,
  }));
  return [
    {
      role: 'system',
      content: [
        '你是 Creative Research 的 Design Brief 结构化提取器。',
        '只依据输入证据和明确标注的设计师补充；不得补造项目事实。',
        '冲突信息必须写入 warnings，不得静默择一。只输出 JSON，不要 Markdown。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: '将真实文档压缩为可编辑、可追溯的 Design Brief 与检索词建议',
        outputSchema: {
          projectSummary: 'string', designTask: 'string', audience: 'string',
          scenarios: 'string[] <= 8', coreMessages: 'string[] <= 8', constraints: 'string[] <= 16',
          conceptKeywords: 'string[] <= 12', visualKeywords: 'string[] <= 12',
          evidenceIds: 'string[]; only supplied evidence ids',
          fieldEvidence: 'object mapping each factual field to supplied evidence ids',
          searchKeywordSuggestions: 'array <= 24 of {value, kind: CONCEPT|VISUAL|CATEGORY, rationale?, locale?}',
          warnings: 'string[]',
        },
        documents: input.documents || [],
        evidence,
        linkedProjectBrief: input.linkedProjectBrief || null,
        designerNotes: input.designerNotes,
        intakeWarnings: input.warnings || [],
      }),
    },
  ];
}

export function buildDesignBriefRepairMessages(
  invalidOutput: string,
  validationError: string,
  input: DocumentIntakeMaterial & { designerNotes: string[]; linkedProjectBrief?: LinkedProjectBrief | null },
): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    { role: 'system', content: '修复上一份 Design Brief JSON。只纠正结构和证据引用；不得新增事实。只输出 JSON。' },
    {
      role: 'user',
      content: JSON.stringify({
        validationError,
        invalidOutput: String(invalidOutput).slice(0, 30_000),
        allowedEvidenceIds: input.evidence.map((item) => item.id),
        requiredFields: DESIGN_BRIEF_FIELDS,
      }),
    },
  ];
}

export function normalizeDesignBriefDraft(
  raw: Record<string, unknown>,
  allowedEvidenceIds: readonly string[],
): DesignBriefDraftMaterial {
  const allowed = new Set(allowedEvidenceIds);
  const requiredText = (field: 'projectSummary' | 'designTask' | 'audience') => {
    const value = cleanText(raw[field]);
    if (!value) throw creativeResearchError('CREATIVE_RESEARCH_MODEL_OUTPUT_INVALID', `${field} 不能为空`);
    return value;
  };
  const evidenceIds = cleanList(raw.evidenceIds, allowed.size).filter((id) => allowed.has(id));
  if (!evidenceIds.length) {
    throw creativeResearchError('CREATIVE_RESEARCH_MODEL_OUTPUT_INVALID', 'Design Brief 必须引用至少一条真实文档证据');
  }
  const rawFieldEvidence = raw.fieldEvidence && typeof raw.fieldEvidence === 'object' && !Array.isArray(raw.fieldEvidence)
    ? raw.fieldEvidence as Record<string, unknown>
    : {};
  const fieldEvidence: Partial<Record<DesignBriefField, string[]>> = {};
  for (const field of DESIGN_BRIEF_FIELDS) {
    const ids = cleanList(rawFieldEvidence[field], allowed.size).filter((id) => allowed.has(id));
    if (ids.length) fieldEvidence[field] = ids;
  }
  for (const field of FACTUAL_FIELDS) {
    const value = raw[field];
    const hasContent = Array.isArray(value) ? value.length > 0 : Boolean(cleanText(value));
    if (hasContent && !fieldEvidence[field]?.length) {
      throw creativeResearchError('CREATIVE_RESEARCH_MODEL_OUTPUT_INVALID', `${field} 缺少文档证据引用`);
    }
  }
  const suggestions = Array.isArray(raw.searchKeywordSuggestions) ? raw.searchKeywordSuggestions : [];
  const normalizedSuggestions: NonNullable<DesignBriefDraftMaterial['searchKeywordSuggestions']> = [];
  const suggestionSeen = new Set<string>();
  for (const item of suggestions) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Record<string, unknown>;
    const value = cleanText(candidate.value, 120);
    const kind = cleanText(candidate.kind) as SearchKeywordKind;
    const key = `${kind}:${value.toLocaleLowerCase()}`;
    if (!value || !SEARCH_KEYWORD_KINDS.includes(kind) || suggestionSeen.has(key)) continue;
    suggestionSeen.add(key);
    normalizedSuggestions.push({
      value,
      kind,
      ...(cleanText(candidate.rationale, 240) ? { rationale: cleanText(candidate.rationale, 240) } : {}),
      ...(cleanText(candidate.locale, 20) ? { locale: cleanText(candidate.locale, 20) } : {}),
    });
    if (normalizedSuggestions.length >= CAPS.searchKeywordSuggestions) break;
  }
  const conceptKeywords = cleanList(raw.conceptKeywords, CAPS.conceptKeywords);
  const visualKeywords = cleanList(raw.visualKeywords, CAPS.visualKeywords);
  for (const [kind, values] of [['CONCEPT', conceptKeywords], ['VISUAL', visualKeywords]] as const) {
    for (const value of values) {
      const key = `${kind}:${value.toLocaleLowerCase()}`;
      if (!suggestionSeen.has(key) && normalizedSuggestions.length < CAPS.searchKeywordSuggestions) {
        suggestionSeen.add(key);
        normalizedSuggestions.push({ value, kind });
      }
    }
  }
  return {
    projectSummary: requiredText('projectSummary'),
    designTask: requiredText('designTask'),
    audience: requiredText('audience'),
    scenarios: cleanList(raw.scenarios, CAPS.scenarios),
    coreMessages: cleanList(raw.coreMessages, CAPS.coreMessages),
    constraints: cleanList(raw.constraints, CAPS.constraints),
    conceptKeywords,
    visualKeywords,
    evidenceIds,
    fieldEvidence,
    searchKeywordSuggestions: normalizedSuggestions,
    warnings: cleanList(raw.warnings, 24),
  };
}
