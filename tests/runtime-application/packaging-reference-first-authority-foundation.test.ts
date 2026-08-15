// P3-C1.2 — AJ Reference-first active-source and multi-producer authority guards.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createReferenceAnchorService } from '@masterpiece/runtime-core/application/reference-anchor-service.ts';
import {
  computeReferencePackagingSourceFingerprint,
  createReferencePackagingSource,
} from '@masterpiece/runtime-core/application/reference-packaging-authority.ts';
import { normalizeReferenceFirstAnalysisOutput } from '@masterpiece/runtime-core/application/pipeline-service.ts';
import {
  migrateProjectVisualContext,
  removeProjectPackagingTranslation,
  upsertProjectPackagingTranslation,
  validateProjectVisualContext,
} from '@masterpiece/runtime-core/application/project-visual-context-builder.ts';
import type {
  PackagingTranslationSource,
  PackagingTranslationV2,
  ProjectVisualContext,
  ProjectVisualContextShortChain,
} from '@masterpiece/project-contracts/index.ts';
import type { ReferenceStyleProfile } from '@masterpiece/runtime-core/application-contracts.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const P2_CURRENT = 'a593278b55e437fac59d768c5cee734d9a9fc201';
const P3A_CURRENT = 'f95c145b9b1e37430ac68315c9e039f1f3262ae4';


const P3B_ACCEPTED = '2ac4cf1cc18156d1e4a508382b4563298d69c014';

function git(args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (error) {
    const failure = error as { status?: number; stdout?: string };
    if (failure.status === 1) return String(failure.stdout || '').trim();
    throw error;
  }
}

function readyTranslation(concept = 'Reference-first project packaging concept.'): PackagingTranslationV2 {
  return {
    status: 'ready',
    packagingConcept: concept,
    productAndCategoryRole: ['The core product leads category recognition.'],
    structureStrategy: [{ structure: 'rigid carton', purpose: 'Protect and stage the product.', locked: true, evidenceRefs: ['project-structure'] }],
    openingExperience: ['A clear staged reveal.'],
    productArrangement: ['Product follows a stable internal grid.'],
    graphicTranslation: [{ sourceMeaning: 'Measured rhythm', packagingExpression: ['Controlled modular bands'], forbiddenLiteralUse: ['Reference brand marks'] }],
    informationHierarchy: ['Brand, product, variant, and mandatory information.'],
    substrateLanguage: ['Tactile uncoated paper.'],
    craftLanguage: [{ craft: 'blind emboss', purpose: 'Create tactile hierarchy.', forbiddenUse: ['Decorative overload'] }],
    colorBehavior: { base: ['neutral base'], identity: ['project identity color'], accent: ['limited accent'], forbidden: ['reference brand palette copy'] },
    logoPolicy: ['Preserve the Locked Logo and its safety area.'],
    seriesArchitecture: ['Keep hierarchy fixed while variants change.'],
    photographyDirection: ['Controlled light and truthful product texture.'],
    packagingMisreadRisks: ['Do not imply a different product category.'],
    missingRequiredFields: [],
  };
}

function styleProfile(): ReferenceStyleProfile {
  const rule = (value: string) => ({ rule: `${value}。`, evidence: ['asset-1 observable evidence'], designEffect: '形成清晰关系。', confidence: 0.9 });
  return {
    schemaVersion: 'reference-style-profile-v3',
    overallTemperament: [rule('克制而清晰的整体气质')],
    colorSystem: [rule('中性基底承载有限强调色')],
    compositionSystem: [rule('稳定网格组织信息与留白')],
    graphicLanguage: [rule('模块化图形建立系列节奏')],
    typographySystem: [rule('标题正文形成明确层级')],
    materialSystem: [rule('触感纸张形成克制表面')],
    lightingSystem: [rule('柔和侧光控制明暗过渡')],
    photographySystem: [rule('真实产品摄影保留材质细节')],
    packagingPresentation: [rule('包装展示强调结构与开启关系')],
    posterPresentation: [rule('海报主体与留白保持稳定比例')],
    viExtensionSystem: [rule('跨触点保持层级并允许变量变化')],
    excludedIdentityTerms: [],
    sourceAssetIds: ['asset-1'],
  };
}

