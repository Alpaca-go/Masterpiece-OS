import type {
  AssetSelectionProtocolResult,
  CurrentProjectAssetDecision,
  CurrentProjectAssetRole,
  CurrentProjectCorePack,
  CurrentProjectCorePackValidation,
  GenerationContextManifest,
  GenerationOutputType,
  ProjectAsset,
  ProjectRecord,
  ProjectRuntimeContext,
  ReferenceAssetDecision,
  ReferenceAssetRole,
  ReferenceMasterSet,
  ReferenceMasterSetValidation,
  ReferenceSignatureGraphic,
  RequestedGenerationTask,
  SignatureGraphicLeakValidation,
  StyleCarrier,
  TaskReferenceSubset,
  TaskScopedStyleCarrierSet,
  TaskStyleCarrierValidation,
  TaskSubsetValidation
} from '../../shared/types.ts';
import path from 'node:path';
import sharp from 'sharp';
import {
  buildGenericReferenceMasterSet,
  compileTaskScopedStyleCarriers,
  selectTaskReferences,
  validateSignatureGraphicLeak,
  validateTaskStyleCarriers,
  validateRequestedTaskCoverage
} from '../reference-first/index.ts';
import { parseCurrentProjectAssetDecisions } from '../model-schema/asset-authenticity.schema.ts';
import { parseReferenceAssetDecisions } from '../model-schema/reference-assets.schema.ts';
import {
  GENERATION_OUTPUT_TYPES,
  isEnumValue
} from '../model-schema/schema-values.ts';
import { StyleCarrierSchema } from '../model-schema/style-carriers.schema.ts';
import { TaskReferenceSelectionSchema } from '../model-schema/task-selection.schema.ts';
import { throwForValidationIssues } from '../model-schema/validation-issues.ts';

export { GENERATION_OUTPUT_TYPES } from '../model-schema/schema-values.ts';

export function isGenerationOutputType(value: unknown): value is GenerationOutputType {
  return isEnumValue(GENERATION_OUTPUT_TYPES, value);
}

function boundedConfidence(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : fallback;
}

function unique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values.filter(Boolean))];
}

function hammingDistance(first: string, second: string): number {
  if (first.length !== second.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) distance += 1;
  }
  return distance;
}

export function groupReferenceNearDuplicates(
  decisions: ReferenceAssetDecision[],
  perceptualHashes: Record<string, string>,
  threshold = 6
): ReferenceAssetDecision[] {
  const groups: Array<{ id: string; hash: string }> = [];
  return decisions.map((decision) => {
    const hash = perceptualHashes[decision.assetId];
    if (!hash) return decision;
    const matched = groups.find((group) => hammingDistance(group.hash, hash) <= threshold);
    const group = matched || {
      id: `visual-similarity-${String(groups.length + 1).padStart(3, '0')}`,
      hash
    };
    if (!matched) groups.push(group);
    return { ...decision, duplicationGroupId: decision.duplicationGroupId || group.id };
  });
}

export async function detectReferenceNearDuplicates(
  decisions: ReferenceAssetDecision[],
  assets: ProjectAsset[],
  projectInputRoot: string
): Promise<ReferenceAssetDecision[]> {
  const hashes: Record<string, string> = {};
  await Promise.all(assets.map(async (asset) => {
    try {
      const pixels = await sharp(path.join(projectInputRoot, asset.relativePath))
        .rotate()
        .resize(9, 8, { fit: 'fill' })
        .greyscale()
        .raw()
        .toBuffer();
      let hash = '';
      for (let row = 0; row < 8; row += 1) {
        for (let column = 0; column < 8; column += 1) {
          const left = pixels[row * 9 + column]!;
          const right = pixels[row * 9 + column + 1]!;
          hash += left > right ? '1' : '0';
        }
      }
      hashes[asset.id] = hash;
    } catch {
      // Unsupported or damaged images remain eligible; the model decision still applies.
    }
  }));
  return groupReferenceNearDuplicates(decisions, hashes);
}

