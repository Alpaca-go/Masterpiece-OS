import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  LockedAsset,
  ReferenceStyleCapsule,
  StyleProfile,
  VisualMigrationReferencePackV1,
} from '@masterpiece/project-contracts/index.ts';
import { buildVisualMigrationCanon } from '@masterpiece/runtime-core/application/visual-migration-canon-builder.ts';
import { VISUAL_MIGRATION_CANON_COMPILER_VERSION } from '@masterpiece/runtime-core/application/visual-migration-canon-contract.ts';
import {
  canonicalSerializeVisualMigrationValue,
  computeVisualMigrationManifestFingerprint,
  sha256Fingerprint,
} from '@masterpiece/runtime-core/application/visual-migration-reference-pack-contract.ts';

function capsule(): ReferenceStyleCapsule {
  return {
    schemaVersion: '1.0', sourceRunId: 'run-1', currentProjectId: 'project-1',
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
      color: ['低饱和暖色'],
      layoutAndTypography: ['大留白层级'],
      graphicLanguage: ['克制线条'],
      materialAndPhotography: ['真实纸张'],
      extensionMechanism: ['单一焦点延展'],
    },
    userPreference: null,
    userAvoidance: ['不要多格拼贴'],
    prohibitedReferenceIdentity: {
      brandNames: ['参考品牌'], logos: ['参考 Logo'], slogans: ['参考口号'],
      signatureGraphics: ['参考超级图形'], proprietaryPatterns: ['参考专属纹样'],
    },
    anchorGoal: '迁移视觉语言并保留当前品牌身份', aspectRatio: '1:1', humanNotes: [], uncertainties: [],
  };
}

function style(): StyleProfile {
  return {
    schemaVersion: '6.0', id: 'style-1', projectId: 'project-1', name: '迁移风格', version: '1.0.0', status: 'draft',
    styleEssence: { summary: '迁移视觉语言', keywords: ['克制'], mood: [], visualPositioning: '保留身份并迁移机制' },
    colorSystem: { primary: ['低饱和暖色'], secondary: [], neutral: [], accent: [], distributionRules: ['暖色主导'], forbiddenColors: [] },
    shapeLanguage: { geometry: [], silhouetteRules: [], proportionRules: [] },
    graphicLanguage: { coreMotifs: ['克制线条'], patternRules: [], lineRules: [], illustrationRules: [], layoutRhythm: [] },
    compositionSystem: {
      hierarchy: ['大留白层级'], density: '低密度', negativeSpace: '大面积留白',
      focalPointRules: ['单一焦点延展'], cameraRules: [], croppingRules: [],
    },
    materialAndTexture: { materials: ['真实纸张'], surfaceRules: [], printFeeling: [], renderingRules: [], forbiddenTextures: [] },
    lightingSystem: { type: '', contrast: '', shadow: '', temperature: '' },
    typographyCompatibility: ['大留白层级'],
    allowedVariations: ['低饱和暖色', '大留白层级', '克制线条', '真实纸张', '单一焦点延展'], forbiddenVariations: [],
    promptComponents: { required: ['迁移视觉语言'], positive: ['克制'], negative: [] },
    source: { creativeDecisionId: 'creative-decision-quick-run-1', creativeDecisionVersion: '1.0.0', compilerVersion: '1.0.0' },
    createdAt: '2026-09-02T00:00:00.000Z', updatedAt: '2026-09-02T00:00:00.000Z',
  };
}

function lock(): LockedAsset {
  return {
    schemaVersion: '6.0', id: 'lock-logo', projectId: 'project-1', type: 'logo', name: '当前品牌 Logo',
    sourceAssetId: 'logo-source', sourceFile: 'assets/logo.png', rule: 'Logo 必须原样保留', priority: 'critical',
    allowedChanges: ['允许等比缩放'], forbiddenChanges: ['不得重绘 Logo'],
    evidence: { source: 'project_visual_context', description: '项目已锁定 Logo' },
    createdAt: '2026-09-02T00:00:00.000Z', updatedAt: '2026-09-02T00:00:00.000Z',
  };
}

