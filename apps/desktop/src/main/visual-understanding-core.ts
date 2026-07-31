import crypto from 'node:crypto';
import type {
  BrandMisreadRiskV2,
  CreativeDecisionV2,
  SourcedVisualFact,
  VisualAssetInventoryV2,
  VisualDecisionLockedAsset,
  VisualDiagnosisItemV2,
  VisualDiagnosisV2,
  VisualFactSource,
  VisualFactStatus,
  VisualInventoryAsset,
  VisualInventoryAssetKind,
  VisualUnderstandingCore,
} from '@masterpiece/project-contracts/index.ts';
import type { ProjectRecord } from '../shared/types.ts';

type UnknownRecord = Record<string, unknown>;

const INVENTORY_FIELDS: Array<[keyof VisualAssetInventoryV2, VisualInventoryAssetKind]> = [
  ['logoAssets', 'logo'],
  ['colorAssets', 'color'],
  ['typographyAssets', 'typography'],
  ['graphicMotifs', 'graphic_motif'],
  ['imageryAssets', 'imagery'],
  ['layoutPatterns', 'layout_pattern'],
  ['materialCues', 'material_cue'],
  ['packagingStructures', 'packaging_structure'],
  ['spatialCues', 'spatial_cue'],
  ['copyAssets', 'copy'],
];

const DIAGNOSIS_FIELDS: Array<keyof VisualDiagnosisV2> = [
  'valuableAssets',
  'overusedExpressions',
  'outdatedExpressions',
  'weakSystemAreas',
  'categoryCliches',
  'brandMisreadRisks',
  'crossMediaGaps',
];

function record(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ') : '';
}

function strings(value: unknown, limit = 40): string[] {
  const result: string[] = [];
  const visit = (candidate: unknown) => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    const normalized = text(candidate);
    if (normalized && !result.includes(normalized) && result.length < limit) result.push(normalized);
  };
  visit(value);
  return result;
}

function score(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
}

function source(value: unknown): VisualFactSource {
  const normalized = text(value) as VisualFactSource;
  return [
    'source_document',
    'visual_asset',
    'user_input',
    'file_metadata',
    'project_record',
    'model_inference',
  ].includes(normalized) ? normalized : 'model_inference';
}

function status(value: unknown, confidence: number): VisualFactStatus {
  const normalized = text(value) as VisualFactStatus;
  if (['confirmed', 'probable', 'unknown', 'conflict'].includes(normalized)) return normalized;
  if (confidence >= 0.85) return 'confirmed';
  if (confidence >= 0.6) return 'probable';
  return 'unknown';
}

function unknownFact(): SourcedVisualFact<string> {
  return {
    value: 'unknown',
    source: 'model_inference',
    evidenceRefs: [],
    confidence: 0,
    status: 'unknown',
  };
}

function normalizeFact(value: unknown): SourcedVisualFact<string> {
  const candidate = record(value);
  const confidence = score(candidate.confidence);
  const normalizedValue = text(candidate.value);
  return {
    value: normalizedValue || 'unknown',
    source: source(candidate.source),
    evidenceRefs: strings(candidate.evidenceRefs),
    confidence,
    status: normalizedValue ? status(candidate.status, confidence) : 'unknown',
  };
}

function authoritativeFact(
  value: string | undefined,
  confidence: number | undefined,
  evidenceRef: string,
): SourcedVisualFact<string> | null {
  const normalized = text(value);
  if (!normalized || /待确认|unknown|未知/iu.test(normalized)) return null;
  const normalizedConfidence = Math.max(0.8, score(confidence));
  return {
    value: normalized,
    source: 'project_record',
    evidenceRefs: [evidenceRef],
    confidence: normalizedConfidence,
    status: 'confirmed',
  };
}

function normalizeInventoryAsset(
  value: unknown,
  fallbackKind: VisualInventoryAssetKind,
  index: number,
): VisualInventoryAsset | null {
  const candidate = record(value);
  const name = text(candidate.name);
  if (!name) return null;
  const contextRole = text(candidate.contextRole);
  return {
    assetId: text(candidate.assetId)
      || `observed-${fallbackKind}-${crypto.createHash('sha1').update(`${name}:${index}`).digest('hex').slice(0, 12)}`,
    name,
    kind: fallbackKind,
    occurrenceRefs: strings(candidate.occurrenceRefs),
    frequency: Math.max(1, Math.round(Number(candidate.frequency) || 1)),
    visualFeatures: strings(candidate.visualFeatures),
    possibleBrandMeaning: strings(candidate.possibleBrandMeaning),
    isOriginalAsset: candidate.isOriginalAsset !== false,
    userConfirmed: candidate.userConfirmed === true,
    editable: typeof candidate.editable === 'boolean' ? candidate.editable : null,
    contextRole: [
      'brand_asset',
      'mockup_environment',
      'reference_case',
      'display_decoration',
      'unknown',
    ].includes(contextRole)
      ? contextRole as VisualInventoryAsset['contextRole']
      : 'unknown',
    confidence: score(candidate.confidence),
  };
}

