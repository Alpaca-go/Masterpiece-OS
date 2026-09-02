import type {
  LockedAsset,
  ReferenceStyleCapsule,
  StyleProfile,
  VisualMigrationReferencePackV1,
  VisualMigrationReferenceTaskV1,
} from '@masterpiece/project-contracts/index.ts';
import { buildVisualMigrationCanon } from '@masterpiece/runtime-core/application/visual-migration-canon-builder.ts';
import {
  canonicalSerializeVisualMigrationValue,
  computeVisualMigrationManifestFingerprint,
  sha256Fingerprint,
} from '@masterpiece/runtime-core/application/visual-migration-reference-pack-contract.ts';

export const PROJECT_ID = 'project-1';

export function referenceTask(overrides: Partial<VisualMigrationReferenceTaskV1> = {}): VisualMigrationReferenceTaskV1 {
  return {
    schemaVersion: 'visual-migration-reference-task/v1',
    projectId: PROJECT_ID,
    taskKind: 'brand_hero',
    preset: 'visual_transfer',
    identityEvidence: 'required_if_available',
    structureEvidence: 'not_required',
    explicitStructureCandidateIds: [],
    taskReferenceIds: [],
    ...overrides,
  };
}

export function policyFixture() {
  const capsule: ReferenceStyleCapsule = {
    schemaVersion: '1.0', sourceRunId: 'run-1', currentProjectId: PROJECT_ID,
    generatedAt: '2026-09-02T00:00:00.000Z',
    currentProject: {
      brandName: '当前品牌', industry: '零售', logoLocked: true, logoAssetIds: ['logo-source'],
      lockedFacts: ['Logo 必须原样保留'], coreProducts: ['产品'], businessTouchpoints: ['包装'],
    },
    projectFacts: {
      coreProducts: ['产品'], services: [],
      touchpoints: { packaging: ['包装'], viApplications: [], serviceMaterials: [], spatial: [], digital: [] },
      designAdvice: [], uncertainties: [],
    },
    inheritedStyle: {
      color: ['低饱和暖色'], layoutAndTypography: ['大留白层级'], graphicLanguage: ['克制线条'],
      materialAndPhotography: ['真实纸张'], extensionMechanism: ['单一焦点延展'],
    },
    userPreference: null, userAvoidance: ['不要多格拼贴'],
    prohibitedReferenceIdentity: {
      brandNames: ['参考品牌'], logos: ['参考 Logo'], slogans: ['参考口号'],
      signatureGraphics: ['参考超级图形'], proprietaryPatterns: ['参考专属纹样'],
    },
    anchorGoal: '迁移视觉语言并保留当前品牌身份', aspectRatio: '1:1', humanNotes: [], uncertainties: [],
  };
  const styleProfile: StyleProfile = {
    schemaVersion: '6.0', id: 'style-1', projectId: PROJECT_ID, name: '迁移风格', version: '1.0.0', status: 'draft',
    styleEssence: { summary: '迁移视觉语言', keywords: ['克制'], mood: [], visualPositioning: '保留身份并迁移机制' },
    colorSystem: { primary: ['低饱和暖色'], secondary: [], neutral: [], accent: [], distributionRules: ['暖色主导'], forbiddenColors: [] },
    shapeLanguage: { geometry: [], silhouetteRules: [], proportionRules: [] },
    graphicLanguage: { coreMotifs: ['克制线条'], patternRules: [], lineRules: [], illustrationRules: [], layoutRhythm: [] },
    compositionSystem: { hierarchy: ['大留白层级'], density: '低密度', negativeSpace: '大面积留白', focalPointRules: ['单一焦点延展'], cameraRules: [], croppingRules: [] },
    materialAndTexture: { materials: ['真实纸张'], surfaceRules: [], printFeeling: [], renderingRules: [], forbiddenTextures: [] },
    lightingSystem: { type: '', contrast: '', shadow: '', temperature: '' },
    typographyCompatibility: ['大留白层级'],
    allowedVariations: ['低饱和暖色', '大留白层级', '克制线条', '真实纸张', '单一焦点延展'], forbiddenVariations: [],
    promptComponents: { required: ['迁移视觉语言'], positive: ['克制'], negative: [] },
    source: { creativeDecisionId: 'creative-decision-quick-run-1', creativeDecisionVersion: '1.0.0', compilerVersion: '1.0.0' },
    createdAt: '2026-09-02T00:00:00.000Z', updatedAt: '2026-09-02T00:00:00.000Z',
  };
  const lockedAsset: LockedAsset = {
    schemaVersion: '6.0', id: 'lock-logo', projectId: PROJECT_ID, type: 'logo', name: '当前品牌 Logo',
    sourceAssetId: 'logo-source', sourceFile: 'assets/logo.png', rule: 'Logo 必须原样保留', priority: 'critical',
    allowedChanges: ['允许等比缩放'], forbiddenChanges: ['不得重绘 Logo'],
    evidence: { source: 'project_visual_context', description: '项目已锁定 Logo' },
    createdAt: '2026-09-02T00:00:00.000Z', updatedAt: '2026-09-02T00:00:00.000Z',
  };
  const packWithoutFingerprint: Omit<VisualMigrationReferencePackV1, 'manifestFingerprint'> = {
    schemaVersion: 'visual-migration-reference-pack/v1', referencePackId: `vmrp-${'a'.repeat(32)}`,
    projectId: PROJECT_ID, sourceReferenceAnchorRunId: 'run-1', createdAt: '2026-09-02T00:00:00.000Z',
    sourceFingerprint: `sha256:${'b'.repeat(64)}`,
    references: [0, 1, 2, 3].map((index) => ({
      referenceId: `style-${index + 1}`,
      storagePath: `visual-migration/reference-packs/vmrp-${'a'.repeat(32)}/assets/style-${index + 1}.png`,
      originalFileName: `style-${index + 1}.png`, mimeType: 'image/png', byteSize: 8,
      sha256: String(index + 1).repeat(64), role: 'style_reference' as const,
    })),
    semanticEvidence: {
      capsuleFingerprint: sha256Fingerprint(canonicalSerializeVisualMigrationValue(capsule)),
      briefFingerprint: `sha256:${'d'.repeat(64)}`,
      creativeDecisionId: 'creative-decision-quick-run-1', styleProfileId: 'style-1',
    },
  };
  const referencePack: VisualMigrationReferencePackV1 = {
    ...packWithoutFingerprint,
    manifestFingerprint: computeVisualMigrationManifestFingerprint(packWithoutFingerprint),
  };
  const canon = buildVisualMigrationCanon({
    projectId: PROJECT_ID, referenceAnchorRunId: 'run-1', referencePack, capsule, styleProfile,
    lockedAssets: [lockedAsset],
    project: { id: PROJECT_ID, brandName: '当前品牌', industry: '零售', logoLocked: true, lockedFacts: ['Logo 必须原样保留'] },
    now: '2026-09-02T00:00:00.000Z',
  });
  return { canon, referencePack, lockedAsset };
}