export function createFallbackCurrentProjectDecisions(
  assets: ProjectAsset[]
): CurrentProjectAssetDecision[] {
  const firstByHash = new Map<string, string>();
  return assets.filter((asset) => asset.status !== 'deleted' && /^image\//iu.test(asset.mimeType)).map((asset) => {
    const duplicateOf = firstByHash.get(asset.sha256);
    if (!duplicateOf) firstByHash.set(asset.sha256, asset.id);
    const role: CurrentProjectAssetRole = duplicateOf ? 'duplicate' : 'uncertain';
    const uncertain = role === 'uncertain';
    return {
      assetId: asset.id,
      filename: asset.originalName,
      role,
      roles: [role],
      authenticity: 'unknown',
      keepInCorePack: false,
      includeInAnalysisEvidencePack: !['duplicate', 'irrelevant'].includes(role),
      includeInGenerationIdentityPack: false,
      canProveIdentity: false,
      canProveProductFact: false,
      canProveStructure: false,
      canInfluenceGenerationStyle: false,
      generationUsage: 'exclude',
      keepReason: duplicateOf
        ? `与 ${duplicateOf} 内容重复`
        : uncertain ? '缺少视觉模型判断，不能根据文件名推断角色或真实性' : '等待视觉证据',
      extractedFacts: [],
      lockedEvidence: [],
      containsLegacyStyle: false,
      legacyStyleShouldInfluenceOutput: false,
      confidence: uncertain ? 0.55 : 0.82,
      requiresHumanReview: uncertain
    };
  });
}

export function createFallbackReferenceDecisions(assets: ProjectAsset[]): ReferenceAssetDecision[] {
  const firstByHash = new Map<string, string>();
  return assets.filter((asset) => asset.status !== 'deleted' && /^image\//iu.test(asset.mimeType)).map((asset) => {
    const duplicateOf = firstByHash.get(asset.sha256);
    if (!duplicateOf) firstByHash.set(asset.sha256, asset.id);
    const role: ReferenceAssetRole = duplicateOf ? 'duplicate' : 'uncertain';
    return {
      assetId: asset.id,
      filename: asset.originalName,
      role,
      primaryRole: role,
      secondaryRoles: [],
      styleCarrierStrength: 'low',
      includeInMasterSet: false,
      eligibleOutputTypes: [],
      representedStyleCarriers: [],
      styleCarrierRules: [],
      duplicationGroupId: duplicateOf ? `sha256:${assets.find((item) => item.id === duplicateOf)?.sha256}` : undefined,
      confidence: duplicateOf ? 0.95 : 0.5,
      reason: duplicateOf ? `与 ${duplicateOf} 内容重复` : '缺少视觉模型判断，不能根据文件名推断参考角色',
      requiresHumanReview: !duplicateOf
    };
  });
}

export function normalizeCurrentProjectDecisions(
  raw: unknown,
  assets: ProjectAsset[],
  runtimeContext?: ProjectRuntimeContext
): CurrentProjectAssetDecision[] {
  const parsedRaw = parseCurrentProjectAssetDecisions(raw);
  const fallback = createFallbackCurrentProjectDecisions(assets);
  const byId = new Map(parsedRaw.map((item) => [item.assetId, item]));
  const userConfirmedRealAssets = new Set(runtimeContext?.userConfirmedRealAssets || []);
  const userLockedAssets = new Map(
    (runtimeContext?.userLockedAssets || []).map((item) => [item.assetId, item.reason])
  );
  return fallback.map((base) => {
    const item = byId.get(base.assetId);
    if (!item) return base;
    const role = item.role || base.role;
    const roles = unique(item.roles || [role]);
    const runtimeConfirmed = userConfirmedRealAssets.has(base.assetId);
    const runtimeLockedReason = userLockedAssets.get(base.assetId);
    const authenticity = runtimeLockedReason
      ? 'user_confirmed_locked'
      : runtimeConfirmed
        ? 'user_confirmed_real'
        : item.authenticity || 'unknown';
    const factual = ['brand_original', 'user_confirmed_real', 'user_confirmed_locked'].includes(authenticity);
    const excluded = roles.some((value) => [
      'duplicate',
      'irrelevant',
      'legacy_visual_only',
      'legacy_visual_style_only',
      'stock_mockup',
      'third_party_mockup',
      'reference_only'
    ].includes(value));
    const hasProvenUsage = Boolean(
      item.canProveIdentity || item.canProveProductFact || item.canProveStructure
      || roles.includes('locked_asset_evidence')
    );
    const includeInGenerationIdentityPack = factual && !excluded && hasProvenUsage
      && (Boolean(item.includeInGenerationIdentityPack) || (runtimeConfirmed && Boolean(item.keepInCorePack)));
    const generationUsage = item.generationUsage && item.generationUsage !== 'exclude'
      ? item.generationUsage
      : item.canProveIdentity
        ? 'identity'
        : item.canProveProductFact
          ? 'product_or_service'
          : item.canProveStructure
            ? 'structure_only'
            : runtimeLockedReason
              ? 'locked_asset'
              : 'exclude';
    return {
      ...base,
      ...item,
      filename: base.filename,
      role,
      roles,
      authenticity,
      keepInCorePack: !excluded && Boolean(item.keepInCorePack),
      includeInAnalysisEvidencePack: !['duplicate', 'irrelevant'].includes(role),
      includeInGenerationIdentityPack,
      generationUsage: includeInGenerationIdentityPack ? generationUsage : 'exclude',
      canProveIdentity: factual && item.canProveIdentity === true,
      canProveProductFact: factual && item.canProveProductFact === true,
      canProveStructure: factual && item.canProveStructure === true,
      canInfluenceGenerationStyle: false,
      extractedFacts: unique(item.extractedFacts || []),
      lockedEvidence: unique([
        ...(item.lockedEvidence || []),
        ...(runtimeLockedReason ? [runtimeLockedReason] : [])
      ]),
      legacyStyleShouldInfluenceOutput: false,
      confidence: boundedConfidence(item.confidence, base.confidence),
      requiresHumanReview: Boolean(item.requiresHumanReview) || boundedConfidence(item.confidence, 0) < 0.8
    };
  });
}

