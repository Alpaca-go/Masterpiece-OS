import crypto from 'node:crypto';
import type {
  DeferredMediaTranslationV2,
  MediaTranslationPacketV2,
  PackagingTranslationV2,
  PromptSourceColorUsage,
  PromptSourceObject,
  SpatialColorBehaviorV2,
  SpatialLightingBehaviorV2,
  SpatialMaterialBehaviorV2,
  SpatialTranslationV2,
  VisualAbstractionV2,
  VisualDecisionPacket,
  VisualUnderstandingCore,
} from '../../../../packages/project-contracts/src/index.ts';

type UnknownRecord = Record<string, unknown>;

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

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as UnknownRecord)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stable(item)]),
  );
}

function colorUsages(value: unknown): PromptSourceColorUsage[] {
  return (Array.isArray(value) ? value : []).flatMap((item) => {
    const candidate = record(item);
    const name = text(candidate.name);
    const role = text(candidate.role);
    if (!name || !role) return [];
    const ratio = Number(candidate.ratio);
    return [{
      name,
      role,
      ...(Number.isFinite(ratio) && ratio >= 0 && ratio <= 100 ? { ratio } : {}),
    }];
  }).slice(0, 16);
}

function colorBehavior(value: unknown): SpatialColorBehaviorV2 {
  const candidate = record(value);
  return {
    primary: colorUsages(candidate.primary),
    secondary: colorUsages(candidate.secondary),
    accent: colorUsages(candidate.accent),
    forbidden: strings(candidate.forbidden),
  };
}

function materialBehavior(value: unknown): SpatialMaterialBehaviorV2[] {
  return (Array.isArray(value) ? value : []).flatMap((item) => {
    const candidate = record(item);
    const material = text(candidate.material);
    const behavior = strings(candidate.behavior);
    const brandRole = text(candidate.brandRole);
    if (!material || !behavior.length || !brandRole) return [];
    return [{
      material,
      behavior,
      brandRole,
      forbidden: strings(candidate.forbidden),
    }];
  }).slice(0, 24);
}

function lightingBehavior(value: unknown): SpatialLightingBehaviorV2 {
  const candidate = record(value);
  return {
    source: strings(candidate.source),
    contrast: text(candidate.contrast),
    interactionWithMaterials: strings(candidate.interactionWithMaterials),
    forbidden: strings(candidate.forbidden),
  };
}

function abstractions(value: unknown): VisualAbstractionV2[] {
  return (Array.isArray(value) ? value : []).flatMap((item) => {
    const candidate = record(item);
    const sourceAsset = text(candidate.sourceAsset);
    const semanticMeaning = strings(candidate.semanticMeaning);
    const formalProperties = strings(candidate.formalProperties);
    const rhythmProperties = strings(candidate.rhythmProperties);
    if (!sourceAsset || !semanticMeaning.length || !formalProperties.length || !rhythmProperties.length) return [];
    return [{
      sourceAsset,
      semanticMeaning,
      formalProperties,
      rhythmProperties,
      materialPotential: strings(candidate.materialPotential),
      lightingPotential: strings(candidate.lightingPotential),
      forbiddenLiteralUse: strings(candidate.forbiddenLiteralUse),
      evidenceRefs: strings(candidate.evidenceRefs),
      confidence: score(candidate.confidence),
    }];
  }).slice(0, 20);
}

function spatialTranslation(value: unknown): SpatialTranslationV2 {
  const candidate = record(value);
  const spatialConcept = text(candidate.spatialConcept);
  const structureLanguage = strings(candidate.structureLanguage);
  const materialLanguage = materialBehavior(candidate.materialLanguage);
  const lightingLanguage = lightingBehavior(candidate.lightingLanguage);
  const colors = colorBehavior(candidate.colorBehavior);
  const ready = Boolean(
    spatialConcept
    && structureLanguage.length
    && materialLanguage.length
    && lightingLanguage.source.length
    && strings(candidate.sceneProgram).length
    && [...colors.primary, ...colors.secondary, ...colors.accent].length,
  );
  return {
    status: ready ? 'ready' : 'insufficient',
    spatialConcept,
    brandRoleManifestation: strings(candidate.brandRoleManifestation),
    signatureSpatialMechanism: strings(candidate.signatureSpatialMechanism),
    functionalNetwork: strings(candidate.functionalNetwork),
    positiveDifferentiators: strings(candidate.positiveDifferentiators),
    mustBeVisible: strings(candidate.mustBeVisible),
    structureLanguage,
    materialLanguage,
    lightingLanguage,
    colorBehavior: colors,
    brandIntegration: strings(candidate.brandIntegration),
    functionalRelationships: strings(candidate.functionalRelationships),
    sceneProgram: strings(candidate.sceneProgram),
    peopleBehavior: strings(candidate.peopleBehavior),
    functionalExperience: strings(candidate.functionalExperience),
    sceneMisreadRisks: strings(candidate.sceneMisreadRisks),
  };
}

