import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  createPackagingOperations,
  createPackagingWorkspaceService,
  PACKAGING_WORKSPACE_STATUS,
  projectSelectedPackagingContextToTruth,
  selectCanonicalPackagingContext,
} from '@masterpiece/runtime-core';
import type {
  ActiveReferenceSource,
  PackagingTranslationSource,
  PackagingTranslationV2,
  ProjectVisualContextShortChain,
} from '@masterpiece/project-contracts/index.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const SELECTOR = path.join(ROOT, 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts');
const GRAPH = path.join(ROOT, 'apps/web-runtime/src/current-operation-graph.ts');
const OPERATIONS = path.join(ROOT, 'packages/runtime-core/src/operations/packaging-operations.js');
const NOW = '2026-08-14T00:00:00.000Z';

function translation(concept = 'Canonical analysis packaging direction', structure = 'rigid presentation box'): PackagingTranslationV2 {
  return {
    status: 'ready',
    packagingConcept: concept,
    productAndCategoryRole: ['premium tea gift'],
    structureStrategy: [{ structure, purpose: 'protect and present', locked: false, evidenceRefs: ['project'] }],
    openingExperience: ['layered reveal'],
    productArrangement: ['ordered compartments'],
    graphicTranslation: [],
    informationHierarchy: ['brand', 'product'],
    substrateLanguage: ['textured paper'],
    craftLanguage: [{ craft: 'blind emboss', purpose: 'tactile hierarchy', forbiddenUse: [] }],
    colorBehavior: { base: ['warm white'], identity: ['ink black'], accent: ['copper'], forbidden: [] },
    logoPolicy: ['reserve clear space'],
    seriesArchitecture: [],
    photographyDirection: ['soft directional light'],
    packagingMisreadRisks: [],
    missingRequiredFields: [],
  };
}

function source(
  sourceKind: 'analysis_led' | 'reference_first',
  fingerprint: string,
  concept?: string,
  runId = sourceKind === 'reference_first' ? 'ref-run-a' : 'analysis-run-a',
): PackagingTranslationSource {
  return {
    schemaVersion: '1.0',
    sourceKind,
    projectId: 'project-a',
    producerRunId: runId,
    sourceFingerprint: fingerprint,
    translationContract: 'PackagingTranslationV2',
    generatedAt: NOW,
    translation: translation(concept ?? `${sourceKind} concept`),
  };
}

function context(input: {
  analysis?: PackagingTranslationSource;
  reference?: PackagingTranslationSource;
  projectId?: string;
} = {}): ProjectVisualContextShortChain {
  return {
    schemaVersion: '2.0', projectId: input.projectId ?? 'project-a', version: 1, generatedAt: NOW,
    brandCore: { name: 'Acme', industry: 'tea', brandRole: null, audience: [] },
    lockedAssets: { logoAssetIds: [], brandNameLocked: true, confirmedColors: [], packageStructures: [], productAssetIds: [], lockedAssetIds: [], mustPreserve: [] },
    visualIdentity: { tone: [], colorBehavior: [], graphicBehavior: [], materialBehavior: [], compositionBehavior: [], lightingBehavior: [] },
    styleBoundaries: { mustAvoid: [], uncertainItems: [] }, confirmedDecisions: [], sourceAssetRefs: [],
    provenance: { builderId: 'test', builderVersion: '1.0', sourceKinds: ['project_record'], sourceFingerprint: 'context-fp' },
    packagingTranslations: {
      schemaVersion: '1.0',
      ...(input.analysis ? { analysisLed: input.analysis as PackagingTranslationSource & { sourceKind: 'analysis_led' } } : {}),
      ...(input.reference ? { referenceFirst: input.reference as PackagingTranslationSource & { sourceKind: 'reference_first' } } : {}),
    },
  };
}

function active(runId = 'ref-run-a', fingerprint = 'ref-fp', projectId = 'project-a'): ActiveReferenceSource {
  return { schemaVersion: '1.0', projectId, runId, sourceFingerprint: fingerprint, selectedAt: NOW };
}

