import path from 'node:path';
import type {
  LockedAsset,
  ReferenceStyleCapsule,
  StyleProfile,
  VisualMigrationCanonRuleDimension,
  VisualMigrationCanonRuleSource,
  VisualMigrationCanonSemanticRuleV1,
  VisualMigrationCanonV1,
  VisualMigrationReferencePackV1,
} from '@masterpiece/project-contracts/index.ts';
import { validateLockedAssetCollection } from '@masterpiece/creative-production-runtime/locked-assets.js';
import { validateStyleProfile } from '@masterpiece/creative-production-runtime/style-profile.js';
import {
  buildVisualMigrationCanonId,
  computeVisualMigrationCanonFingerprint,
  computeVisualMigrationCanonSourceFingerprint,
  validateVisualMigrationCanonV1,
  VISUAL_MIGRATION_CANON_SCHEMA,
} from './visual-migration-canon-contract.ts';
import {
  canonicalSerializeVisualMigrationValue,
  sha256Fingerprint,
  validateVisualMigrationReferencePackV1,
} from './visual-migration-reference-pack-contract.ts';

export interface VisualMigrationCanonProjectInput {
  id: string;
  brandName?: string;
  projectName?: string;
  industry?: string;
  logoLocked?: boolean;
  lockedFacts?: string[];
}

export interface BuildVisualMigrationCanonInput {
  projectId: string;
  referenceAnchorRunId: string;
  referencePack: VisualMigrationReferencePackV1;
  capsule: ReferenceStyleCapsule;
  styleProfile: StyleProfile;
  lockedAssets: LockedAsset[];
  project: VisualMigrationCanonProjectInput;
  now?: string;
}

type TransferKey = keyof VisualMigrationCanonV1['transferSystem'];
type RuleTransferKey = Exclude<TransferKey, 'goal'>;

const DIMENSION_BY_KEY: Record<RuleTransferKey, VisualMigrationCanonRuleDimension> = {
  color: 'color',
  layoutAndTypography: 'layout_typography',
  graphicLanguage: 'graphic_language',
  materialAndPhotography: 'material_photography',
  extensionMechanism: 'extension_mechanism',
};

function buildError(code: string, message: string, diagnostics: string[] = []): Error {
  return Object.assign(new Error(message), { code, diagnostics });
}

function clean(values: unknown): string[] {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value ?? '').trim())
    .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

function containsNormalized(haystack: string, needle: string): boolean {
  const target = normalized(needle);
  return Boolean(target) && normalized(haystack).includes(target);
}

function isConcreteStyleRule(statement: string): boolean {
  return !/^由\s+.+\s+校准$/u.test(statement.trim());
}

function rule(
  dimension: VisualMigrationCanonRuleDimension,
  statement: string,
  source: VisualMigrationCanonRuleSource,
  invariantLevel: VisualMigrationCanonSemanticRuleV1['invariantLevel'],
  variations: Pick<VisualMigrationCanonSemanticRuleV1, 'allowedVariation' | 'prohibitedVariation'> = {},
): VisualMigrationCanonSemanticRuleV1 {
  const digest = sha256Fingerprint(canonicalSerializeVisualMigrationValue({ dimension, source, statement }));
  return {
    id: `vmcr-${digest.slice('sha256:'.length, 'sha256:'.length + 16)}`,
    dimension,
    statement,
    source,
    invariantLevel,
    ...(variations.allowedVariation?.length ? { allowedVariation: clean(variations.allowedVariation) } : {}),
    ...(variations.prohibitedVariation?.length ? { prohibitedVariation: clean(variations.prohibitedVariation) } : {}),
  };
}

function assertRelativeLocator(value: string | undefined, field: string): void {
  if (!value) return;
  if (path.isAbsolute(value) || /^[a-z]:/iu.test(value) || value.includes('\\')
    || value.split('/').some((segment) => segment === '..' || segment === '.')) {
    throw buildError('VISUAL_MIGRATION_CANON_PATH_INVALID', `${field} 必须是项目内稳定相对 locator。`);
  }
}