function deferred(value: unknown): DeferredMediaTranslationV2 {
  const candidate = record(value);
  return {
    status: 'interface_only',
    concept: text(candidate.concept),
    expressionLanguage: strings(candidate.expressionLanguage),
    misreadRisks: strings(candidate.misreadRisks),
  };
}

function packagingTranslation(value: unknown): PackagingTranslationV2 {
  const candidate = record(value);
  const structureStrategy = (Array.isArray(candidate.structureStrategy)
    ? candidate.structureStrategy : []).flatMap((item) => {
    const entry = record(item);
    const structure = text(entry.structure);
    if (!structure) return [];
    return [{
      structure,
      purpose: text(entry.purpose),
      locked: Boolean(entry.locked),
      evidenceRefs: strings(entry.evidenceRefs),
    }];
  });
  const graphicTranslation = (Array.isArray(candidate.graphicTranslation)
    ? candidate.graphicTranslation : []).flatMap((item) => {
    const entry = record(item);
    const sourceMeaning = text(entry.sourceMeaning);
    const packagingExpression = strings(entry.packagingExpression);
    return sourceMeaning && packagingExpression.length ? [{
      sourceMeaning,
      packagingExpression,
      forbiddenLiteralUse: strings(entry.forbiddenLiteralUse),
    }] : [];
  });
  const craftLanguage = (Array.isArray(candidate.craftLanguage)
    ? candidate.craftLanguage : []).flatMap((item) => {
    const entry = record(item);
    const craft = text(entry.craft);
    return craft ? [{
      craft,
      purpose: text(entry.purpose),
      forbiddenUse: strings(entry.forbiddenUse),
    }] : [];
  });
  const color = record(candidate.colorBehavior);
  const missingRequiredFields = strings(candidate.missingRequiredFields);
  if (!text(candidate.packagingConcept)) missingRequiredFields.push('packagingConcept');
  if (!strings(candidate.productAndCategoryRole).length) missingRequiredFields.push('productAndCategoryRole');
  if (!structureStrategy.length) missingRequiredFields.push('structureStrategy');
  if (!strings(candidate.openingExperience).length) missingRequiredFields.push('openingExperience');
  if (!strings(candidate.productArrangement).length) missingRequiredFields.push('productArrangement');
  if (!strings(candidate.informationHierarchy).length) missingRequiredFields.push('informationHierarchy');
  if (!strings(candidate.substrateLanguage).length) missingRequiredFields.push('substrateLanguage');
  if (!craftLanguage.length) missingRequiredFields.push('craftLanguage');
  if (!strings(candidate.photographyDirection).length) missingRequiredFields.push('photographyDirection');
  return {
    status: [...new Set(missingRequiredFields)].length ? 'insufficient' : 'ready',
    packagingConcept: text(candidate.packagingConcept),
    productAndCategoryRole: strings(candidate.productAndCategoryRole),
    structureStrategy,
    openingExperience: strings(candidate.openingExperience),
    productArrangement: strings(candidate.productArrangement),
    graphicTranslation,
    informationHierarchy: strings(candidate.informationHierarchy),
    substrateLanguage: strings(candidate.substrateLanguage),
    craftLanguage,
    colorBehavior: {
      base: strings(color.base),
      identity: strings(color.identity),
      accent: strings(color.accent),
      forbidden: strings(color.forbidden),
    },
    logoPolicy: strings(candidate.logoPolicy),
    seriesArchitecture: strings(candidate.seriesArchitecture),
    photographyDirection: strings(candidate.photographyDirection),
    packagingMisreadRisks: strings(candidate.packagingMisreadRisks),
    missingRequiredFields: [...new Set(missingRequiredFields)],
  };
}