export function normalizeReferenceDecisions(
  raw: unknown,
  assets: ProjectAsset[]
): ReferenceAssetDecision[] {
  const parsedRaw = parseReferenceAssetDecisions(raw);
  const fallback = createFallbackReferenceDecisions(assets);
  const byId = new Map(parsedRaw.map((item) => [item.assetId, item]));
  return fallback.map((base) => {
    const item = byId.get(base.assetId);
    if (!item) return base;
    const role = item.role || base.role;
    const providedOutputTypes = item.eligibleOutputTypes;
    return {
      ...base,
      ...item,
      filename: base.filename,
      role,
      primaryRole: role,
      secondaryRoles: unique(item.secondaryRoles || base.secondaryRoles || []),
      includeInMasterSet: !['duplicate', 'irrelevant', 'uncertain', 'pure_text_slide', 'brand_strategy_text'].includes(role)
        && Boolean(item.includeInMasterSet),
      eligibleOutputTypes: unique(providedOutputTypes),
      representedStyleCarriers: unique(item.representedStyleCarriers || []),
      styleCarrierRules: (item.styleCarrierRules || []).filter((rule) => rule.readableRule?.trim()),
      confidence: boundedConfidence(item.confidence, base.confidence),
      requiresHumanReview: Boolean(item.requiresHumanReview) || boundedConfidence(item.confidence, 0) < 0.8
    };
  });
}

function emptyTouchpoints() {
  return {
    primaryPackaging: [],
    secondaryPackaging: [],
    serviceMaterials: [],
    viApplications: [],
    spatialTouchpoints: [],
    digitalTouchpoints: []
  };
}

