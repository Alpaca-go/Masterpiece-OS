/**
 * Phase 4「三大功能轻量整合」Context Resolver（纯逻辑核心）。
 *
 * 职责（零 IO、零模型调用、完全确定性、不修改输入）：
 * - 以 Project Visual Context 为视觉事实主源（§4.1 / §4.3 永不静默覆盖的字段）
 * - Document Visual Context 只补充用户 / 价格 / 商业模式 / 服务 / 品牌气质 /
 *   视觉偏好 / 禁止方向（§4.2）
 * - 品牌名 / 行业 / Logo / Locked Assets / 核心产品 / 包装结构 出现冲突时
 *   生成 resolution=unresolved 的 ContextConflict，要求人工确认，禁止静默覆盖（§4.3 / §9）
 * - 用户 userOverrides 以 resolution=user_confirmed 覆盖（§15.1）
 *
 * 合并结果即 §3 ResolvedProjectContext；所有冲突进入 conflicts 数组，全部可追溯。
 */
import type {
  ContextConflict,
  DocumentVisualContext,
  ProjectVisualContext,
  ResolvedProjectContext
} from '../shared/types.ts';

export const RESOLVED_PROJECT_CONTEXT_SCHEMA_VERSION = '1.0';
export const RESOLVER_VERSION = '1.0';

/** §4.3 不能自动覆盖、冲突必须人工确认的字段（identity / locked / products / packaging）。 */
export const BLOCKING_CONFLICT_FIELDS = new Set<string>([
  'brandName',
  'industry',
  'logoLocked',
  'lockedFacts',
  'products',
  'packaging'
]);

export interface ResolveProjectContextInput {
  projectId: string;
  projectVisualContext?: ProjectVisualContext | null;
  documentVisualContext?: DocumentVisualContext | null;
  /** §9 用户冲突确认覆盖（resolution=user_confirmed）。 */
  userOverrides?: Record<string, unknown>;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x !== null && x !== undefined).map((x) => String(x));
}

function pickStringOrNull(target: unknown): string | null {
  if (typeof target === 'string') return target;
  return null;
}

/**
 * §5 确定性合并：视觉为主、文档补充、冲突可追溯、用户覆盖优先。
 * 不修改 input 的任何字段。
 */
