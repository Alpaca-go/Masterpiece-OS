import type {
  AudienceFact,
  CurrentProjectProfile,
  CurrentProjectVisualSources,
  FactSource,
  FactSourceType,
  FactStatus,
  ProjectTouchpointInventory
} from '../../shared/types.ts';
import type {
  ParseResult,
  RuntimeSchema,
  ValidationIssue
} from './validation-issues.ts';
import { invalidTypeIssue, throwForValidationIssues } from './validation-issues.ts';

export interface ProjectFactsModelOutput {
  brandName: string;
  industry: string;
  coreProducts: string[];
  targetAudience: string[];
  brandPositioning: string;
  pricePositioning?: string;
  usageScenarios: string[];
  businessTouchpoints: string[];
  packagingStructures: string[];
  visualSources: CurrentProjectVisualSources;
  touchpointInventory: ProjectTouchpointInventory;
  confirmedFacts: string[];
}

export interface SchemaFieldMetadata {
  path: string;
  required: boolean;
  allowEmpty: boolean;
  evidenceRequirement: 'required' | 'optional' | 'not_applicable';
  readinessRequirement: 'blocking' | 'recommended' | 'optional';
  repairExamples: unknown[];
}

export const PROJECT_FACTS_METADATA: SchemaFieldMetadata[] = [{
  path: 'targetAudience',
  required: false,
  allowEmpty: true,
  evidenceRequirement: 'optional',
  readinessRequirement: 'recommended',
  repairExamples: [[], ['大众用户'], ['家庭客群', '专业从业者']]
}];

const ARRAY_FIELDS = [
  'coreProducts',
  'targetAudience',
  'usageScenarios',
  'businessTouchpoints',
  'packagingStructures',
  'confirmedFacts'
] as const;
const VISUAL_SOURCE_FIELDS = [
  'productForms', 'cookingActions', 'sensorySignals',
  'consumptionActions', 'brandNameSemantics', 'spatialObjects'
] as const;
const TOUCHPOINT_FIELDS = [
  'primaryPackaging', 'secondaryPackaging', 'serviceMaterials',
  'viApplications', 'spatialTouchpoints', 'digitalTouchpoints'
] as const;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function validateStringArray(
  value: unknown,
  path: string,
  options: { allowEmpty: boolean; maxLength?: number }
): { value: string[]; issues: ValidationIssue[] } {
  if (!Array.isArray(value)) {
    return {
      value: [],
      issues: [invalidTypeIssue(path, value, `${path} 必须是字符串数组。`, options.allowEmpty ? [[], ['示例']] : [['示例']])]
    };
  }
  const issues: ValidationIssue[] = [];
  const result: string[] = [];
  if (value.length > 100) {
    issues.push({
      path,
      issueType: 'format_error',
      receivedValue: value.length,
      message: `${path} 最多允许 100 项。`,
      repairInstruction: '合并重复或近义条目，并将数组限制为最多 100 项。',
      severity: 'blocking'
    });
  }
  value.forEach((item, index) => {
    if (typeof item !== 'string') {
      issues.push(invalidTypeIssue(`${path}[${index}]`, item, `${path} 条目必须是字符串。`));
      return;
    }
    const normalized = item.trim();
    if (!normalized) {
      issues.push({
        path: `${path}[${index}]`,
        issueType: 'format_error',
        receivedValue: item,
        message: `${path} 条目不能为空字符串。`,
        repairInstruction: '删除空条目；证据不足时整个字段返回空数组。',
        severity: 'error'
      });
      return;
    }
    if (normalized.length > (options.maxLength || 200)) {
      issues.push({
        path: `${path}[${index}]`,
        issueType: 'format_error',
        receivedValue: item,
        message: `${path} 条目过长。`,
        repairInstruction: '压缩为简短、事实性的描述。',
        severity: 'error'
      });
      return;
    }
    result.push(normalized);
  });
  if (!options.allowEmpty && result.length === 0) {
    issues.push({
      path,
      issueType: 'missing_required',
      receivedValue: value,
      message: `${path} 是必要事实且不能为空。`,
      repairInstruction: '仅在视觉证据或项目元数据明确支持时填写；否则由上游补充必要事实。',
      severity: 'blocking'
    });
  }
  return { value: result, issues };
}