export function buildCurrentProjectCorePack(
  project: ProjectRecord,
  decisions: CurrentProjectAssetDecision[]
): CurrentProjectCorePack {
  const kept = decisions.filter((item) => item.keepInCorePack && item.includeInGenerationIdentityPack);
  const roles = (...wanted: CurrentProjectAssetRole[]) => kept.filter((item) =>
    [item.role, ...(item.roles || [])].some((role) => wanted.includes(role))
  );
  const logoAssets = roles('logo_evidence');
  const logoTypography = roles('logo_typography_evidence');
  const structures = roles('confirmed_structure_evidence', 'packaging_structure_evidence', 'product_structure_evidence');
  return {
    projectId: project.id,
    brandName: project.brandName || project.detectedBrandName || '',
    industry: project.industry || project.detectedIndustry || '',
    productFacts: unique([
      ...roles('product_fact_evidence', 'service_fact_evidence').flatMap((item) => item.extractedFacts),
      ...(project.lockedFacts || [])
    ]),
    logoAssetIds: logoAssets.map((item) => item.assetId),
    logoTypographyAssetIds: logoTypography.map((item) => item.assetId),
    packagingStructures: structures.map((item) => ({
      assetId: item.assetId,
      description: item.extractedFacts.join('；') || item.keepReason,
      confidence: item.confidence
    })),
    productAssets: roles('product_fact_evidence', 'service_fact_evidence').map((item) => item.assetId),
    touchpoints: emptyTouchpoints(),
    confirmedBrandCopy: unique(roles('observed_copy', 'brand_copy_evidence')
      .filter((item) => item.generationUsage === 'locked_asset')
      .flatMap((item) => item.extractedFacts)),
    lockedAssets: unique([
      ...(project.logoLocked ? ['当前项目原始 Logo'] : []),
      ...(project.logoFiles || []),
      ...(project.lockedFacts || []),
      ...kept.flatMap((item) => item.lockedEvidence)
    ]).map((name) => ({
      name,
      assetIds: kept.filter((item) => item.lockedEvidence.includes(name)
        || ([item.role, ...(item.roles || [])].includes('logo_evidence') && /logo/iu.test(name))
        || (project.logoFiles || []).some((filename) =>
          filename === item.filename && filename === name
        )).map((item) => item.assetId),
      reason: '当前项目身份或用户锁定事实'
    })),
    excludedLegacyStyleAssetIds: decisions.filter((item) =>
      [item.role, ...(item.roles || [])].some((role) =>
        role === 'legacy_visual_only' || role === 'legacy_visual_style_only'
      )
    ).map((item) => item.assetId),
    uncertainAssetIds: decisions.filter((item) => item.role === 'uncertain').map((item) => item.assetId),
    sourceAssetIds: kept.map((item) => item.assetId),
    schemaVersion: 'current-project-core-pack-v1'
  };
}

export function validateCurrentProjectCorePack(
  pack: CurrentProjectCorePack,
  decisions: CurrentProjectAssetDecision[]
): CurrentProjectCorePackValidation {
  const source = new Set(pack.sourceAssetIds);
  const warnings: string[] = [];
  const hasLogoEvidence = pack.logoAssetIds.length > 0
    || decisions.some((item) =>
      item.includeInGenerationIdentityPack
      && [item.role, ...(item.roles || [])].includes('brand_identity_evidence')
    )
    || pack.lockedAssets.some((item) => /logo|标志|标识/iu.test(item.name));
  const hasLogoTypographyEvidence = pack.logoTypographyAssetIds.length > 0 || hasLogoEvidence;
  const hasProductFactEvidence = pack.productFacts.length > 0 || pack.productAssets.length > 0;
  const hasRequiredStructureEvidence = pack.packagingStructures.length > 0
    || Object.values(pack.touchpoints).some((items) => items.length > 0);
  if (!hasProductFactEvidence) warnings.push('核心资料包未识别到明确产品事实');
  if (!hasRequiredStructureEvidence) warnings.push('核心资料包未识别到明确结构或触点证据');
  if (pack.uncertainAssetIds.length) warnings.push(`${pack.uncertainAssetIds.length} 个当前项目资产需要人工确认`);
  const passed = Boolean(pack.brandName)
    && hasLogoEvidence
    && decisions.every((item) => item.role !== 'duplicate' || !source.has(item.assetId))
    && decisions.every((item) =>
      !['legacy_visual_only', 'legacy_visual_style_only'].includes(item.role) || !source.has(item.assetId)
    );
  return {
    hasBrandName: Boolean(pack.brandName),
    hasLogoEvidence,
    hasLogoTypographyEvidence,
    hasProductFactEvidence,
    hasRequiredStructureEvidence,
    hasLockedAssetEvidence: pack.lockedAssets.length > 0,
    excludesLegacyStyleOnlyAssets: decisions.every((item) =>
      !['legacy_visual_only', 'legacy_visual_style_only'].includes(item.role) || !source.has(item.assetId)
    ),
    excludesDuplicateAssets: decisions.every((item) => item.role !== 'duplicate' || !source.has(item.assetId)),
    noReferenceAssetsMixedIn: true,
    unresolvedUncertainAssets: pack.uncertainAssetIds,
    passed,
    warnings
  };
}