function select(mode: 'analysis_led' | 'reference_first', visual = context({
  analysis: source('analysis_led', 'analysis-fp'),
  reference: source('reference_first', 'ref-fp'),
}), activeSource: ActiveReferenceSource | null = active()) {
  return selectCanonicalPackagingContext({
    workspaceProjectId: 'project-a', generationMode: mode,
    projectVisualContext: visual, activeReferenceSource: activeSource,
  });
}

function truthFrom(mode: 'analysis_led' | 'reference_first', visual: ProjectVisualContextShortChain, activeSource: ActiveReferenceSource | null) {
  return {
    lockedAssets: {
      brand: { name: 'Acme', locked: true }, logo: { present: true, usageMode: 'reserved', locked: true },
      productIdentity: { name: 'Tea Gift', locked: true }, category: { name: 'tea', locked: true },
      structure: { formFactor: 'rigid presentation box', locked: true }, mandatoryCopy: { items: [], locked: true },
      confirmedComponents: { items: [], locked: true },
    },
    projectIdentity: {
      projectId: 'project-a', projectName: 'Acme', brandName: 'Acme', industry: 'tea',
      brandRole: 'premium tea house', productIdentity: 'Tea Gift',
    },
    analysisContext: {},
    projectVisualContext: projectSelectedPackagingContextToTruth(selectCanonicalPackagingContext({
      workspaceProjectId: 'project-a', generationMode: mode, projectVisualContext: visual,
      activeReferenceSource: activeSource,
    })),
  };
}

function operationHarness() {
  let visual = context({
    analysis: source('analysis_led', 'analysis-fp', 'Analysis-led direction'),
    reference: source('reference_first', 'ref-fp', 'Reference-first direction'),
  });
  let activeSource: ActiveReferenceSource | null = active();
  const modes: string[] = [];
  const service = createPackagingWorkspaceService({ newSessionId: () => 'ak-session', now: () => NOW });
  const { operations } = createPackagingOperations({
    service,
    resolveTruthSnapshot: async (_projectId: string, mode = 'analysis_led') => {
      modes.push(mode);
      return truthFrom(mode as 'analysis_led' | 'reference_first', visual, activeSource);
    },
    readSettings: async () => ({ apiProfiles: [] }), readCredentials: async () => ({}),
    packagingArtifactStore: { saveRun: async () => undefined, resolveArtifactLifecycle: async () => ({}), readReference: async () => ({}), readArtifactPreview: async () => null },
  });
  return {
    service, operations, modes,
    setVisual: (value: ProjectVisualContextShortChain) => { visual = value; },
    setActive: (value: ActiveReferenceSource | null) => { activeSource = value; },
    getVisual: () => visual,
  };
}

async function prepare(mode: 'analysis_led' | 'reference_first') {
  const h = operationHarness();
  const created = await h.operations['packaging:create-session']({}, { projectId: 'project-a' });
  await h.operations['packaging:update-intent']({}, {
    sessionId: created.sessionId,
    patch: {
      generationMode: mode, providerModelId: 'seedream-5.0-pro', apiProfileId: 'profile-seedream',
      referenceAssignments: mode === 'reference_first'
        ? [{ assetId: 'reference-1', role: 'product_identity_reference', source: 'user' }]
        : [],
    },
  });
  const result = await h.operations['packaging:prepare-generation']({}, created.sessionId);
  return { h, sessionId: created.sessionId, result };
}