function mediaTranslations(value: unknown): MediaTranslationPacketV2 {
  const candidate = record(value);
  return {
    sharedBrandCore: strings(candidate.sharedBrandCore),
    spatial: spatialTranslation(candidate.spatial),
    packaging: packagingTranslation(candidate.packaging),
    poster: deferred(candidate.poster),
    vi: deferred(candidate.vi),
  };
}

function missingExecutionFields(
  packet: Pick<VisualDecisionPacket, 'creativeDecision' | 'abstractions' | 'mediaTranslations'>,
): string[] {
  const missing: string[] = [];
  if (packet.creativeDecision.toneBoundaries.length < 2) {
    missing.push('creativeDecision.toneBoundaries');
  } else if (packet.creativeDecision.toneBoundaries.some((item) => !item.avoid.length)) {
    missing.push('creativeDecision.toneBoundaries.avoid');
  }
  if (!packet.abstractions.length) missing.push('abstractions');
  const spatial = packet.mediaTranslations.spatial;
  if (!spatial.spatialConcept) missing.push('mediaTranslations.spatial.spatialConcept');
  if (!spatial.structureLanguage.length) missing.push('mediaTranslations.spatial.structureLanguage');
  if (!spatial.materialLanguage.length) missing.push('mediaTranslations.spatial.materialLanguage');
  if (!spatial.lightingLanguage.source.length) missing.push('mediaTranslations.spatial.lightingLanguage');
  if (!spatial.sceneProgram.length) missing.push('mediaTranslations.spatial.sceneProgram');
  if (![...spatial.colorBehavior.primary, ...spatial.colorBehavior.secondary, ...spatial.colorBehavior.accent].length) {
    missing.push('mediaTranslations.spatial.colorBehavior');
  }
  return missing;
}

export function buildVisualDecisionPacket(input: {
  core: VisualUnderstandingCore;
  extracted?: unknown;
}): VisualDecisionPacket {
  const extracted = record(input.extracted);
  const normalizedAbstractions = abstractions(extracted.abstractions);
  const normalizedTranslations = mediaTranslations(extracted.mediaTranslations);
  const partial = {
    creativeDecision: input.core.creativeDecision,
    abstractions: normalizedAbstractions,
    mediaTranslations: normalizedTranslations,
  };
  const missing = missingExecutionFields(partial);
  const fingerprintValue = {
    core: input.core,
    abstractions: normalizedAbstractions,
    mediaTranslations: normalizedTranslations,
  };
  return {
    schemaVersion: '1.0',
    projectId: input.core.projectId,
    projectFacts: structuredClone(input.core.projectFacts),
    lockedAssets: structuredClone(input.core.lockedAssets),
    assetInventory: structuredClone(input.core.assetInventory),
    diagnosis: structuredClone(input.core.diagnosis),
    creativeDecision: structuredClone(input.core.creativeDecision),
    abstractions: normalizedAbstractions,
    mediaTranslations: normalizedTranslations,
    colorSystem: structuredClone(normalizedTranslations.spatial.colorBehavior),
    materialSystem: structuredClone(normalizedTranslations.spatial.materialLanguage),
    lightingSystem: structuredClone(normalizedTranslations.spatial.lightingLanguage),
    provenance: {
      ...structuredClone(input.core.provenance),
      sourceFingerprint: crypto.createHash('sha256').update(JSON.stringify(stable(fingerprintValue))).digest('hex'),
    },
    validation: {
      ...structuredClone(input.core.validation),
      executionDataStatus: missing.length ? 'insufficient' : 'ready',
      missingExecutionFields: missing,
    },
  };
}