export function resolveProjectContext(input: ResolveProjectContextInput): ResolvedProjectContext {
  const visual = input.projectVisualContext ?? null;
  const document = input.documentVisualContext ?? null;
  const overrides: Record<string, unknown> =
    input.userOverrides && typeof input.userOverrides === 'object' ? { ...input.userOverrides } : {};
  const conflicts: ContextConflict[] = [];

  // ── identity（§4.1 / §4.3 视觉绝对优先）──
  const vBrand = str(visual?.identity?.brandName);
  const dBrand = str(document?.brandName);
  const vIndustry = str(visual?.identity?.industry);
  const dIndustry = str(document?.industry);
  const vProjectName = str(visual?.identity?.projectName);

  if (dBrand && vBrand && dBrand !== vBrand) {
    conflicts.push({
      field: 'brandName',
      visualValue: vBrand,
      documentValue: dBrand,
      resolution: 'unresolved',
      note: '品牌名冲突，需人工确认；视觉分析优先，禁止静默覆盖'
    });
  }
  if (dIndustry && vIndustry && dIndustry !== vIndustry) {
    conflicts.push({
      field: 'industry',
      visualValue: vIndustry,
      documentValue: dIndustry,
      resolution: 'unresolved',
      note: '行业冲突，需人工确认；视觉分析优先，禁止静默覆盖'
    });
  }

  // ── lockedAssets（§4.3 视觉优先，文档 lockedFacts 差异必须人工确认）──
  const vLockedFacts = strArray(visual?.lockedAssets?.lockedFacts);
  const dLockedFacts = strArray(document?.lockedFacts);
  const lockedFactDiff = dLockedFacts.filter((fact) => !vLockedFacts.includes(fact));
  if (lockedFactDiff.length) {
    conflicts.push({
      field: 'lockedFacts',
      visualValue: vLockedFacts,
      documentValue: dLockedFacts,
      resolution: 'unresolved',
      note: '锁定事实冲突，需人工确认；视觉分析优先，禁止静默覆盖'
    });
  }

  // ── 核心产品（§4.3 视觉优先）──
  const vProducts = strArray(visual?.products?.coreProducts);
  const dProducts = strArray(document?.products);
  const productDiff = dProducts.filter((product) => !vProducts.includes(product));
  if (productDiff.length) {
    conflicts.push({
      field: 'products',
      visualValue: vProducts,
      documentValue: dProducts,
      resolution: 'unresolved',
      note: '核心产品冲突，需人工确认；视觉分析优先，禁止静默覆盖'
    });
  }

  // ── §4.2 文档可补充的字段（视觉无值时文档 wins，记录 document_wins 供追溯）──
  const services = strArray(document?.services);
  if (services.length) {
    conflicts.push({
      field: 'services',
      visualValue: [],
      documentValue: services,
      resolution: 'document_wins',
      note: '文档补充服务内容'
    });
  }
  const targetAudience = strArray(document?.targetAudience);
  if (targetAudience.length) {
    conflicts.push({
      field: 'targetAudience',
      visualValue: [],
      documentValue: targetAudience,
      resolution: 'document_wins',
      note: '文档补充目标用户'
    });
  }
  const pricePositioning = pickStringOrNull(document?.pricePositioning);
  if (pricePositioning) {
    conflicts.push({
      field: 'pricePositioning',
      visualValue: null,
      documentValue: pricePositioning,
      resolution: 'document_wins',
      note: '文档补充价格定位'
    });
  }
  const businessModel = pickStringOrNull(document?.businessModel);
  if (businessModel) {
    conflicts.push({
      field: 'businessModel',
      visualValue: null,
      documentValue: businessModel,
      resolution: 'document_wins',
      note: '文档补充商业模式'
    });
  }
  const brandPersonality = strArray(document?.brandPersonality);
  if (brandPersonality.length) {
    conflicts.push({
      field: 'brandPersonality',
      visualValue: [],
      documentValue: brandPersonality,
      resolution: 'document_wins',
      note: '文档补充品牌气质'
    });
  }
  const visualPreferences = strArray(document?.visualPreferences);
  if (visualPreferences.length) {
    conflicts.push({
      field: 'visualPreferences',
      visualValue: [],
      documentValue: visualPreferences,
      resolution: 'document_wins',
      note: '文档补充视觉偏好'
    });
  }
  const prohibitedDirections = strArray(document?.prohibitedDirections);
  if (prohibitedDirections.length) {
    conflicts.push({
      field: 'prohibitedDirections',
      visualValue: [],
      documentValue: prohibitedDirections,
      resolution: 'document_wins',
      note: '文档补充禁止方向'
    });
  }

  // ── 组装 ResolvedProjectContext（视觉为主，文档补充非阻断字段）──
  const resolved: ResolvedProjectContext = {
    schemaVersion: '1.0',
    projectId: str(input.projectId),
    generatedAt: new Date().toISOString(),
    identity: {
      projectName: vProjectName,
      brandName: vBrand,
      industry: vIndustry
    },
    lockedAssets: {
      logoLocked: Boolean(visual?.lockedAssets?.logoLocked),
      logoAssetIds: strArray(visual?.lockedAssets?.logoAssetIds),
      lockedFacts: vLockedFacts
    },
    products: vProducts,
    services,
    targetAudience,
    pricePositioning,
    businessModel,
    brandPersonality,
    visualPreferences,
    currentVisualSystem: {
      existingVisualAssets: strArray(visual?.currentVisualSystem?.existingVisualAssets),
      primaryColors: strArray(visual?.currentVisualSystem?.primaryColors),
      supportingColors: strArray(visual?.currentVisualSystem?.supportingColors),
      graphicAssets: strArray(visual?.currentVisualSystem?.graphicAssets),
      typographySignals: strArray(visual?.currentVisualSystem?.typographySignals),
      materialSignals: strArray(visual?.currentVisualSystem?.materialSignals),
      photographySignals: strArray(visual?.currentVisualSystem?.photographySignals)
    },
    packaging: {
      structures: strArray(visual?.packaging?.structures),
      status: (visual?.packaging?.status ?? 'unknown') as ResolvedProjectContext['packaging']['status'],
      evidenceSources: strArray(visual?.packaging?.evidenceSources)
    },
    businessTouchpoints: {
      packaging: strArray(visual?.businessTouchpoints?.packaging),
      viApplications: strArray(visual?.businessTouchpoints?.viApplications),
      spatial: strArray(visual?.businessTouchpoints?.spatial),
      digital: strArray(visual?.businessTouchpoints?.digital)
    },
    prohibitedDirections,
    uncertainties: strArray(visual?.uncertainties),
    conflicts,
    sourceVersions: {
      projectVisualContext: visual?.schemaVersion ?? undefined,
      documentVisualContext: document?.schemaVersion ?? undefined,
      resolverVersion: RESOLVER_VERSION
    },
    sourceFingerprint: {
      visualGeneratedAt: visual?.generatedAt ?? undefined,
      documentGeneratedAt: document?.generatedAt ?? undefined
    }
  };

  // ── 用户覆盖（§9 / §15.1 用户 Override 正确覆盖）──
  const overrideField = (field: string, value: unknown): void => {
    applyUserOverride(resolved, field, value);
    const existing = conflicts.find((conflict) => conflict.field === field);
    if (existing) {
      existing.resolution = 'user_confirmed';
      existing.note = '用户手动覆盖';
    } else {
      conflicts.push({
        field,
        visualValue: null,
        documentValue: null,
        resolution: 'user_confirmed',
        note: '用户手动覆盖'
      });
    }
  };

  for (const [field, value] of Object.entries(overrides)) {
    overrideField(field, value);
  }

  return resolved;
}