export function buildReferenceMasterSet(
  decisions: ReferenceAssetDecision[],
  signatureGraphics: ReferenceSignatureGraphic[] = []
): ReferenceMasterSet {
  const master = buildGenericReferenceMasterSet(decisions, signatureGraphics);
  const parsed = StyleCarrierSchema.safeParse(master.styleCarriers);
  throwForValidationIssues(parsed.issues);
  return master;
}

export function validateReferenceMasterSet(
  master: ReferenceMasterSet,
  allDecisions: ReferenceAssetDecision[]
): ReferenceMasterSetValidation {
  const roles = new Set(master.decisions.map((item) => item.role));
  const source = new Set(master.assetIds);
  const missingCoverageRoles: ReferenceAssetRole[] = [];
  const warnings: string[] = [];
  if (master.assetIds.length === 0) warnings.push('参考母集没有可用视觉证据');
  if (master.styleCarriers.length === 0) warnings.push('参考母集缺少具体、可读的 Style Carrier 规则');
  const groups = master.decisions.map((item) => item.duplicationGroupId).filter(Boolean);
  const excludesNearDuplicates = new Set(groups).size === groups.length;
  const passed = master.assetIds.length >= 1
    && master.styleCarriers.length > 0
    && allDecisions.every((item) => !['pure_text_slide', 'brand_strategy_text', 'duplicate', 'irrelevant', 'uncertain'].includes(item.role)
      || !source.has(item.assetId))
    && excludesNearDuplicates;
  return {
    hasSystemOverview: roles.has('system_overview') || master.assetIds.length <= 2,
    hasCrossTouchpointCoverage: new Set(master.decisions.flatMap((item) => item.eligibleOutputTypes)).size >= 2,
    hasPrimaryStyleCarrierEvidence: master.styleCarriers.some((item) => item.priority === 'primary') || master.assetIds.length === 1,
    hasPackagingEvidence: roles.has('packaging') || roles.has('packaging_detail'),
    hasPosterOrLayoutEvidence: roles.has('poster') || roles.has('display_layout'),
    hasMaterialOrDetailEvidence: roles.has('material_detail') || roles.has('packaging_detail'),
    excludesPureTextSlides: allDecisions.every((item) => item.role !== 'pure_text_slide' || !source.has(item.assetId)),
    excludesBusinessAnalysisPages: allDecisions.every((item) => item.role !== 'brand_strategy_text' || !source.has(item.assetId)),
    excludesNearDuplicates,
    missingCoverageRoles,
    passed,
    warnings
  };
}

export function buildTaskReferenceSubsets(master: ReferenceMasterSet): {
  subsets: TaskReferenceSubset[];
  validations: TaskSubsetValidation[];
} {
  const rawOutputTasks = unique(master.decisions.flatMap((item) => item.eligibleOutputTypes));
  const invalidOutputTasks = rawOutputTasks.filter((item) => !isGenerationOutputType(item));
  if (invalidOutputTasks.length) {
    throw Object.assign(
      new Error(`参考任务子集包含协议外的输出类型：${invalidOutputTasks.join('、')}`),
      {
        code: 'TASK_REFERENCE_SUBSET_MISMATCH',
        details: {
          invalidOutputTypes: invalidOutputTasks,
          allowedOutputTypes: GENERATION_OUTPUT_TYPES
        }
      }
    );
  }
  const outputTasks = rawOutputTasks.filter(isGenerationOutputType);
  const result = selectTaskReferences(master, outputTasks);
  const parsed = TaskReferenceSelectionSchema.safeParse(result.subsets);
  throwForValidationIssues(parsed.issues);
  return result;
}