function legacyVisual(projectId = 'project-a'): ProjectVisualContext {
  return {
    schemaVersion: '1.0',
    projectId,
    sourceRunId: 'analysis-run',
    generatedAt: '2026-08-14T00:00:00.000Z',
    identity: { projectName: 'Authority Project', brandName: 'Authority Brand', industry: 'Consumer Goods' },
    confidence: { projectName: 1, brandName: 1, industry: 1 },
    lockedAssets: { logoLocked: true, logoAssetIds: ['logo-1'], lockedAssetIds: [], lockedFacts: ['Logo is locked.'] },
    products: { coreProducts: ['Authority Product'], secondaryProducts: [] },
    currentVisualSystem: { existingVisualAssets: [], primaryColors: [], supportingColors: [], graphicAssets: [], typographySignals: [], materialSignals: [], photographySignals: [] },
    packaging: { structures: ['rigid carton'], status: 'confirmed', evidenceSources: ['project-structure'] },
    businessTouchpoints: { packaging: ['rigid carton'], viApplications: [], spatial: [], digital: [] },
    evaluation: { visualStrengths: [], visualProblems: [], modifiableAssets: [] },
    uncertainties: [],
    source: { reportPath: '', runtimeReportPath: '', assetCount: 1, imageCount: 1, provider: 'mock', model: 'mock' },
  };
}

function shortContext(projectId = 'project-a'): ProjectVisualContextShortChain {
  return {
    schemaVersion: '2.0', projectId, version: 1, generatedAt: '2026-08-14T00:00:00.000Z',
    brandCore: { name: 'Authority Brand', industry: 'Consumer Goods', brandRole: null, audience: [] },
    lockedAssets: { logoAssetIds: ['logo-1'], brandNameLocked: true, confirmedColors: [], packageStructures: ['rigid carton'], productAssetIds: [], lockedAssetIds: [], mustPreserve: ['Logo is locked.'] },
    visualIdentity: { tone: [], colorBehavior: [], graphicBehavior: [], materialBehavior: [], compositionBehavior: [], lightingBehavior: [] },
    styleBoundaries: { mustAvoid: [], uncertainItems: [] }, confirmedDecisions: [], sourceAssetRefs: [],
    provenance: { builderId: 'fixture', builderVersion: '1.0', sourceKinds: ['project_record'], sourceFingerprint: 'base-context-fingerprint' },
  };
}

function source(kind: 'analysis_led' | 'reference_first', fingerprint: string, runId: string | null): PackagingTranslationSource {
  return {
    schemaVersion: '1.0', sourceKind: kind, projectId: 'project-a', producerRunId: runId,
    sourceFingerprint: fingerprint, translationContract: 'PackagingTranslationV2',
    generatedAt: '2026-08-14T00:00:00.000Z', translation: readyTranslation(`${kind} concept`),
  };
}