function emptyInventory(): VisualAssetInventoryV2 {
  return {
    logoAssets: [],
    colorAssets: [],
    typographyAssets: [],
    graphicMotifs: [],
    imageryAssets: [],
    layoutPatterns: [],
    materialCues: [],
    packagingStructures: [],
    spatialCues: [],
    copyAssets: [],
  };
}

function normalizeInventory(value: unknown, project: ProjectRecord): VisualAssetInventoryV2 {
  const sourceInventory = record(value);
  const inventory = emptyInventory();
  for (const [field, kind] of INVENTORY_FIELDS) {
    inventory[field] = (Array.isArray(sourceInventory[field]) ? sourceInventory[field] : [])
      .flatMap((item, index) => normalizeInventoryAsset(item, kind, index) ?? []);
  }
  for (const asset of project.assets.filter((item) => item.status === 'ready')) {
    const isLogo = project.logoFiles.includes(asset.relativePath)
      || project.logoFiles.includes(asset.originalName)
      || /(?:^|[-_.\s])(logo|标志|标识)(?:[-_.\s]|$)/iu.test(asset.originalName);
    if (!isLogo) continue;
    if (inventory.logoAssets.some((item) => item.assetId === asset.id)) continue;
    inventory.logoAssets.push({
      assetId: asset.id,
      name: asset.originalName,
      kind: 'logo',
      occurrenceRefs: [`asset:${asset.id}`],
      frequency: 1,
      visualFeatures: [],
      possibleBrandMeaning: ['品牌身份识别'],
      isOriginalAsset: true,
      userConfirmed: project.logoLocked !== false,
      editable: null,
      contextRole: 'brand_asset',
      confidence: 1,
    });
  }
  return inventory;
}

function normalizeDiagnosisItem(value: unknown): VisualDiagnosisItemV2 | null {
  const candidate = record(value);
  const target = text(candidate.target);
  const observation = text(candidate.observation);
  const whyItMatters = text(candidate.whyItMatters);
  if (!target || !observation || !whyItMatters) return null;
  return {
    target,
    observation,
    whyItMatters,
    evidenceRefs: strings(candidate.evidenceRefs),
    confidence: score(candidate.confidence),
  };
}

function normalizeBrandMisreadRisk(value: unknown): BrandMisreadRiskV2 | null {
  const candidate = record(value);
  const base = normalizeDiagnosisItem(candidate);
  const code = text(candidate.code);
  const description = text(candidate.description) || base?.target || '';
  const appliesTo = record(candidate.appliesTo);
  const normalizedStatus = text(candidate.status);
  if (!base || !code || !description) return null;
  return {
    ...base,
    code,
    description,
    appliesTo: {
      taskFamilies: strings(appliesTo.taskFamilies),
      subtypes: strings(appliesTo.subtypes),
      scenes: strings(appliesTo.scenes),
    },
    status: normalizedStatus === 'confirmed' ? 'confirmed' : 'probable',
  };
}

function normalizeDiagnosis(value: unknown): VisualDiagnosisV2 {
  const candidate = record(value);
  const diagnosis = Object.fromEntries(DIAGNOSIS_FIELDS.map((field) => [field, []])) as unknown as VisualDiagnosisV2;
  for (const field of DIAGNOSIS_FIELDS) {
    diagnosis[field] = (Array.isArray(candidate[field]) ? candidate[field] : [])
      .flatMap((item) => field === 'brandMisreadRisks'
        ? normalizeBrandMisreadRisk(item) ?? []
        : normalizeDiagnosisItem(item) ?? []) as never;
  }
  return diagnosis;
}

function normalizeCreativeDecision(value: unknown): CreativeDecisionV2 {
  const candidate = record(value);
  return {
    brandRoleStatement: text(candidate.brandRoleStatement),
    upgradeFrom: strings(candidate.upgradeFrom),
    preserveCore: strings(candidate.preserveCore),
    upgradeTo: strings(candidate.upgradeTo),
    uniqueUpgradeThesis: text(candidate.uniqueUpgradeThesis),
    targetWorldview: strings(candidate.targetWorldview),
    toneBoundaries: (Array.isArray(candidate.toneBoundaries) ? candidate.toneBoundaries : [])
      .flatMap((item) => {
        const boundary = record(item);
        const target = text(boundary.target);
        return target ? [{ target, avoid: strings(boundary.avoid) }] : [];
      }),
    strategicNegatives: strings(candidate.strategicNegatives),
  };
}