test('AK-01 generationMode is the sole selector', () => {
  const code = readFileSync(SELECTOR, 'utf8');
  assert.doesNotMatch(code, /contextMode|producerMode|preferredTranslationSource|fallbackMode/u);
  assert.match(code, /input\.generationMode/u);
});
test('AK-02 analysis_led selects analysisLed only', () => assert.equal(select('analysis_led').translation.packagingConcept, 'analysis_led concept'));
test('AK-03 reference_first selects referenceFirst only', () => assert.equal(select('reference_first').translation.packagingConcept, 'reference_first concept'));
test('AK-04 no silent mode fallback', () => {
  assert.throws(() => select('analysis_led', context({ reference: source('reference_first', 'ref-fp') })), (e: any) => e.code === 'PACKAGING_ANALYSIS_SOURCE_UNAVAILABLE');
  assert.throws(() => select('reference_first', context({ analysis: source('analysis_led', 'analysis-fp') })), (e: any) => e.code === 'PACKAGING_REFERENCE_SOURCE_UNAVAILABLE');
});
test('AK-05 reference_first requires active source', () => assert.throws(() => select('reference_first', undefined, null), (e: any) => e.code === 'PACKAGING_ACTIVE_REFERENCE_SOURCE_MISSING'));
test('AK-06 active run binding is validated', () => assert.throws(() => select('reference_first', undefined, active('other-run')), (e: any) => e.code === 'PACKAGING_REFERENCE_RUN_MISMATCH'));
test('AK-07 source fingerprint is validated', () => assert.throws(() => select('reference_first', undefined, active('ref-run-a', 'other-fp')), (e: any) => e.code === 'PACKAGING_REFERENCE_FINGERPRINT_MISMATCH'));
test('AK-08 context and source project binding are validated', () => assert.throws(() => select('analysis_led', context({ projectId: 'project-b', analysis: source('analysis_led', 'analysis-fp') })), (e: any) => e.code === 'PACKAGING_CONTEXT_PROJECT_MISMATCH'));
test('AK-09 cross-project active Reference is rejected before fingerprint trust', () => assert.throws(() => select('reference_first', undefined, active('ref-run-a', 'ref-fp', 'project-b')), (e: any) => e.code === 'PACKAGING_CONTEXT_PROJECT_MISMATCH'));
test('AK-10 selector has no run discovery or latest selection', () => assert.doesNotMatch(readFileSync(SELECTOR, 'utf8'), /listRuns|readdir|latest|sort\s*\(.*(?:time|run)/iu));
test('AK-11 no ReferenceStyleCapsule interpretation', () => assert.doesNotMatch(readFileSync(SELECTOR, 'utf8') + readFileSync(GRAPH, 'utf8'), /ReferenceStyleCapsule/u));
test('AK-12 no anchorGoal interpretation', () => assert.doesNotMatch(readFileSync(SELECTOR, 'utf8') + readFileSync(GRAPH, 'utf8'), /anchorGoal/u));
test('AK-13 no runtime LLM or reasoning call', () => assert.doesNotMatch(readFileSync(SELECTOR, 'utf8') + readFileSync(GRAPH, 'utf8'), /analyzeReferenceStyle|responses\.create|chat\.completions|reasoner/iu));
test('AK-15 no second stale tracker', () => assert.doesNotMatch(readFileSync(SELECTOR, 'utf8') + readFileSync(OPERATIONS, 'utf8'), /stale-tracker|computeStale|STALE_REASON/u));
test('AK-16 no second ratio authority', () => assert.doesNotMatch(readFileSync(SELECTOR, 'utf8'), /aspectRatio|providerHints/u));
test('AK-17 no second Locked Asset authority', () => assert.doesNotMatch(readFileSync(SELECTOR, 'utf8'), /lockedAssets|LockedAssetsService/u));
test('AK-18 selected translation projects into existing truth fields', () => {
  const projected = projectSelectedPackagingContextToTruth(select('analysis_led'));
  assert.deepEqual(projected.packageStructures, ['rigid presentation box']);
  assert.equal(projected.packagingConcept, 'analysis_led concept');
  assert.equal('producerRunId' in projected, false);
});
test('AK-19 analysis-led Local RPC Prepare reaches READY through selector truth', async () => {
  const { h, result } = await prepare('analysis_led');
  assert.equal(result.view.status, PACKAGING_WORKSPACE_STATUS.READY);
  assert.equal(h.modes.at(-1), 'analysis_led');
});
test('AK-20 reference-first Local RPC Prepare reaches READY independently', async () => {
  const { h, result } = await prepare('reference_first');
  assert.equal(result.view.status, PACKAGING_WORKSPACE_STATUS.READY);
  assert.equal(h.modes.at(-1), 'reference_first');
});
test('AK-21 both producers coexist and mode selection remains deterministic', () => {
  assert.notEqual(select('analysis_led').translation.packagingConcept, select('reference_first').translation.packagingConcept);
});
test('AK-22 active source change enters existing truth_surface_changed STALE path', async () => {
  const { h, sessionId } = await prepare('reference_first');
  h.setActive(active('ref-run-b', 'ref-b'));
  h.setVisual(context({ reference: source('reference_first', 'ref-b', 'Changed reference direction', 'ref-run-b') }));
  const refreshed = await h.operations['packaging:set-truth-snapshot']({}, { sessionId });
  assert.equal(refreshed.view.status, PACKAGING_WORKSPACE_STATUS.STALE);
  assert.deepEqual(refreshed.view.staleReasons, ['truth_surface_changed']);
});
test('AK-23 source fingerprint drift enters existing truth_surface_changed STALE path', async () => {
  const { h, sessionId } = await prepare('analysis_led');
  h.setVisual(context({ analysis: source('analysis_led', 'analysis-fp-b', 'Analysis-led direction') }));
  const refreshed = await h.operations['packaging:set-truth-snapshot']({}, { sessionId });
  assert.equal(refreshed.view.status, PACKAGING_WORKSPACE_STATUS.STALE);
});
test('AK-24 generationMode change uses existing intent_changed STALE path', async () => {
  const { h, sessionId } = await prepare('analysis_led');
  const changed = await h.operations['packaging:update-intent']({}, { sessionId, patch: { generationMode: 'reference_first', referenceAssignments: [{ assetId: 'reference-1', role: 'product_identity_reference', source: 'user' }] } });
  assert.equal(changed.view.status, PACKAGING_WORKSPACE_STATUS.STALE);
  assert.deepEqual(changed.view.staleReasons, ['intent_changed']);
});
test('AK-25 same semantic rerun does not create false stale from producerRunId', async () => {
  const { h, sessionId } = await prepare('reference_first');
  h.setActive(active('ref-run-b', 'ref-fp'));
  h.setVisual(context({ reference: source('reference_first', 'ref-fp', 'Reference-first direction', 'ref-run-b') }));
  const refreshed = await h.operations['packaging:set-truth-snapshot']({}, { sessionId });
  assert.equal(refreshed.view.status, PACKAGING_WORKSPACE_STATUS.READY);
  assert.deepEqual(refreshed.view.staleReasons, []);
});
test('AK-26 Reference revocation fails closed and cannot use cached truth', async () => {
  const { h, sessionId } = await prepare('reference_first');
  h.setActive(null);
  await assert.rejects(() => h.operations['packaging:prepare-generation']({}, sessionId), (e: any) => e.code === 'PACKAGING_ACTIVE_REFERENCE_SOURCE_MISSING');
});
test('AK-27 invalid source kind and PackagingTranslationV2 fail closed', () => {
  const wrong = source('analysis_led', 'analysis-fp') as any; wrong.sourceKind = 'reference_first';
  assert.throws(() => select('analysis_led', context({ analysis: wrong })), (e: any) => e.code === 'PACKAGING_CONTEXT_SOURCE_KIND_MISMATCH');
  const invalid = source('analysis_led', 'analysis-fp') as any; invalid.translation = { packagingConcept: 'incomplete' };
  assert.throws(() => select('analysis_led', context({ analysis: invalid })), (e: any) => e.code === 'PACKAGING_CONTEXT_TRANSLATION_INVALID');
});