/**
 * §9 把用户确认值写入 ResolvedProjectContext 的对应字段（不修改入参之外的其他字段）。
 * 供 resolveProjectContext 与 applyConflictResolution 复用。
 */
export function applyUserOverride(resolved: ResolvedProjectContext, field: string, value: unknown): void {
  switch (field) {
    case 'brandName':
      resolved.identity.brandName = str(value);
      break;
    case 'industry':
      resolved.identity.industry = str(value);
      break;
    case 'projectName':
      resolved.identity.projectName = str(value);
      break;
    case 'logoLocked':
      resolved.lockedAssets.logoLocked = Boolean(value);
      break;
    case 'logoAssetIds':
      resolved.lockedAssets.logoAssetIds = strArray(value);
      break;
    case 'lockedFacts':
      resolved.lockedAssets.lockedFacts = strArray(value);
      break;
    case 'products':
      resolved.products = strArray(value);
      break;
    case 'services':
      resolved.services = strArray(value);
      break;
    case 'targetAudience':
      resolved.targetAudience = strArray(value);
      break;
    case 'pricePositioning':
      resolved.pricePositioning = pickStringOrNull(value);
      break;
    case 'businessModel':
      resolved.businessModel = pickStringOrNull(value);
      break;
    case 'brandPersonality':
      resolved.brandPersonality = strArray(value);
      break;
    case 'visualPreferences':
      resolved.visualPreferences = strArray(value);
      break;
    case 'prohibitedDirections':
      resolved.prohibitedDirections = strArray(value);
      break;
    default:
      return;
  }
}

/** §14 是否存在阻断性（unresolved）的 §4.3 身份 / Locked Asset 冲突。 */
export function hasBlockingConflict(resolved: ResolvedProjectContext): boolean {
  return resolved.conflicts.some(
    (conflict) => conflict.resolution === 'unresolved' && BLOCKING_CONFLICT_FIELDS.has(conflict.field)
  );
}