function buildLocks(
  project: ProjectRecord,
  inventory: VisualAssetInventoryV2,
): VisualDecisionLockedAsset[] {
  const locks: VisualDecisionLockedAsset[] = [];
  const add = (lock: VisualDecisionLockedAsset) => {
    if (!locks.some((item) => item.type === lock.type && item.value === lock.value)) locks.push(lock);
  };
  const brandName = text(project.brandName);
  if (brandName) {
    add({
      assetId: `brand-name-${crypto.createHash('sha1').update(brandName).digest('hex').slice(0, 12)}`,
      type: 'brand_name',
      value: brandName,
      lockSource: 'source_fact',
      evidenceRefs: ['project_record:brandName'],
    });
  }
  if (project.logoLocked !== false) {
    for (const logo of inventory.logoAssets.filter((item) => item.contextRole === 'brand_asset')) {
      add({
        assetId: logo.assetId,
        type: 'logo',
        value: logo.name,
        lockSource: logo.userConfirmed ? 'user_confirmed' : 'source_fact',
        evidenceRefs: logo.occurrenceRefs,
      });
    }
  }
  for (const [index, fact] of project.lockedFacts.entries()) {
    const normalized = text(fact);
    if (!normalized) continue;
    add({
      assetId: `user-lock-${index + 1}`,
      type: /结构|盒型|包装/iu.test(normalized) ? 'packaging_structure' : 'other',
      value: normalized,
      lockSource: 'user_confirmed',
      evidenceRefs: [`project_record:lockedFacts[${index}]`],
    });
  }
  return locks;
}

function evaluateHardFacts(
  project: ProjectRecord,
  facts: VisualUnderstandingCore['projectFacts'],
  lockedAssets: VisualDecisionLockedAsset[],
): VisualUnderstandingCore['validation'] {
  const missingRequiredFacts: string[] = [];
  const conflicts: string[] = [];
  for (const [field, fact] of Object.entries({
    brandName: facts.brandName,
    industry: facts.industry,
    brandRole: facts.brandRole,
  })) {
    if (fact.status === 'conflict') conflicts.push(field);
    if (fact.status === 'unknown' || fact.value === 'unknown') missingRequiredFacts.push(field);
  }
  if (project.logoLocked !== false && !lockedAssets.some((item) => item.type === 'logo')) {
    missingRequiredFacts.push('logo');
  }
  const lowConfidence = Object.values(facts)
    .some((fact) => fact && fact.status === 'probable' && fact.confidence < 0.75);
  const hardFactStatus = conflicts.length || missingRequiredFacts.length
    ? 'block'
    : lowConfidence
      ? 'low_confidence'
      : 'pass';
  return {
    hardFactStatus,
    mode: hardFactStatus === 'pass' ? 'formal_upgrade' : 'exploration',
    missingRequiredFacts,
    conflicts,
    ...(hardFactStatus === 'pass'
      ? {}
      : { message: '行业与业务属性或关键品牌资产尚未确认。当前结果仅为视觉方向探索，不应作为正式品牌升级结论。' }),
  };
}

export function buildVisualUnderstandingCore(input: {
  project: ProjectRecord;
  extracted?: unknown;
  generatedAt?: string;
  modelId?: string;
  sourceRefs?: string[];
}): VisualUnderstandingCore {
  const extracted = record(input.extracted);
  const extractedFacts = record(extracted.projectFacts);
  const project = input.project;
  const brandName = authoritativeFact(
    project.brandName || project.projectName,
    project.factConfidence?.brandName,
    'project_record:brandName',
  ) ?? normalizeFact(extractedFacts.brandName) ?? unknownFact();
  const industry = authoritativeFact(
    project.industry,
    project.factConfidence?.industry,
    'project_record:industry',
  ) ?? normalizeFact(extractedFacts.industry) ?? unknownFact();
  const brandRole = normalizeFact(extractedFacts.brandRole);
  const assetInventory = normalizeInventory(extracted.assetInventory, project);
  const lockedAssets = buildLocks(project, assetInventory);
  const projectFacts = { brandName, industry, brandRole };
  return {
    schemaVersion: '1.0',
    projectId: project.id,
    projectFacts,
    lockedAssets,
    assetInventory,
    diagnosis: normalizeDiagnosis(extracted.diagnosis),
    creativeDecision: normalizeCreativeDecision(extracted.creativeDecision),
    provenance: {
      createdFrom: strings(input.sourceRefs, 100),
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      modelId: input.modelId ?? 'unknown',
    },
    validation: evaluateHardFacts(project, projectFacts, lockedAssets),
  };
}

export function validateVisualUnderstandingCore(
  value: VisualUnderstandingCore,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (value.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (!value.projectId) errors.push('projectId is required');
  for (const field of ['brandName', 'industry', 'brandRole'] as const) {
    const fact = value.projectFacts[field];
    if (!fact || !fact.value) errors.push(`projectFacts.${field}.value is required`);
    if (!Array.isArray(fact?.evidenceRefs)) errors.push(`projectFacts.${field}.evidenceRefs must be an array`);
  }
  for (const [field] of INVENTORY_FIELDS) {
    if (!Array.isArray(value.assetInventory[field])) errors.push(`assetInventory.${field} must be an array`);
  }
  for (const field of DIAGNOSIS_FIELDS) {
    if (!Array.isArray(value.diagnosis[field])) errors.push(`diagnosis.${field} must be an array`);
  }
  if (value.lockedAssets.some((item) => !['source_fact', 'user_confirmed'].includes(item.lockSource))) {
    errors.push('lockedAssets contains an unsupported lockSource');
  }
  return { valid: errors.length === 0, errors };
}