function parseProjectFacts(value: unknown): ParseResult<ProjectFactsModelOutput> {
  const source = record(value);
  const issues: ValidationIssue[] = [];
  const arrays: Record<typeof ARRAY_FIELDS[number], string[]> = {
    coreProducts: [],
    targetAudience: [],
    usageScenarios: [],
    businessTouchpoints: [],
    packagingStructures: [],
    confirmedFacts: []
  };
  ARRAY_FIELDS.forEach((field) => {
    const parsed = validateStringArray(
      source[field] ?? (field === 'targetAudience' ? [] : undefined),
      `projectFacts.${field}`,
      {
        allowEmpty: field !== 'coreProducts' && field !== 'businessTouchpoints',
        maxLength: field === 'targetAudience' ? 100 : 200
      }
    );
    issues.push(...parsed.issues);
    arrays[field] = parsed.value;
  });
  const visualSource = record(source.visualSources);
  const visualSourceValues: Record<typeof VISUAL_SOURCE_FIELDS[number], string[]> = {
    productForms: [],
    cookingActions: [],
    sensorySignals: [],
    consumptionActions: [],
    brandNameSemantics: [],
    spatialObjects: []
  };
  VISUAL_SOURCE_FIELDS.forEach((field) => {
    const parsed = validateStringArray(visualSource[field], `projectFacts.visualSources.${field}`, { allowEmpty: true });
    issues.push(...parsed.issues);
    visualSourceValues[field] = parsed.value;
  });
  const visualSources: CurrentProjectVisualSources = visualSourceValues;
  const touchpointSource = record(source.touchpointInventory);
  const touchpointValues: Record<typeof TOUCHPOINT_FIELDS[number], string[]> = {
    primaryPackaging: [],
    secondaryPackaging: [],
    serviceMaterials: [],
    viApplications: [],
    spatialTouchpoints: [],
    digitalTouchpoints: []
  };
  TOUCHPOINT_FIELDS.forEach((field) => {
    const parsed = validateStringArray(touchpointSource[field], `projectFacts.touchpointInventory.${field}`, { allowEmpty: true });
    issues.push(...parsed.issues);
    touchpointValues[field] = parsed.value;
  });
  const touchpointInventory: ProjectTouchpointInventory = touchpointValues;
  for (const field of ['brandName', 'industry', 'brandPositioning'] as const) {
    if (typeof source[field] !== 'string') {
      issues.push(invalidTypeIssue(`projectFacts.${field}`, source[field], `${field} 必须是字符串。`));
    }
  }
  const data: ProjectFactsModelOutput = {
    brandName: typeof source.brandName === 'string' ? source.brandName.trim() : '',
    industry: typeof source.industry === 'string' ? source.industry.trim() : '',
    coreProducts: arrays.coreProducts,
    targetAudience: arrays.targetAudience,
    brandPositioning: typeof source.brandPositioning === 'string' ? source.brandPositioning.trim() : '',
    pricePositioning: typeof source.pricePositioning === 'string' ? source.pricePositioning.trim() || undefined : undefined,
    usageScenarios: arrays.usageScenarios,
    businessTouchpoints: arrays.businessTouchpoints,
    packagingStructures: arrays.packagingStructures,
    visualSources,
    touchpointInventory,
    confirmedFacts: arrays.confirmedFacts
  };
  return { success: issues.every((issue) => issue.severity === 'warning'), data, issues };
}

export const ProjectFactsSchema: RuntimeSchema<ProjectFactsModelOutput> = {
  safeParse: parseProjectFacts,
  summary: 'projectFacts.targetAudience 为可空字符串数组；coreProducts、businessTouchpoints 为必要字符串数组；所有视觉来源与触点字段为字符串数组。'
};

export function parseProjectFactsModelOutput(value: unknown): ProjectFactsModelOutput {
  const parsed = ProjectFactsSchema.safeParse(value);
  throwForValidationIssues(parsed.issues);
  return parsed.data!;
}

const SOURCE_PRIORITY: Record<FactSourceType, number> = {
  human_confirmation: 6,
  locked_config: 5,
  user_input: 4,
  project_metadata: 3,
  document: 2,
  visual_asset: 1
};

export function resolveFact<T>(candidates: Array<{ value: T; source: FactSource }>): {
  value?: T;
  status: FactStatus;
  sources: FactSource[];
} {
  const sorted = [...candidates].sort((a, b) =>
    SOURCE_PRIORITY[b.source.type] - SOURCE_PRIORITY[a.source.type]);
  if (!sorted.length) return { status: 'unverified', sources: [] };
  return {
    value: sorted[0]!.value,
    status: sorted[0]!.source.type === 'visual_asset' ? 'inferred' : 'confirmed',
    sources: sorted.map((item) => item.source)
  };
}

export function buildAudienceFacts(labels: string[], sourceAssetIds: string[]): AudienceFact[] {
  return labels.map((label) => ({
    label,
    status: 'inferred',
    sources: sourceAssetIds.map((sourceId) => ({
      type: 'visual_asset' as const,
      sourceId,
      confidence: 0.65
    })),
    confidence: 0.65
  }));
}

export function compileProjectFactsPromptConstraints(): string {
  const audience = PROJECT_FACTS_METADATA.find((item) => item.path === 'targetAudience')!;
  return [
    `targetAudience：${audience.required ? '必填' : '可选'}字符串数组。`,
    `允许空数组：${audience.allowEmpty ? '是' : '否'}。`,
    '视觉证据不足时必须返回 []，不得为了通过门禁猜测目标人群。',
    `合法示例：${JSON.stringify(audience.repairExamples)}。`,
    `Readiness：${audience.readinessRequirement}，为空不阻断。`
  ].join('\n');
}

export function evaluateProjectFactsAnalysisReadiness(profile: CurrentProjectProfile): {
  parseReady: boolean;
  schemaReady: boolean;
  identityFactsReady: boolean;
  productOrServiceFactsReady: boolean;
  evidencePolicySatisfied: boolean;
  targetAudienceAvailable: boolean;
  status: 'ready' | 'needs_review' | 'blocked';
  blockingReasons: string[];
  warnings: string[];
} {
  const blockingReasons: string[] = [];
  if (!profile.brandName) blockingReasons.push('PROJECT_IDENTITY_FACTS_MISSING');
  if (!profile.coreProducts.length) blockingReasons.push('PROJECT_PRODUCT_OR_SERVICE_FACTS_MISSING');
  const targetAudienceAvailable = profile.targetAudience.length > 0;
  return {
    parseReady: true,
    schemaReady: true,
    identityFactsReady: Boolean(profile.brandName),
    productOrServiceFactsReady: profile.coreProducts.length > 0,
    evidencePolicySatisfied: true,
    targetAudienceAvailable,
    status: blockingReasons.length ? 'blocked' : 'ready',
    blockingReasons,
    warnings: targetAudienceAvailable ? [] : ['目标人群缺少可靠证据，已保留为空。']
  };
}