function styleValues(profile: StyleProfile): Record<RuleTransferKey, string[]> {
  return {
    color: clean([
      ...profile.colorSystem.primary, ...profile.colorSystem.secondary,
      ...profile.colorSystem.neutral, ...profile.colorSystem.accent,
      ...profile.colorSystem.distributionRules,
    ]),
    layoutAndTypography: clean([
      ...profile.compositionSystem.hierarchy, profile.compositionSystem.density,
      profile.compositionSystem.negativeSpace, ...profile.compositionSystem.focalPointRules,
      ...profile.compositionSystem.cameraRules, ...profile.compositionSystem.croppingRules,
      ...profile.typographyCompatibility,
    ]),
    graphicLanguage: clean([
      ...profile.shapeLanguage.geometry, ...profile.shapeLanguage.silhouetteRules,
      ...profile.shapeLanguage.proportionRules, ...profile.graphicLanguage.coreMotifs,
      ...profile.graphicLanguage.patternRules, ...profile.graphicLanguage.lineRules,
      ...profile.graphicLanguage.illustrationRules, ...profile.graphicLanguage.layoutRhythm,
    ]),
    materialAndPhotography: clean([
      ...profile.materialAndTexture.materials, ...profile.materialAndTexture.surfaceRules,
      ...profile.materialAndTexture.printFeeling, ...profile.materialAndTexture.renderingRules,
      profile.lightingSystem.type, profile.lightingSystem.contrast,
      profile.lightingSystem.shadow, profile.lightingSystem.temperature,
    ]),
    extensionMechanism: clean(profile.allowedVariations),
  };
}

function capsuleValues(capsule: ReferenceStyleCapsule): Record<RuleTransferKey, string[]> {
  return {
    color: clean(capsule.inheritedStyle.color),
    layoutAndTypography: clean(capsule.inheritedStyle.layoutAndTypography),
    graphicLanguage: clean(capsule.inheritedStyle.graphicLanguage),
    materialAndPhotography: clean(capsule.inheritedStyle.materialAndPhotography),
    extensionMechanism: clean(capsule.inheritedStyle.extensionMechanism),
  };
}

function assertStyleConsistency(
  profile: StyleProfile,
  capsuleTransfer: Record<RuleTransferKey, string[]>,
): void {
  const diagnostics: string[] = [];
  const forbidden = clean([
    ...profile.forbiddenVariations,
    ...profile.colorSystem.forbiddenColors,
    ...profile.materialAndTexture.forbiddenTextures,
  ]).map(normalized);
  for (const [key, values] of Object.entries(capsuleTransfer)) {
    for (const approved of values) {
      if (forbidden.includes(normalized(approved))) diagnostics.push(`${key}: approved rule is forbidden by Style Profile "${approved}"`);
    }
  }
  if (diagnostics.length) {
    throw buildError('VISUAL_MIGRATION_CANON_STYLE_CONFLICT', 'Capsule 与 Style Profile 关键语义不一致。', diagnostics);
  }
}

function assertIdentityPrecedence(
  project: VisualMigrationCanonProjectInput,
  capsule: ReferenceStyleCapsule,
  lockedAssets: LockedAsset[],
  transfers: Record<RuleTransferKey, string[]>,
): void {
  const diagnostics: string[] = [];
  if (project.brandName && capsule.currentProject.brandName
    && normalized(project.brandName) !== normalized(capsule.currentProject.brandName)) {
    diagnostics.push(`brandName: project="${project.brandName}" capsule="${capsule.currentProject.brandName}"`);
  }
  const prohibitedIdentity = clean([
    ...capsule.prohibitedReferenceIdentity.brandNames,
    ...capsule.prohibitedReferenceIdentity.logos,
    ...capsule.prohibitedReferenceIdentity.slogans,
    ...capsule.prohibitedReferenceIdentity.signatureGraphics,
    ...capsule.prohibitedReferenceIdentity.proprietaryPatterns,
  ]);
  const lockedStatements = clean([
    ...(project.lockedFacts ?? []),
    ...lockedAssets.flatMap((asset) => [asset.rule, ...asset.forbiddenChanges]),
  ]).map(normalized);
  for (const [key, values] of Object.entries(transfers)) {
    for (const statement of values) {
      if (prohibitedIdentity.some((term) => containsNormalized(statement, term))) {
        diagnostics.push(`${key}: reference identity entered transfer rule "${statement}"`);
      }
      if (lockedStatements.includes(normalized(statement))) {
        diagnostics.push(`${key}: locked identity entered transferable rule "${statement}"`);
      }
    }
  }
  if (diagnostics.length) {
    throw buildError('VISUAL_MIGRATION_CANON_IDENTITY_CONFLICT', 'Locked Identity 与迁移规则冲突。', diagnostics);
  }
}