function pack(capsuleValue: ReferenceStyleCapsule): VisualMigrationReferencePackV1 {
  const withoutFingerprint: Omit<VisualMigrationReferencePackV1, 'manifestFingerprint'> = {
    schemaVersion: 'visual-migration-reference-pack/v1', referencePackId: `vmrp-${'a'.repeat(32)}`,
    projectId: 'project-1', sourceReferenceAnchorRunId: 'run-1', createdAt: '2026-09-02T00:00:00.000Z',
    sourceFingerprint: `sha256:${'b'.repeat(64)}`,
    references: [{
      referenceId: 'reference-01',
      storagePath: `visual-migration/reference-packs/vmrp-${'a'.repeat(32)}/assets/reference-01.png`,
      originalFileName: 'reference.png', mimeType: 'image/png', byteSize: 8, sha256: 'c'.repeat(64), role: 'style_reference',
    }],
    semanticEvidence: {
      capsuleFingerprint: sha256Fingerprint(canonicalSerializeVisualMigrationValue(capsuleValue)),
      briefFingerprint: `sha256:${'d'.repeat(64)}`,
      creativeDecisionId: 'creative-decision-quick-run-1',
      styleProfileId: 'style-1',
    },
  };
  return { ...withoutFingerprint, manifestFingerprint: computeVisualMigrationManifestFingerprint(withoutFingerprint) };
}

function input() {
  const capsuleValue = capsule();
  return {
    projectId: 'project-1', referenceAnchorRunId: 'run-1', referencePack: pack(capsuleValue),
    capsule: capsuleValue, styleProfile: style(), lockedAssets: [lock()],
    project: { id: 'project-1', brandName: '当前品牌', industry: '零售', logoLocked: true, lockedFacts: ['Logo 必须原样保留'] },
    now: '2026-09-02T00:00:00.000Z',
  };
}

test('VM-2 builder compiles Project Locked Facts and Locked Assets as hard identity rules', () => {
  const canon = buildVisualMigrationCanon(input());
  assert.equal(canon.projectIdentity.brandName, '当前品牌');
  assert.deepEqual(canon.projectIdentity.lockedAssetIds, ['lock-logo']);
  assert.equal(canon.projectIdentity.requiredIdentityRules.length, 2);
  assert.ok(canon.projectIdentity.requiredIdentityRules.every((rule) => rule.invariantLevel === 'hard'));
  assert.deepEqual(canon.projectIdentity.requiredIdentityRules[1]!.prohibitedVariation, ['不得重绘 Logo']);
});

test('VM-2 builder compiles all five approved Capsule transfer dimensions', () => {
  const canon = buildVisualMigrationCanon(input());
  assert.equal(canon.transferSystem.color[0]!.statement, '低饱和暖色');
  assert.equal(canon.transferSystem.layoutAndTypography[0]!.statement, '大留白层级');
  assert.equal(canon.transferSystem.graphicLanguage[0]!.statement, '克制线条');
  assert.equal(canon.transferSystem.materialAndPhotography[0]!.statement, '真实纸张');
  assert.equal(canon.transferSystem.extensionMechanism[0]!.statement, '单一焦点延展');
  assert.ok(canon.transferSystem.color.some((rule) => rule.source === 'style_profile' && rule.statement === '暖色主导'));
  assert.deepEqual(
    canon.transferSystem.extensionMechanism.map((rule) => rule.statement),
    ['单一焦点延展'],
  );
  assert.ok(['低饱和暖色', '大留白层级', '克制线条', '真实纸张'].every(
    (statement) => !canon.transferSystem.extensionMechanism.some((rule) => rule.statement === statement),
  ));
});