async function harness() {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'p3-c1-2-'));
  const assetPath = path.join(dataPath, 'reference.png');
  await fs.writeFile(assetPath, Buffer.from('reference-a'));
  let project: any = {
    id: 'project-a', projectName: 'Authority Project', brandName: 'Authority Brand',
    apiProfileId: 'profile-1', activeReferenceSource: null,
  };
  let context = shortContext();
  let calls = 0;
  const service = createReferenceAnchorService(() => ({
    defaultDataPath: dataPath,
    defaultProfileId: 'profile-1',
    profiles: [{ id: 'profile-1', isEnabled: true, modelId: 'mock', provider: 'mock' }],
  } as any), {
    projects: {
      get: async (projectId: string) => projectId === 'project-a' ? project : { ...project, id: projectId },
      update: async (_projectId: string, changes: any) => (project = { ...project, ...changes }),
      create: async () => ({ id: `reference-temp-${calls + 1}` }), scan: async () => ({}), remove: async () => undefined,
    } as any,
    pipeline: {
      analyzeReferenceStyle: async () => {
        calls += 1;
        return { value: { referenceStyleProfile: styleProfile(), packagingTranslation: readyTranslation(`Reference concept ${calls}`) }, provider: 'mock', model: 'mock', modelCallCount: 1 };
      },
      cancel: () => undefined,
    } as any,
    projectContext: {
      get: async () => legacyVisual(),
      upsertPackagingTranslation: async (_projectId: string, value: PackagingTranslationSource) => (context = upsertProjectPackagingTranslation(context, value)),
      removePackagingTranslation: async (_projectId: string, kind: 'analysis_led' | 'reference_first', fingerprint?: string) => (context = removeProjectPackagingTranslation(context, kind, fingerprint)),
    } as any,
    documentContext: { getExtracted: async () => null } as any,
  });
  return { service, assetPath, project: () => project, context: () => context, calls: () => calls };
}

test('AJ-01 explicit approval persists an active Reference source', async () => {
  const h = await harness(); const run = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] });
  await h.service.setDecision(run.run.id, 'approved');
  assert.equal(h.project().activeReferenceSource.runId, run.run.id);
  assert.equal((await h.service.getActiveSource('project-a')).producerRunId, run.run.id);
});

test('AJ-02 unapproved newer run never replaces the explicit active run', async () => {
  const h = await harness(); const first = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] });
  await h.service.setDecision(first.run.id, 'approved');
  const second = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] });
  assert.notEqual(second.run.id, first.run.id); assert.equal(h.project().activeReferenceSource.runId, first.run.id);
});

test('AJ-03 active source is project-bound', async () => {
  const h = await harness(); const result = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] });
  await h.service.setDecision(result.run.id, 'approved'); assert.equal(h.project().activeReferenceSource.projectId, 'project-a');
});

test('AJ-04 cross-project active selection is rejected', async () => {
  const h = await harness(); const result = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] });
  await h.service.setDecision(result.run.id, 'approved');
  await assert.rejects(() => h.service.setActiveSource('project-b', result.run.id), (error: any) => error.code === 'REFERENCE_ACTIVE_SOURCE_PROJECT_MISMATCH');
});

test('AJ-05 producer parser accepts PackagingTranslationV2 in the same response', () => {
  const parsed = normalizeReferenceFirstAnalysisOutput({ referenceStyleProfile: styleProfile(), packagingTranslation: readyTranslation() } as any, ['asset-1']);
  assert.equal(parsed.packagingTranslation.status, 'ready'); assert.equal(parsed.referenceStyleProfile.sourceAssetIds[0], 'asset-1');
});

test('AJ-06 anchorGoal remains distinct from packagingConcept', async () => {
  const h = await harness(); const result = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] });
  assert.notEqual(result.capsule.anchorGoal, result.packagingSource?.translation.packagingConcept);
});

test('AJ-07 reference-first output exists without an analysis-led Packaging slot', async () => {
  const h = await harness(); const result = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] });
  await h.service.setDecision(result.run.id, 'approved');
  assert.equal(h.context().packagingTranslations?.analysisLed, undefined); assert.equal(h.context().packagingTranslations?.referenceFirst?.translation.status, 'ready');
});

test('AJ-08 source fingerprint is producer-owned and present on run + output', async () => {
  const h = await harness(); const result = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] });
  assert.ok(result.run.sourceFingerprint); assert.equal(result.run.sourceFingerprint, result.packagingSource?.sourceFingerprint);
});

