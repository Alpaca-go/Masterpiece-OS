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

const FIELD_EVIDENCE_SCHEMA = Object.freeze(Object.fromEntries(
  FACTUAL_FIELDS.map((field) => [field, 'string[]; required when this field has content; values must be supplied evidence ids']),
));

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

function cleanEvidenceIds(value: unknown, cap: number): string[] {
  return cleanList(typeof value === 'string' ? [value] : value, cap);
}

function rawFieldEvidenceMap(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (!Array.isArray(value)) return {};
  const result: Record<string, unknown> = {};
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const entry = item as Record<string, unknown>;
    const field = cleanText(entry.field, 80);
    if (field) result[field] = entry.evidenceIds;
  }
  return result;
}

function promptEvidence(input: DocumentIntakeMaterial) {
  return input.evidence.map((item) => ({
    id: item.id,
    sourceDocumentId: item.sourceDocumentId,
    locator: item.locator,
    excerpt: item.excerpt,
  }));
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
  const evidence = promptEvidence(input);
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
          fieldEvidence: FIELD_EVIDENCE_SCHEMA,
          searchKeywordSuggestions: 'array <= 24 of {value, kind: CONCEPT|VISUAL|CATEGORY, rationale?, locale?}',
          warnings: 'string[]',
        },
        documents: input.documents || [],
        evidence,
        linkedProjectBrief: input.linkedProjectBrief || null,
        designerNotes: input.designerNotes,
        intakeWarnings: input.warnings || [],
        rules: [
          'fieldEvidence must be an object whose values are arrays, even when one evidence id is used.',
          'Every non-empty factual field must cite at least one supplied evidence id in fieldEvidence.',
          'evidenceIds must contain the union of all ids used by fieldEvidence.',
        ],
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
        evidence: promptEvidence(input),
        requiredFields: DESIGN_BRIEF_FIELDS,
        requiredFactualFieldEvidence: FACTUAL_FIELDS,
        fieldEvidenceSchema: FIELD_EVIDENCE_SCHEMA,
        repairRules: [
          'Preserve valid content from invalidOutput.',
          'For every non-empty factual field, add at least one supporting allowed evidence id to fieldEvidence.',
          'fieldEvidence values must be arrays; evidenceIds must contain their union.',
          'Do not cite an id unless its supplied excerpt supports the field.',
        ],
      }),
    },
  ];
}

export function normalizeDesignBriefDraft(
  raw: Record<string, unknown>,
  allowedEvidenceIds: readonly string[],
): DesignBriefDraftMaterial {
  const allowed = new Set(allowedEvidenceIds);
  const evidenceRefCap = Math.max(allowed.size, 256);
  const requiredText = (field: 'projectSummary' | 'designTask' | 'audience') => {
    const value = cleanText(raw[field]);
    if (!value) throw creativeResearchError('CREATIVE_RESEARCH_MODEL_OUTPUT_INVALID', `${field} 不能为空`);
    return value;
  };
  const submittedEvidenceIds = cleanEvidenceIds(raw.evidenceIds, evidenceRefCap);
  const evidenceIds = submittedEvidenceIds.filter((id) => allowed.has(id));
  if (submittedEvidenceIds.length > 0 && evidenceIds.length === 0) {
    throw creativeResearchError('CREATIVE_RESEARCH_MODEL_OUTPUT_INVALID', 'Design Brief 必须引用至少一条真实文档证据');
  }
  const rawFieldEvidence = rawFieldEvidenceMap(raw.fieldEvidence);
  const fieldEvidence: Partial<Record<DesignBriefField, string[]>> = {};
  for (const field of DESIGN_BRIEF_FIELDS) {
    const ids = cleanEvidenceIds(rawFieldEvidence[field], evidenceRefCap).filter((id) => allowed.has(id));
    if (ids.length) fieldEvidence[field] = ids;
  }
  for (const field of FACTUAL_FIELDS) {
    const value = raw[field];
    const hasContent = Array.isArray(value) ? value.length > 0 : Boolean(cleanText(value));
    if (hasContent && !fieldEvidence[field]?.length) {
      throw creativeResearchError('CREATIVE_RESEARCH_MODEL_OUTPUT_INVALID', `${field} 缺少文档证据引用`);
    }
  }
  const normalizedEvidenceIds = [...new Set([
    ...evidenceIds,
    ...Object.values(fieldEvidence).flatMap((ids) => ids || []),
  ])];
  if (!normalizedEvidenceIds.length) {
    throw creativeResearchError('CREATIVE_RESEARCH_MODEL_OUTPUT_INVALID', 'Design Brief 必须引用至少一条真实文档证据');
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
    evidenceIds: normalizedEvidenceIds,
    fieldEvidence,
    searchKeywordSuggestions: normalizedSuggestions,
    warnings: cleanList(raw.warnings, 24),
  };
}