test('VM-2.1 builder records compiler identity in source and trace', () => {
  const canon = buildVisualMigrationCanon(input());
  assert.equal(canon.source.compilerVersion, VISUAL_MIGRATION_CANON_COMPILER_VERSION);
  assert.equal(canon.trace.compilerVersion, VISUAL_MIGRATION_CANON_COMPILER_VERSION);
});

test('VM-2 builder preserves user avoidance and all reference identity prohibitions', () => {
  const canon = buildVisualMigrationCanon(input());
  assert.deepEqual(canon.prohibitedTransfer.userAvoidance, ['不要多格拼贴']);
  assert.deepEqual(canon.prohibitedTransfer.referenceBrandNames, ['参考品牌']);
  assert.deepEqual(canon.prohibitedTransfer.referenceLogos, ['参考 Logo']);
  assert.deepEqual(canon.prohibitedTransfer.referenceSlogans, ['参考口号']);
  assert.deepEqual(canon.prohibitedTransfer.referenceSignatureGraphics, ['参考超级图形']);
  assert.deepEqual(canon.prohibitedTransfer.referenceProprietaryPatterns, ['参考专属纹样']);
  assert.deepEqual(canon.prohibitedTransfer.prohibitedMutations, ['不得重绘 Logo']);
});

test('VM-2 builder accepts a consistent Capsule and Style Profile', () => {
  assert.equal(buildVisualMigrationCanon(input()).status, 'valid');
});

test('VM-2 builder excludes compiler placeholders from production semantic rules', () => {
  const value = input();
  value.styleProfile.compositionSystem.density = '由 Primary Canon 校准';
  assert.doesNotMatch(JSON.stringify(buildVisualMigrationCanon(value).transferSystem), /由 Primary Canon 校准/u);
});

test('VM-2 builder fails closed when Style Profile explicitly forbids an approved Capsule rule', () => {
  const value = input();
  value.styleProfile.colorSystem.forbiddenColors = ['低饱和暖色'];
  assert.throws(() => buildVisualMigrationCanon(value), { code: 'VISUAL_MIGRATION_CANON_STYLE_CONFLICT' });
});

test('VM-2 builder fails closed when a Capsule transfer rule contains reference identity', () => {
  const value = input();
  value.capsule.inheritedStyle.graphicLanguage = ['使用参考 Logo'];
  value.styleProfile.graphicLanguage.coreMotifs = ['使用参考 Logo'];
  value.referencePack = pack(value.capsule);
  assert.throws(() => buildVisualMigrationCanon(value), { code: 'VISUAL_MIGRATION_CANON_IDENTITY_CONFLICT' });
});

test('VM-2 builder fails closed when a Locked Identity rule becomes transferable', () => {
  const value = input();
  value.capsule.inheritedStyle.graphicLanguage = ['Logo 必须原样保留'];
  value.styleProfile.graphicLanguage.coreMotifs = ['Logo 必须原样保留'];
  value.referencePack = pack(value.capsule);
  assert.throws(() => buildVisualMigrationCanon(value), { code: 'VISUAL_MIGRATION_CANON_IDENTITY_CONFLICT' });
});

test('VM-2 builder produces stable source and Canon fingerprints for identical input', () => {
  const first = buildVisualMigrationCanon(input());
  const secondInput = input();
  secondInput.now = '2026-09-03T00:00:00.000Z';
  const second = buildVisualMigrationCanon(secondInput);
  assert.equal(second.sourceFingerprint, first.sourceFingerprint);
  assert.equal(second.canonId, first.canonId);
  assert.equal(second.canonFingerprint, first.canonFingerprint);
});

test('VM-2 builder binds only Reference Pack ids and fingerprints, never image bytes or Provider fields', () => {
  const canon = buildVisualMigrationCanon(input());
  const serialized = JSON.stringify(canon);
  assert.equal(canon.evidence.visualEvidence.referenceIds[0], 'reference-01');
  assert.doesNotMatch(serialized, /absolutePath|provider|modelId|materializedReferences/u);
  assert.doesNotMatch(serialized, /89504e47/u);
});