export function assembleAssetSelectionProtocol(
  project: ProjectRecord,
  currentDecisions: CurrentProjectAssetDecision[],
  referenceDecisions: ReferenceAssetDecision[],
  options: {
    signatureGraphics?: ReferenceSignatureGraphic[];
    requestedTasks?: RequestedGenerationTask[];
  } = {}
): AssetSelectionProtocolResult {
  const signatureGraphics = options.signatureGraphics || [];
  const requestedTasks = options.requestedTasks || [];
  const currentProjectCorePack = buildCurrentProjectCorePack(project, currentDecisions);
  const currentCorePackValidation = validateCurrentProjectCorePack(currentProjectCorePack, currentDecisions);
  const referenceMasterSet = buildReferenceMasterSet(referenceDecisions, signatureGraphics);
  const referenceMasterSetValidation = validateReferenceMasterSet(referenceMasterSet, referenceDecisions);
  const { subsets, validations } = buildTaskReferenceSubsets(referenceMasterSet);
  const taskScopedStyleCarriers: TaskScopedStyleCarrierSet[] = unique(
    subsets.map((subset) => subset.outputType)
  ).map((outputType) => compileTaskScopedStyleCarriers(referenceMasterSet.styleCarriers, outputType));
  const taskStyleCarrierValidations: TaskStyleCarrierValidation[] = taskScopedStyleCarriers.map(validateTaskStyleCarriers);
  const signatureGraphicLeakValidation: SignatureGraphicLeakValidation = validateSignatureGraphicLeak({
    signatures: signatureGraphics,
    carriers: referenceMasterSet.styleCarriers
  });
  const requestedCoverageIssues = validateRequestedTaskCoverage(
    { tasks: requestedTasks },
    { subsets }
  );
  const taskScopedStyleCarrierIds = [
    ...new Set(taskScopedStyleCarriers.flatMap((set) => set.requiredPrimary.map((item) => item.id)))
  ];
  const generationContextManifest: GenerationContextManifest | undefined = requestedTasks[0]
    ? {
        jobId: project.id,
        outputType: requestedTasks[0]!.outputType,
        identityPackArtifactId: 'generation-identity-pack',
        generationBriefArtifactId: 'generation-brief',
        taskReferenceSubsetArtifactId: `task-reference-subsets/${requestedTasks[0]!.outputType}`,
        systemAnchorId: 'system-anchor',
        structurePolicyId: 'structure-policy',
        taskScopedStyleCarrierIds,
        validationStatus: requestedCoverageIssues.length ? 'blocked' : 'ready'
      }
    : undefined;
  const requiresHumanConfirmation = [
      ...currentDecisions.map((item) => item.confidence),
      ...referenceDecisions.map((item) => item.confidence)
    ].some((confidence) => confidence < 0.8)
      || currentDecisions.some((item) => item.requiresHumanReview)
      || referenceDecisions.some((item) => item.requiresHumanReview)
      || requestedCoverageIssues.length > 0
      || taskStyleCarrierValidations.some((item) => !item.passed)
      || !signatureGraphicLeakValidation.passed;
  return {
    currentProjectAssetDecisions: currentDecisions,
    currentProjectCorePack,
    currentCorePackValidation,
    referenceAssetDecisions: referenceDecisions,
    referenceMasterSet,
    referenceMasterSetValidation,
    taskReferenceSubsets: subsets,
    taskSubsetValidations: validations,
    requiresHumanConfirmation,
    schemaVersion: 'asset-selection-protocol-v1',
    signatureGraphicLeakValidation,
    taskStyleCarrierValidations,
    generationContextManifest,
    requestedTasks
  };
}

export function assertAssetSelectionProtocol(protocol: AssetSelectionProtocolResult): void {
  if (!protocol.currentCorePackValidation.passed) {
    assertCurrentProjectCorePack(protocol.currentCorePackValidation);
  }
  if (!protocol.referenceMasterSetValidation.passed) {
    throw Object.assign(new Error('参考母集不足：没有可用于风格分析的有效视觉证据'), {
      code: 'REFERENCE_MASTER_SET_INSUFFICIENT'
    });
  }
}

export function assertCurrentProjectCorePack(validation: CurrentProjectCorePackValidation): void {
  if (validation.passed) return;
  const uncontaminated = validation.excludesLegacyStyleOnlyAssets && validation.excludesDuplicateAssets;
  const missing: string[] = [];
  if (!validation.hasBrandName) missing.push('品牌名称');
  if (!validation.hasLogoEvidence) missing.push('可绑定的 Logo 或品牌身份资产');
  const message = uncontaminated
    ? `当前项目身份资料不足：缺少${missing.join('、') || '必要身份事实'}。素材筛选诊断已保存，可补充或确认真实身份资产后重试。`
    : '当前项目核心资料包混入旧视觉样式或重复素材。素材筛选诊断已保存，请清理后重试。';
  throw Object.assign(new Error(message), {
    code: uncontaminated ? 'CURRENT_CORE_PACK_INCOMPLETE' : 'CURRENT_CORE_PACK_CONTAMINATED',
    details: validation
  });
}