export function validateVisualDecisionPacket(
  packet: VisualDecisionPacket,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (packet.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (!packet.projectId) errors.push('projectId is required');
  if (!packet.provenance.sourceFingerprint) errors.push('provenance.sourceFingerprint is required');
  if (!Array.isArray(packet.abstractions)) errors.push('abstractions must be an array');
  if (!packet.mediaTranslations?.spatial) errors.push('mediaTranslations.spatial is required');
  if (packet.validation.executionDataStatus === 'ready' && packet.validation.missingExecutionFields.length) {
    errors.push('ready packet cannot contain missingExecutionFields');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Transitional adapter for existing persisted vNext contexts. The compiler
 * switches to VisualDecisionPacket directly in the next phase; this adapter
 * keeps rollback compatibility without reading a human report.
 */
export function visualDecisionPacketToPromptSourceObject(
  packet: VisualDecisionPacket,
): PromptSourceObject {
  const spatial = packet.mediaTranslations.spatial;
  return {
    schemaVersion: '1.0',
    projectId: packet.projectId,
    generatedAt: packet.provenance.generatedAt,
    projectFacts: {
      brandName: packet.projectFacts.brandName.value,
      industry: packet.projectFacts.industry.value,
      brandRole: packet.projectFacts.brandRole.value === 'unknown' ? '' : packet.projectFacts.brandRole.value,
      businessModel: packet.projectFacts.businessModel?.value ?? null,
      primaryOfferings: [],
    },
    lockedAssets: {
      logoAssetIds: packet.lockedAssets.filter((item) => item.type === 'logo').map((item) => item.assetId),
      preferredLogoAssetId: packet.lockedAssets.find((item) => item.type === 'logo')?.assetId ?? null,
      // The v5 "logo locked" contract means any project that confirms a
      // logo must route image generation through `post_composite` (so the
      // model never draws the logo and a sharp-based post-compositor
      // paints the real one on top). The backend enforces this in
      // `vnext-service.ts` and raises `LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED`
      // for any other mode, so the default value emitted into the
      // prompt-source object must already be `post_composite` whenever a
      // logo is present — otherwise every fresh compile call from a
      // logo-locked project opens in an illegal state.
      logoUsageMode: packet.lockedAssets.some((item) => item.type === 'logo') ? 'post_composite' : 'blank_area',
      confirmedColors: packet.lockedAssets.filter((item) => item.type === 'color').map((item) => item.value),
      mustPreserve: packet.creativeDecision.preserveCore,
      immutableStructures: packet.lockedAssets
        .filter((item) => item.type === 'packaging_structure')
        .map((item) => item.value),
    },
    sourceVisualState: {
      valuableAssets: packet.diagnosis.valuableAssets.map((item) => item.observation),
      overusedElements: packet.diagnosis.overusedExpressions.map((item) => item.observation),
      outdatedExpressions: packet.diagnosis.outdatedExpressions.map((item) => item.observation),
      genericIndustryCliches: packet.diagnosis.categoryCliches.map((item) => item.observation),
      brandMisreadRisks: packet.diagnosis.brandMisreadRisks.map((item) => item.target),
    },
    upgradeTranslation: {
      preserve: packet.creativeDecision.preserveCore,
      weaken: packet.creativeDecision.upgradeFrom,
      remove: packet.creativeDecision.strategicNegatives,
      targetWorldview: packet.creativeDecision.targetWorldview,
      toneBoundaries: packet.creativeDecision.toneBoundaries,
      transformations: packet.abstractions.map((item) => ({
        sourceAsset: item.sourceAsset,
        abstractProperties: [
          ...item.semanticMeaning,
          ...item.formalProperties,
          ...item.rhythmProperties,
        ],
        newExpression: [
          ...item.materialPotential,
          ...item.lightingPotential,
          ...spatial.structureLanguage,
        ],
        forbiddenLiteralUse: item.forbiddenLiteralUse,
      })),
    },
    renderLanguage: {
      colorBehavior: structuredClone(spatial.colorBehavior),
      materialBehavior: structuredClone(spatial.materialLanguage),
      lightingBehavior: structuredClone(spatial.lightingLanguage),
      graphicBehavior: [...spatial.structureLanguage],
    },
    negativeRules: {
      // Task scoping cannot be represented by the legacy PromptSourceObject.
      // Keep project risks in the Packet instead of widening them here.
      project: [],
      model: ['随机中文', '错误英文品牌名', '自行生成 slogan', '模糊文字'],
    },
    confidence: {
      projectFacts: Math.min(
        packet.projectFacts.brandName.confidence,
        packet.projectFacts.industry.confidence,
        packet.projectFacts.brandRole.confidence,
      ),
      lockedAssets: packet.lockedAssets.length ? 1 : 0,
      sourceVisualState: Math.min(
        1,
        packet.diagnosis.valuableAssets.reduce((sum, item) => sum + item.confidence, 0)
          / Math.max(1, packet.diagnosis.valuableAssets.length),
      ),
      upgradeTranslation: packet.validation.executionDataStatus === 'ready' ? 1 : 0,
    },
    provenance: {
      sourceKinds: ['project_record', 'original_asset', 'structured_analysis'],
      sourceFingerprint: packet.provenance.sourceFingerprint,
    },
  };
}