export function buildVisualMigrationCanon(input: BuildVisualMigrationCanonInput): VisualMigrationCanonV1 {
  const projectId = String(input.projectId ?? '').trim();
  if (!projectId) throw buildError('VISUAL_MIGRATION_CANON_PROJECT_REQUIRED', 'projectId 不能为空。');
  if (input.project.id !== projectId) {
    throw buildError('VISUAL_MIGRATION_CANON_IDENTITY_CONFLICT', 'Project Record 与 projectId 不匹配。');
  }
  const pack = validateVisualMigrationReferencePackV1(input.referencePack);
  if (pack.projectId !== projectId || pack.sourceReferenceAnchorRunId !== input.referenceAnchorRunId) {
    throw buildError('VISUAL_MIGRATION_CANON_REFERENCE_PACK_INVALID', 'Reference Pack 与项目或 Run 不匹配。');
  }
  const capsule = input.capsule;
  if (capsule.currentProjectId !== projectId || capsule.sourceRunId !== input.referenceAnchorRunId) {
    throw buildError('VISUAL_MIGRATION_CANON_CAPSULE_INVALID', 'Reference Style Capsule 与项目或 Run 不匹配。');
  }
  const styleProfile = validateStyleProfile(input.styleProfile) as StyleProfile;
  const creativeDecisionId = `creative-decision-quick-${input.referenceAnchorRunId}`;
  if (styleProfile.projectId !== projectId || styleProfile.source.creativeDecisionId !== creativeDecisionId) {
    throw buildError('VISUAL_MIGRATION_CANON_STYLE_PROFILE_INVALID', 'Style Profile 不是当前 Quick Extraction Run 的派生物。');
  }
  const lockedAssets = validateLockedAssetCollection(input.lockedAssets) as LockedAsset[];
  if (lockedAssets.some((asset) => asset.projectId !== projectId)) {
    throw buildError('VISUAL_MIGRATION_CANON_LOCKED_ASSET_INVALID', 'Locked Asset 与项目不匹配。');
  }
  for (const asset of lockedAssets) {
    assertRelativeLocator(asset.sourceFile, `lockedAsset.${asset.id}.sourceFile`);
    assertRelativeLocator(asset.thumbnail, `lockedAsset.${asset.id}.thumbnail`);
  }

  const capsuleFingerprint = sha256Fingerprint(canonicalSerializeVisualMigrationValue(capsule));
  if (pack.semanticEvidence?.capsuleFingerprint !== capsuleFingerprint
    || (pack.semanticEvidence?.creativeDecisionId && pack.semanticEvidence.creativeDecisionId !== creativeDecisionId)) {
    throw buildError('VISUAL_MIGRATION_CANON_CAPSULE_INVALID', 'Reference Pack semantic evidence 与当前 Capsule 不一致。');
  }
  const capsuleTransfer = capsuleValues(capsule);
  const derivedTransfer = styleValues(styleProfile);
  assertStyleConsistency(styleProfile, capsuleTransfer);
  assertIdentityPrecedence(input.project, capsule, lockedAssets, capsuleTransfer);
  if (Object.values(capsuleTransfer).every((items) => items.length === 0)) {
    throw buildError('VISUAL_MIGRATION_CANON_EMPTY_TRANSFER_SYSTEM', 'Approved Capsule 没有可迁移语义规则。');
  }

  const projectIdentityFingerprint = sha256Fingerprint(canonicalSerializeVisualMigrationValue({
    projectId,
    brandName: input.project.brandName || input.project.projectName || '',
    industry: input.project.industry || '',
    logoLocked: input.project.logoLocked !== false,
    lockedFacts: clean(input.project.lockedFacts),
  }));
  const lockedAssetFingerprint = sha256Fingerprint(canonicalSerializeVisualMigrationValue(
    [...lockedAssets].sort((a, b) => a.id.localeCompare(b.id)).map((asset) => ({
      id: asset.id,
      projectId: asset.projectId,
      type: asset.type,
      name: asset.name,
      sourceAssetId: asset.sourceAssetId,
      sourceFile: asset.sourceFile,
      rule: asset.rule,
      priority: asset.priority,
      allowedChanges: clean(asset.allowedChanges),
      forbiddenChanges: clean(asset.forbiddenChanges),
      evidence: asset.evidence,
    })),
  ));
  const styleProfileFingerprint = sha256Fingerprint(canonicalSerializeVisualMigrationValue(styleProfile));
  const sourceFingerprint = computeVisualMigrationCanonSourceFingerprint({
    projectId,
    projectIdentityFingerprint,
    lockedAssetFingerprint,
    referencePackSourceFingerprint: pack.sourceFingerprint,
    referencePackManifestFingerprint: pack.manifestFingerprint,
    capsuleFingerprint,
    ...(pack.semanticEvidence?.briefFingerprint ? { briefFingerprint: pack.semanticEvidence.briefFingerprint } : {}),
    styleProfileFingerprint,
    creativeDecisionId,
  });
  const now = input.now ?? new Date().toISOString();

  const identityRules = [
    ...clean(input.project.lockedFacts).map((statement) => rule('identity', statement, 'project_locked_fact', 'hard')),
    ...[...lockedAssets].sort((a, b) => a.id.localeCompare(b.id)).map((asset) => rule(
      'identity', asset.rule, 'locked_asset', 'hard', {
        allowedVariation: asset.allowedChanges,
        prohibitedVariation: asset.forbiddenChanges,
      },
    )),
  ];
  const transferSystem = {
    goal: String(capsule.anchorGoal ?? '').trim(),
    color: [] as VisualMigrationCanonSemanticRuleV1[],
    layoutAndTypography: [] as VisualMigrationCanonSemanticRuleV1[],
    graphicLanguage: [] as VisualMigrationCanonSemanticRuleV1[],
    materialAndPhotography: [] as VisualMigrationCanonSemanticRuleV1[],
    extensionMechanism: [] as VisualMigrationCanonSemanticRuleV1[],
  };
  for (const key of Object.keys(capsuleTransfer) as RuleTransferKey[]) {
    const dimension = DIMENSION_BY_KEY[key];
    const approved = new Set(capsuleTransfer[key].map(normalized));
    transferSystem[key].push(...capsuleTransfer[key].map((statement) =>
      rule(dimension, statement, 'reference_style_capsule', 'strong')));
    transferSystem[key].push(...derivedTransfer[key]
      .filter((statement) => isConcreteStyleRule(statement) && !approved.has(normalized(statement)))
      .map((statement) => rule(dimension, statement, 'style_profile', 'adaptive')));
  }

  const withoutFingerprint: VisualMigrationCanonV1 = {
    schemaVersion: VISUAL_MIGRATION_CANON_SCHEMA,
    canonId: buildVisualMigrationCanonId(projectId, sourceFingerprint),
    projectId,
    version: '1.0.0',
    status: 'valid',
    createdAt: now,
    updatedAt: now,
    sourceFingerprint,
    canonFingerprint: 'sha256:'.padEnd(71, '0'),
    source: {
      sourceReferenceAnchorRunId: input.referenceAnchorRunId,
      referencePackId: pack.referencePackId,
      referencePackSourceFingerprint: pack.sourceFingerprint,
      referencePackManifestFingerprint: pack.manifestFingerprint,
      referenceCount: pack.references.length,
      capsuleFingerprint,
      ...(pack.semanticEvidence?.briefFingerprint ? { briefFingerprint: pack.semanticEvidence.briefFingerprint } : {}),
      creativeDecisionId,
      styleProfileId: styleProfile.id,
      styleProfileFingerprint,
      lockedAssetFingerprint,
      projectIdentityFingerprint,
    },
    projectIdentity: {
      ...(input.project.brandName || input.project.projectName
        ? { brandName: input.project.brandName || input.project.projectName }
        : {}),
      lockedFacts: clean(input.project.lockedFacts),
      lockedAssetIds: lockedAssets.map((asset) => asset.id).sort(),
      requiredIdentityRules: identityRules,
    },
    transferSystem,
    prohibitedTransfer: {
      userAvoidance: clean(capsule.userAvoidance),
      referenceBrandNames: clean(capsule.prohibitedReferenceIdentity.brandNames),
      referenceLogos: clean(capsule.prohibitedReferenceIdentity.logos),
      referenceSlogans: clean(capsule.prohibitedReferenceIdentity.slogans),
      referenceSignatureGraphics: clean(capsule.prohibitedReferenceIdentity.signatureGraphics),
      referenceProprietaryPatterns: clean(capsule.prohibitedReferenceIdentity.proprietaryPatterns),
      prohibitedMutations: clean(lockedAssets.flatMap((asset) => asset.forbiddenChanges)),
    },
    evidence: {
      visualEvidence: {
        referencePackId: pack.referencePackId,
        manifestFingerprint: pack.manifestFingerprint,
        referenceIds: pack.references.map((reference) => reference.referenceId),
      },
      semanticEvidence: {
        capsuleFingerprint,
        styleProfileId: styleProfile.id,
        creativeDecisionId,
        lockedAssetIds: lockedAssets.map((asset) => asset.id).sort(),
      },
    },
    trace: {
      sourceReferenceAnchorRunId: input.referenceAnchorRunId,
      referencePackId: pack.referencePackId,
      sourceFingerprint,
      inputFingerprints: {
        projectIdentity: projectIdentityFingerprint,
        lockedAssets: lockedAssetFingerprint,
        referencePackSource: pack.sourceFingerprint,
        referencePackManifest: pack.manifestFingerprint,
        capsule: capsuleFingerprint,
        styleProfile: styleProfileFingerprint,
      },
    },
  };
  withoutFingerprint.canonFingerprint = computeVisualMigrationCanonFingerprint(withoutFingerprint);
  return validateVisualMigrationCanonV1(withoutFingerprint);
}