test('AJ-09 fingerprint is deterministic for the same semantic source', () => {
  const project = { projectId: 'p', brandName: 'b', industry: 'i', coreProducts: ['x'], businessTouchpoints: [], packagingStructures: [], lockedFacts: [], logoLocked: true };
  assert.equal(computeReferencePackagingSourceFingerprint({ project, referenceAssetContentHashes: ['b', 'a'] }), computeReferencePackagingSourceFingerprint({ project, referenceAssetContentHashes: ['a', 'b'] }));
});

test('AJ-10 run identity is distinct from source fingerprint', async () => {
  const h = await harness(); const a = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] }); const b = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] });
  assert.notEqual(a.run.id, b.run.id); assert.equal(a.run.sourceFingerprint, b.run.sourceFingerprint); assert.notEqual(a.run.id, a.run.sourceFingerprint);
});

test('AJ-11 analysis and Reference translations coexist', () => {
  let context = upsertProjectPackagingTranslation(shortContext(), source('analysis_led', 'analysis-fp', 'analysis-run'));
  context = upsertProjectPackagingTranslation(context, source('reference_first', 'reference-fp', 'reference-run'));
  assert.equal(context.packagingTranslations?.analysisLed?.sourceFingerprint, 'analysis-fp'); assert.equal(context.packagingTranslations?.referenceFirst?.sourceFingerprint, 'reference-fp');
});

test('AJ-12 one producer cannot overwrite the other producer slot', () => {
  let context = upsertProjectPackagingTranslation(shortContext(), source('analysis_led', 'analysis-fp', 'analysis-run'));
  context = upsertProjectPackagingTranslation(context, source('reference_first', 'reference-a', 'run-a'));
  context = upsertProjectPackagingTranslation(context, source('reference_first', 'reference-b', 'run-b'));
  assert.equal(context.packagingTranslations?.analysisLed?.sourceFingerprint, 'analysis-fp'); assert.equal(context.packagingTranslations?.referenceFirst?.sourceFingerprint, 'reference-b');
});

test('AJ-13 no Packaging Context Store is introduced', () => {
  assert.equal(git(['ls-files', '*packaging*context*store*', '*reference*packaging*store*']), '');
});

test('AJ-14 downstream Packaging contains no Reference interpretation', () => {
  const graph = git(['grep', '-n', '-E', 'ReferenceStyleCapsule|anchorGoal', '--', 'apps/web-runtime/src/current-operation-graph.ts', 'packages/runtime-core/src/application/packaging',
    C4_2_SUBTREE]);
  assert.equal(graph, '');
});

test('AJ-15 Packaging entry contains no new model call', () => {
  const graph = git(['grep', '-n', '-E', 'analyzeReferenceStyle|responses\\.create|chat\\.completions', '--', 'apps/web-runtime/src/current-operation-graph.ts', 'packages/runtime-core/src/application/packaging',
    C4_2_SUBTREE]);
  assert.equal(graph, '');
});

test('AJ-16 Reference source cannot become a second Locked Asset authority', () => {
  const bad = createReferencePackagingSource({ projectId: 'project-a', runId: 'run-a', sourceFingerprint: 'fp', generatedAt: '2026-08-14T00:00:00.000Z', translation: readyTranslation() });
  assert.equal(bad.sourceKind, 'reference_first'); assert.equal('lockedAssets' in bad, false);
});

test('AJ-17 Reference translation owns no Shot Contract or aspectRatio', () => {
  assert.equal('aspectRatio' in readyTranslation(), false); assert.equal('providerHints' in readyTranslation(), false);
});

test('AJ-18 P2 current production diff is zero', () => assert.equal(git(['diff', '--name-only', P2_CURRENT, 'HEAD', '--', 'packages/image-generation-runtime/src/packaging']), ''));
test('AJ-19 P3-A current production diff is zero', () => assert.equal(git(['diff', '--name-only', P3A_CURRENT, 'HEAD', '--', 'packages/runtime-core/src/application/packaging',
    C4_2_SUBTREE]), ''));
test('AJ-20 P3-B accepted UI and Workspace semantics are unchanged', () => assert.equal(git(['diff', '--name-only', P3B_ACCEPTED, 'HEAD', '--', 'apps/web/src/features/packaging', 'packages/runtime-core/src/application/packaging',
    C4_2_SUBTREE]), ''));

test('AJ-C01 no active source fails closed', async () => { const h = await harness(); await assert.rejects(() => h.service.getActiveSource('project-a'), (error: any) => error.code === 'REFERENCE_ACTIVE_SOURCE_UNAVAILABLE'); });

test('AJ-C02 explicit re-selection switches A to B without latest inference', async () => {
  const h = await harness(); const a = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] }); const b = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] });
  await h.service.setDecision(a.run.id, 'approved'); assert.equal(h.project().activeReferenceSource.runId, a.run.id);
  await h.service.setDecision(b.run.id, 'approved'); assert.equal(h.project().activeReferenceSource.runId, b.run.id);
  await h.service.setActiveSource('project-a', a.run.id); assert.equal(h.project().activeReferenceSource.runId, a.run.id);
});

test('AJ-C03 changed Reference asset content changes source fingerprint', async () => {
  const h = await harness(); const a = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] });
  await fs.writeFile(h.assetPath, Buffer.from('reference-b')); const b = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] });
  assert.notEqual(a.run.sourceFingerprint, b.run.sourceFingerprint);
});

test('AJ-C04 legacy context remains readable and does not fabricate Reference source', () => {
  const migrated = migrateProjectVisualContext(shortContext()); assert.equal(validateProjectVisualContext(migrated).valid, true); assert.equal(migrated.packagingTranslations?.referenceFirst, undefined);
});

test('AJ-C05 removing the active run clears selection and Reference slot', async () => {
  const h = await harness(); const result = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] });
  await h.service.setDecision(result.run.id, 'approved'); await h.service.remove(result.run.id);
  assert.equal(h.project().activeReferenceSource, null); assert.equal(h.context().packagingTranslations?.referenceFirst, undefined);
  await assert.rejects(() => h.service.getActiveSource('project-a'), (error: any) => error.code === 'REFERENCE_ACTIVE_SOURCE_UNAVAILABLE');
});

test('AJ-C06 mismatched active fingerprint fails closed', async () => {
  const h = await harness(); const result = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] });
  await h.service.setDecision(result.run.id, 'approved'); h.project().activeReferenceSource.sourceFingerprint = 'tampered';
  await assert.rejects(() => h.service.getActiveSource('project-a'), (error: any) => error.code === 'REFERENCE_PACKAGING_SOURCE_INVALID');
});

test('AJ-C07 analysis-led-only context stays valid and Reference remains absent', () => {
  const context = upsertProjectPackagingTranslation(shortContext(), source('analysis_led', 'analysis-only', 'analysis-run'));
  assert.equal(validateProjectVisualContext(context).valid, true); assert.equal(context.packagingTranslations?.analysisLed?.translation.status, 'ready'); assert.equal(context.packagingTranslations?.referenceFirst, undefined);
});

test('AJ-C08 a ReferenceStyleCapsule alone is not a Packaging translation source', () => {
  assert.throws(() => upsertProjectPackagingTranslation(shortContext(), { schemaVersion: '1.0', sourceRunId: 'run-a', currentProjectId: 'project-a', anchorGoal: 'generic goal' } as any), (error: any) => error.code === 'PROJECT_PACKAGING_TRANSLATION_INVALID');
});

test('AJ-C09 editing an approved run revokes its active selection', async () => {
  const h = await harness(); const result = await h.service.start({ currentProjectId: 'project-a', referenceAssetPaths: [h.assetPath] });
  await h.service.setDecision(result.run.id, 'approved'); await h.service.retryBrief(result.run.id);
  assert.equal(h.project().activeReferenceSource, null); await assert.rejects(() => h.service.getActiveSource('project-a'), (error: any) => error.code === 'REFERENCE_ACTIVE_SOURCE_UNAVAILABLE');
});
