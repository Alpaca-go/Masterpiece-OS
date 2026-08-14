// P3-C3 / AL — dual-mode production integration acceptance.
//
// The paid image Provider is replaced by a sanctioned local executor. Every
// other boundary is production: Runtime operations, the C2 selector, P3-A/P2,
// artifact lifecycle, canonical run store, and preview bridge.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createPackagingArtifactStore,
  createDefaultPackagingIntent,
  createPackagingOperations,
  createPackagingRunRegistrationAdapter,
  createPackagingWorkspaceService,
  PACKAGING_WORKSPACE_STATUS,
  projectSelectedPackagingContextToTruth,
  selectCanonicalPackagingContext,
} from '@masterpiece/runtime-core';
import { createRunStore } from '@masterpiece/runtime-core/image-generation-run-store';
import type {
  ActiveReferenceSource,
  PackagingTranslationSource,
  PackagingTranslationV2,
  ProjectVisualContextShortChain,
} from '@masterpiece/project-contracts/index.ts';
import {
  executePackagingGeneration,
  preparePackagingGeneration,
} from '@masterpiece/image-generation-runtime/packaging/generation-service.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const SELECTOR = path.join(ROOT, 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts');
const GRAPH = path.join(ROOT, 'apps/web-runtime/src/current-operation-graph.ts');
const P2 = 'a593278b55e437fac59d768c5cee734d9a9fc201';
const P3A = 'f95c145b9b1e37430ac68315c9e039f1f3262ae4';
const P3B = '2ac4cf1cc18156d1e4a508382b4563298d69c014';
const PROJECT_ID = 'p3-c3-dual-mode';
const PROFILE_ID = 'profile-sanctioned-local';
const MODEL_ID = 'seedream-5.0-pro';
const NOW = '2026-08-14T09:00:00.000Z';
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAE/wJ/lP5qVQAAAABJRU5ErkJggg==',
  'base64',
);

type Mode = 'analysis_led' | 'reference_first';

interface Evidence {
  analysis: any;
  reference: any;
  independent: any;
  switches: any;
  guards: any;
}

let dataPath = '';
let evidence: Evidence;

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function translation(concept: string): PackagingTranslationV2 {
  return {
    status: 'ready',
    packagingConcept: concept,
    productAndCategoryRole: ['premium botanical serum'],
    structureStrategy: [
      { structure: 'cylindrical body', purpose: 'protect serum', locked: true, evidenceRefs: ['project'] },
      { structure: 'screw cap', purpose: 'secure closure', locked: true, evidenceRefs: ['project'] },
      { structure: 'pipette dropper', purpose: 'controlled dispensing', locked: true, evidenceRefs: ['project'] },
    ],
    openingExperience: ['controlled uncap and dispense'],
    productArrangement: ['single centered bottle'],
    graphicTranslation: [],
    informationHierarchy: ['brand', 'product', '30ml'],
    substrateLanguage: ['frosted glass'],
    craftLanguage: [{ craft: 'screen print', purpose: 'clear hierarchy', forbiddenUse: [] }],
    colorBehavior: { base: ['warm white'], identity: ['forest green'], accent: ['brass'], forbidden: [] },
    logoPolicy: ['reserve clear space'],
    seriesArchitecture: [],
    photographyDirection: ['soft directional studio light'],
    packagingMisreadRisks: [],
    missingRequiredFields: [],
  };
}

function source(
  sourceKind: Mode,
  fingerprint: string,
  concept: string,
  producerRunId: string,
  projectId = PROJECT_ID,
): PackagingTranslationSource {
  return {
    schemaVersion: '1.0',
    sourceKind,
    projectId,
    producerRunId,
    sourceFingerprint: fingerprint,
    translationContract: 'PackagingTranslationV2',
    generatedAt: NOW,
    translation: translation(concept),
  };
}

function context(input: {
  analysis?: PackagingTranslationSource;
  reference?: PackagingTranslationSource;
  projectId?: string;
}): ProjectVisualContextShortChain {
  return {
    schemaVersion: '2.0',
    projectId: input.projectId ?? PROJECT_ID,
    version: 1,
    generatedAt: NOW,
    brandCore: { name: 'Acme Botanicals', industry: 'Skincare', brandRole: null, audience: [] },
    lockedAssets: {
      logoAssetIds: [], brandNameLocked: true, confirmedColors: [], packageStructures: [],
      productAssetIds: [], lockedAssetIds: [], mustPreserve: [],
    },
    visualIdentity: {
      tone: [], colorBehavior: [], graphicBehavior: [], materialBehavior: [],
      compositionBehavior: [], lightingBehavior: [],
    },
    styleBoundaries: { mustAvoid: [], uncertainItems: [] },
    confirmedDecisions: [],
    sourceAssetRefs: [],
    provenance: {
      builderId: 'p3-c3-test', builderVersion: '1.0', sourceKinds: ['project_record'],
      sourceFingerprint: 'project-context-fp',
    },
    packagingTranslations: {
      schemaVersion: '1.0',
      ...(input.analysis ? { analysisLed: input.analysis as PackagingTranslationSource & { sourceKind: 'analysis_led' } } : {}),
      ...(input.reference ? { referenceFirst: input.reference as PackagingTranslationSource & { sourceKind: 'reference_first' } } : {}),
    },
  };
}

function active(runId: string, fingerprint: string, projectId = PROJECT_ID): ActiveReferenceSource {
  return { schemaVersion: '1.0', projectId, runId, sourceFingerprint: fingerprint, selectedAt: NOW };
}

function lockedTruth(projectId = PROJECT_ID) {
  return {
    lockedAssets: {
      brand: { name: 'Acme Botanicals', locked: true },
      logo: { present: true, usageMode: 'reserved', locked: true },
      productIdentity: { name: 'Hydrating Serum 30ml', locked: true },
      category: { name: 'premium skincare', locked: true },
      structure: { formFactor: 'cylindrical glass bottle with dropper', locked: true },
      mandatoryCopy: { items: ['30ml'], locked: true },
      confirmedComponents: { items: ['dropper', 'cap', 'bottle'], locked: true },
    },
    projectIdentity: {
      projectId, projectName: 'Acme Botanicals', brandName: 'Acme Botanicals',
      industry: 'Skincare', brandRole: 'premium botanical skincare',
      productIdentity: 'Hydrating Serum 30ml',
    },
    analysisContext: { detectedIndustry: 'Skincare', detectedProjectName: 'Acme Botanicals', confidence: 1 },
  };
}

async function buildEvidence(): Promise<Evidence> {
  dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'p3-c3-dual-mode-'));
  const projectRoot = path.join(dataPath, 'projects', PROJECT_ID);
  const referencePath = path.join(projectRoot, 'references', 'serum-reference.png');
  await fs.mkdir(path.dirname(referencePath), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'project.json'), JSON.stringify({ id: PROJECT_ID, projectName: 'Acme Botanicals' }));
  await fs.writeFile(referencePath, PNG_BYTES);

  const analysisSource = source('analysis_led', 'analysis-fp-a', 'Analysis-led botanical restraint.', 'analysis-run-a');
  const referenceA = source('reference_first', 'reference-fp-a', 'Reference-led lacquer and brass contrast.', 'ref-run-a');
  const referenceB = source('reference_first', 'reference-fp-b', 'Reference-led translucent glass and brass.', 'ref-run-b');
  let visual = context({ analysis: analysisSource, reference: referenceA });
  let activeSource: ActiveReferenceSource | null = active('ref-run-a', 'reference-fp-a');
  const selected: Array<{ mode: Mode; sourceKind: Mode; sourceFingerprint: string; concept: string }> = [];
  const prepareInputs: any[] = [];
  const preparedResults: any[] = [];
  const executingStatuses: string[] = [];
  let runCounter = 0;
  let executorCalls = 0;
  let sessionCounter = 0;
  let signalStarted: (() => void) | null = null;
  let releaseExecution: (() => void) | null = null;

  const bridge = createPackagingRunRegistrationAdapter({
    dataPath,
    createRunStore: (root: string, projectId: string) => createRunStore(root, projectId),
    resolveProjectRoot: async () => projectRoot,
    now: () => NOW,
  });
  const downloadImpl = bridge.wrapDownloadImpl(async (input: { targetPath: string; thumbnailPath: string }) => {
    await fs.writeFile(input.targetPath, PNG_BYTES);
    await fs.writeFile(input.thumbnailPath, PNG_BYTES);
    return {
      downloadFailed: false, mimeType: 'image/png', sizeBytes: PNG_BYTES.length,
      sha256: 'a'.repeat(64), decoded: true, written: true, thumbnailWritten: true,
      width: 1, height: 1,
    };
  });
  const store = createPackagingArtifactStore({
    dataPath,
    resolveProjectRoot: async () => projectRoot,
    resolveAssetById: async (_projectId: string, assetId: string) => assetId === 'reference-01'
      ? { name: 'serum-reference.png', mimeType: 'image/png', absolutePath: referencePath }
      : null,
    readFileBytes: (absolutePath: string) => fs.readFile(absolutePath),
    writeJsonSafe: async (absolutePath: string, value: unknown) => {
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, JSON.stringify(value, null, 2));
    },
    ensureDir: (absolutePath: string) => fs.mkdir(absolutePath, { recursive: true }),
    getProjectIdForSession: () => PROJECT_ID,
    downloadImpl,
    registerCanonicalRun: async (_sessionId: string, result: unknown) => {
      await bridge.registerRun({ projectId: PROJECT_ID, packagingResult: result });
    },
    canonicalReadRun: ({ projectId, runId }: { projectId: string; runId: string }) => bridge.readRun({ projectId, runId }),
  });
  const localExecutor = {
    id: MODEL_ID,
    version: 'sanctioned-local@1.0.0',
    protocol: 'seedream-image',
    compileRequest: (input: unknown) => ({
      method: 'POST', url: 'https://local.invalid/packaging',
      headers: { 'Content-Type': 'application/json' }, bodyKind: 'json',
      body: { model: MODEL_ID, input },
    }),
    execute: async () => {
      executorCalls += 1;
      signalStarted?.();
      await new Promise<void>((resolve) => { releaseExecution = resolve; });
      return {
        status: 'succeeded', adapterId: MODEL_ID, modelId: MODEL_ID,
        requestId: `sanctioned-local-${executorCalls}`,
        images: [{ mimeType: 'image/png', b64: PNG_BYTES.toString('base64') }],
      };
    },
  };
  const service = createPackagingWorkspaceService({
    newSessionId: () => `al-session-${++sessionCounter}`,
    now: () => NOW,
    preparePackagingGeneration: (input: unknown) => {
      prepareInputs.push(structuredClone(input));
      const prepared = preparePackagingGeneration(input);
      preparedResults.push(structuredClone(prepared));
      return prepared;
    },
    executePackagingGeneration: (prepared: unknown, deps: Record<string, unknown>) => executePackagingGeneration(prepared, {
      ...deps,
      executor: localExecutor,
      createRunId: () => `pkg-c3-${String(++runCounter).padStart(2, '0')}`,
    }),
  });
  const { operations } = createPackagingOperations({
    service,
    readSettings: async () => ({ profiles: [{
      id: PROFILE_ID, provider: 'volcengine', protocol: 'seedream-image',
      modelId: MODEL_ID, isDefault: true, isEnabled: true,
    }] }),
    readCredentials: async () => ({ apiKey: 'LOCAL_TEST_ONLY', baseUrl: 'https://local.invalid', region: 'beijing' }),
    resolveTruthSnapshot: async (projectId: string, mode = 'analysis_led') => {
      const chosen = selectCanonicalPackagingContext({
        workspaceProjectId: projectId,
        generationMode: mode,
        projectVisualContext: visual,
        activeReferenceSource: activeSource,
      });
      selected.push({
        mode: mode as Mode, sourceKind: chosen.sourceKind, sourceFingerprint: chosen.sourceFingerprint,
        concept: chosen.translation.packagingConcept,
      });
      return { ...lockedTruth(projectId), projectVisualContext: projectSelectedPackagingContextToTruth(chosen) };
    },
    packagingArtifactStore: store,
  });

  async function createSession(mode: Mode) {
    const initialIntent = {
      ...createDefaultPackagingIntent(),
        apiProfileId: PROFILE_ID,
        providerModelId: MODEL_ID,
        generationMode: mode,
        shotContractId: 'PKG-HERO-SINGLE',
        referenceAssignments: mode === 'reference_first'
          ? [{ assetId: 'reference-01', role: 'product_identity_reference', source: 'user' }]
          : [],
    };
    const created = await operations['packaging:create-session'](
      { host: 'node-web' },
      { projectId: PROJECT_ID, initialIntent },
    );
    return created.sessionId;
  }

  async function executeObserved(sessionId: string) {
    let started!: () => void;
    const providerStarted = new Promise<void>((resolve) => { started = resolve; });
    signalStarted = started;
    releaseExecution = null;
    const pending = operations['packaging:execute-generation']({ host: 'node-web' }, { sessionId });
    await providerStarted;
    executingStatuses.push(service.getView(sessionId).status);
    assert.ok(releaseExecution);
    releaseExecution!();
    signalStarted = null;
    return pending;
  }

  const runStore = createRunStore(dataPath, PROJECT_ID);
  const analysisSession = await createSession('analysis_led');
  const analysisReady = await operations['packaging:prepare-generation']({ host: 'node-web' }, analysisSession);
  const analysisPrepare = structuredClone(prepareInputs.at(-1));
  const analysisPrepared = structuredClone(preparedResults.at(-1));
  const analysisExecuted = await executeObserved(analysisSession);
  const analysisRunId = analysisExecuted.view.execution.runId;
  const analysisRun = await runStore.readRun(analysisRunId);
  const analysisRuns = await runStore.listRuns();
  const analysisPreview = await operations['packaging:get-artifact-preview'](
    { host: 'node-web' }, { sessionId: analysisSession, runId: analysisRunId, imageId: 'image-01' },
  );

  const switched = await operations['packaging:update-intent']({ host: 'node-web' }, {
    sessionId: analysisSession,
    patch: {
      generationMode: 'reference_first',
      referenceAssignments: [{ assetId: 'reference-01', role: 'product_identity_reference', source: 'user' }],
    },
  });
  let staleExecuteError: any;
  try { await operations['packaging:execute-generation']({ host: 'node-web' }, { sessionId: analysisSession }); }
  catch (error) { staleExecuteError = error; }
  const referenceReady = await operations['packaging:prepare-generation']({ host: 'node-web' }, analysisSession);
  const referencePrepare = structuredClone(prepareInputs.at(-1));
  const referencePrepared = structuredClone(preparedResults.at(-1));
  const referenceExecuted = await executeObserved(analysisSession);
  const referenceRunId = referenceExecuted.view.execution.runId;
  const referenceRun = await runStore.readRun(referenceRunId);
  const referencePreview = await operations['packaging:get-artifact-preview'](
    { host: 'node-web' }, { sessionId: analysisSession, runId: referenceRunId, imageId: 'image-01' },
  );
  const reverseSwitch = await operations['packaging:update-intent']({ host: 'node-web' }, {
    sessionId: analysisSession,
    patch: { generationMode: 'analysis_led', referenceAssignments: [] },
  });
  const reverseReady = await operations['packaging:prepare-generation']({ host: 'node-web' }, analysisSession);
  const reverseSelected = selected.at(-1);

  visual = context({ reference: referenceA });
  activeSource = active('ref-run-a', 'reference-fp-a');
  const independentSession = await createSession('reference_first');
  const independentReady = await operations['packaging:prepare-generation']({ host: 'node-web' }, independentSession);
  const independentExecuted = await executeObserved(independentSession);
  const independentRunId = independentExecuted.view.execution.runId;
  const independentRun = await runStore.readRun(independentRunId);
  const independentPreview = await operations['packaging:get-artifact-preview'](
    { host: 'node-web' }, { sessionId: independentSession, runId: independentRunId, imageId: 'image-01' },
  );

  visual = context({ reference: referenceB });
  activeSource = active('ref-run-b', 'reference-fp-b');
  const sourceSwitchStale = await operations['packaging:set-truth-snapshot']({ host: 'node-web' }, { sessionId: independentSession });
  let sourceSwitchExecuteError: any;
  try { await operations['packaging:execute-generation']({ host: 'node-web' }, { sessionId: independentSession }); }
  catch (error) { sourceSwitchExecuteError = error; }
  const sourceSwitchReady = await operations['packaging:prepare-generation']({ host: 'node-web' }, independentSession);
  const sourceSwitchSelected = selected.at(-1);
  const sourceSwitchExecuted = await executeObserved(independentSession);
  const sourceSwitchRunId = sourceSwitchExecuted.view.execution.runId;

  const sameSemanticRun = source('reference_first', 'reference-fp-b', 'Reference-led translucent glass and brass.', 'ref-run-b2');
  visual = context({ reference: sameSemanticRun });
  activeSource = active('ref-run-b2', 'reference-fp-b');
  const sameSemantic = await operations['packaging:set-truth-snapshot']({ host: 'node-web' }, { sessionId: independentSession });

  const driftedRun = source('reference_first', 'reference-fp-c', 'Reference-led translucent glass and brass.', 'ref-run-c');
  visual = context({ reference: driftedRun });
  activeSource = active('ref-run-c', 'reference-fp-c');
  const fingerprintDrift = await operations['packaging:set-truth-snapshot']({ host: 'node-web' }, { sessionId: independentSession });

  activeSource = null;
  let revokedError: any;
  try { await operations['packaging:prepare-generation']({ host: 'node-web' }, independentSession); }
  catch (error) { revokedError = error; }

  const canonicalRuns = await runStore.listRuns();
  const safeErrors: any[] = [];
  for (const invoke of [
    () => selectCanonicalPackagingContext({ workspaceProjectId: PROJECT_ID, generationMode: 'reference_first', projectVisualContext: context({ reference: referenceA }), activeReferenceSource: null }),
    () => selectCanonicalPackagingContext({ workspaceProjectId: PROJECT_ID, generationMode: 'reference_first', projectVisualContext: context({ reference: referenceA }), activeReferenceSource: active('ref-run-a', 'wrong-fp') }),
    () => selectCanonicalPackagingContext({ workspaceProjectId: PROJECT_ID, generationMode: 'reference_first', projectVisualContext: context({ reference: referenceA }), activeReferenceSource: active('ref-run-a', 'reference-fp-a', 'project-b') }),
    () => selectCanonicalPackagingContext({ workspaceProjectId: PROJECT_ID, generationMode: 'analysis_led', projectVisualContext: context({ reference: referenceA }), activeReferenceSource: null }),
  ]) {
    try { invoke(); } catch (error) { safeErrors.push(error); }
  }

  return {
    analysis: {
      sessionId: analysisSession, ready: analysisReady, executed: analysisExecuted,
      runId: analysisRunId, run: analysisRun, runs: analysisRuns, preview: analysisPreview,
      prepare: analysisPrepare, prepared: analysisPrepared,
    },
    reference: {
      ready: referenceReady, executed: referenceExecuted, runId: referenceRunId,
      run: referenceRun, preview: referencePreview, prepare: referencePrepare,
      prepared: referencePrepared,
    },
    independent: {
      sessionId: independentSession, ready: independentReady, executed: independentExecuted,
      runId: independentRunId, run: independentRun, preview: independentPreview,
    },
    switches: {
      selected, switched, staleExecuteError, reverseSwitch, reverseReady, reverseSelected,
      sourceSwitchStale, sourceSwitchExecuteError, sourceSwitchReady, sourceSwitchSelected,
      sourceSwitchExecuted, sourceSwitchRunId, sameSemantic, fingerprintDrift, revokedError,
      oldRunId: independentRunId,
    },
    guards: {
      executorCalls, executingStatuses, canonicalRuns, safeErrors,
      runJson: path.join(projectRoot, 'image-generation', analysisRunId, 'run.json'),
      sidecar: path.join(projectRoot, 'image-generation', analysisRunId, 'packaging-generation-result.json'),
      image: path.join(projectRoot, 'image-generation', analysisRunId, 'images', 'image-01.png'),
    },
  };
}

test.before(async () => { evidence = await buildEvidence(); });
test.after(async () => { if (dataPath) await fs.rm(dataPath, { recursive: true, force: true }); });

test('AL-01 analysis_led Prepare reaches READY', () => assert.equal(evidence.analysis.ready.view.status, PACKAGING_WORKSPACE_STATUS.READY));
test('AL-02 analysis_led Execute reaches EXECUTED through observed EXECUTING', () => {
  assert.equal(evidence.guards.executingStatuses[0], PACKAGING_WORKSPACE_STATUS.EXECUTING);
  assert.equal(evidence.analysis.executed.view.status, PACKAGING_WORKSPACE_STATUS.EXECUTED);
});
test('AL-03 analysis_led canonical run is registered and discoverable', () => {
  assert.ok(evidence.analysis.run);
  assert.match(evidence.analysis.runId, /^pkg-/u);
  assert.ok(evidence.analysis.runs.some((run: any) => run.runId === evidence.analysis.runId));
});
test('AL-04 analysis_led preview is available without path disclosure', () => {
  assert.match(evidence.analysis.preview.preview.dataUrl, /^data:image\/png;base64,/u);
  assert.doesNotMatch(JSON.stringify(evidence.analysis.preview), /(?:file:\/\/|[A-Za-z]:\\|runRoot|relativePath)/u);
});
test('AL-05 reference_first independently reaches READY with analysis slot absent', () => assert.equal(evidence.independent.ready.view.status, PACKAGING_WORKSPACE_STATUS.READY));
test('AL-06 reference_first independently reaches EXECUTED through observed EXECUTING', () => {
  assert.equal(evidence.guards.executingStatuses[2], PACKAGING_WORKSPACE_STATUS.EXECUTING);
  assert.equal(evidence.independent.executed.view.status, PACKAGING_WORKSPACE_STATUS.EXECUTED);
});
test('AL-07 reference_first canonical run is registered', () => {
  assert.ok(evidence.independent.run);
  assert.match(evidence.independent.runId, /^pkg-/u);
});
test('AL-08 reference_first preview is available', () => assert.match(evidence.independent.preview.preview.dataUrl, /^data:image\/png;base64,/u));
test('AL-09 both producers coexist and generationMode selects each exact slot', () => {
  assert.ok(evidence.switches.selected.some((entry: any) => entry.sourceKind === 'analysis_led'
    && entry.sourceFingerprint === 'analysis-fp-a'));
  assert.ok(evidence.switches.selected.some((entry: any) => entry.sourceKind === 'reference_first'
    && entry.sourceFingerprint === 'reference-fp-a'));
});
test('AL-10 analysis to reference mode switch causes intent STALE and preserves prior result', () => {
  assert.equal(evidence.switches.switched.view.status, PACKAGING_WORKSPACE_STATUS.STALE);
  assert.deepEqual(evidence.switches.switched.view.staleReasons, ['intent_changed']);
  assert.equal(evidence.switches.switched.view.execution.runId, evidence.analysis.runId);
});
test('AL-11 reference to analysis mode switch re-Prepare selects analysis source', () => {
  assert.equal(evidence.switches.reverseSwitch.view.status, PACKAGING_WORKSPACE_STATUS.STALE);
  assert.deepEqual(evidence.switches.reverseSwitch.view.staleReasons, ['intent_changed']);
  assert.equal(evidence.switches.reverseReady.view.status, PACKAGING_WORKSPACE_STATUS.READY);
  assert.equal(evidence.switches.reverseSelected.sourceKind, 'analysis_led');
});
test('AL-12 active Reference source A to B causes truth STALE', () => {
  assert.equal(evidence.switches.sourceSwitchStale.view.status, PACKAGING_WORKSPACE_STATUS.STALE);
  assert.deepEqual(evidence.switches.sourceSwitchStale.view.staleReasons, ['truth_surface_changed']);
  assert.equal(evidence.switches.sourceSwitchStale.view.execution.runId, evidence.switches.oldRunId);
});
test('AL-13 source fingerprint drift causes truth STALE', () => {
  assert.equal(evidence.switches.fingerprintDrift.view.status, PACKAGING_WORKSPACE_STATUS.STALE);
  assert.deepEqual(evidence.switches.fingerprintDrift.view.staleReasons, ['truth_surface_changed']);
});
test('AL-14 stale Execute fails closed in both mode and source switches', () => {
  assert.ok(evidence.switches.staleExecuteError?.issues?.includes('stale'));
  assert.ok(evidence.switches.sourceSwitchExecuteError?.issues?.includes('truth_surface_changed'));
});
test('AL-15 explicit re-Prepare selects current canonical Reference B', () => {
  assert.equal(evidence.switches.sourceSwitchReady.view.status, PACKAGING_WORKSPACE_STATUS.READY);
  assert.equal(evidence.switches.sourceSwitchSelected.sourceFingerprint, 'reference-fp-b');
});
test('AL-16 second Execute creates a new canonical pkg run', () => {
  assert.equal(evidence.switches.sourceSwitchExecuted.view.status, PACKAGING_WORKSPACE_STATUS.EXECUTED);
  assert.notEqual(evidence.switches.sourceSwitchRunId, evidence.switches.oldRunId);
  assert.ok(evidence.guards.canonicalRuns.some((run: any) => run.runId === evidence.switches.sourceSwitchRunId));
});
test('AL-17 revoked active Reference source fails closed', () => assert.equal(evidence.switches.revokedError?.code, 'PACKAGING_ACTIVE_REFERENCE_SOURCE_MISSING'));
test('AL-18 cross-project active Reference source is rejected', () => assert.equal(evidence.guards.safeErrors[2]?.code, 'PACKAGING_CONTEXT_PROJECT_MISMATCH'));
test('AL-19 selector performs no analysis/reference fallback', () => {
  assert.equal(evidence.guards.safeErrors[0]?.code, 'PACKAGING_ACTIVE_REFERENCE_SOURCE_MISSING');
  assert.equal(evidence.guards.safeErrors[3]?.code, 'PACKAGING_ANALYSIS_SOURCE_UNAVAILABLE');
});
test('AL-20 selector performs no latest-run discovery', () => assert.doesNotMatch(readFileSync(SELECTOR, 'utf8'), /listRuns|readdir|latest|sort\s*\(.*(?:time|run)/iu));
test('AL-21 production context path performs no upstream runtime reasoning', () => assert.doesNotMatch(readFileSync(SELECTOR, 'utf8') + readFileSync(GRAPH, 'utf8'), /analyzeReferenceStyle|responses\.create|chat\.completions|reasoner|anchorGoal/iu));
test('AL-22 selector does not recompute source fingerprint', () => assert.doesNotMatch(readFileSync(SELECTOR, 'utf8'), /createHash|sha256|stableStringify|compute.*fingerprint/iu));
test('AL-23 Locked Assets are identical across modes', () => assert.deepEqual(evidence.analysis.prepare.lockedAssets, evidence.reference.prepare.lockedAssets));
test('AL-24 Shot Contract geometry remains canonical across modes', () => {
  assert.equal(evidence.analysis.prepare.providerHints.aspectRatio, '4:5');
  assert.equal(evidence.reference.prepare.providerHints.aspectRatio, '4:5');
  assert.deepEqual(evidence.analysis.prepare.structure, evidence.reference.prepare.structure);
});
test('AL-25 active Reference source is not auto-inserted into Packaging assignments', () => {
  assert.equal(evidence.analysis.prepared.translation.referencePolicy.references.length, 0);
  assert.equal(evidence.reference.prepared.translation.referencePolicy.references.length, 1);
  assert.equal(evidence.reference.prepared.translation.referencePolicy.references[0].assetId, 'reference-01');
});
test('AL-26 canonical run-store authority and files are retained', async () => {
  assert.ok((await fs.stat(evidence.guards.runJson)).isFile());
  assert.ok((await fs.stat(evidence.guards.sidecar)).isFile());
  assert.ok((await fs.stat(evidence.guards.image)).size > 0);
  assert.equal(evidence.guards.canonicalRuns.length, 4);
});
test('AL-27 preview security and safe application errors are retained', () => {
  const serialized = JSON.stringify([...evidence.guards.safeErrors, evidence.analysis.preview]);
  assert.doesNotMatch(serialized, /(?:[A-Za-z]:\\|file:\/\/|stack|api[_-]?key|credential|LOCAL_TEST_ONLY)/iu);
  assert.deepEqual(evidence.guards.safeErrors.map((error: any) => error.code), [
    'PACKAGING_ACTIVE_REFERENCE_SOURCE_MISSING',
    'PACKAGING_REFERENCE_FINGERPRINT_MISMATCH',
    'PACKAGING_CONTEXT_PROJECT_MISMATCH',
    'PACKAGING_ANALYSIS_SOURCE_UNAVAILABLE',
  ]);
});
test('AL-28 P2 current production diff is zero', () => assert.equal(git(['diff', '--name-only', P2, 'HEAD', '--', 'packages/image-generation-runtime/src/packaging']), ''));
test('AL-29 P3-A current production diff is zero', () => assert.equal(git(['diff', '--name-only', P3A, 'HEAD', '--', 'packages/runtime-core/src/application/packaging']), ''));
test('AL-30 P3-B accepted UI and Workspace semantics are unchanged', () => assert.equal(git(['diff', '--name-only', P3B, 'HEAD', '--', 'apps/web/src/features/packaging', 'packages/runtime-core/src/application/packaging']), ''));
test('AL-31 same-semantic Reference rerun does not create false STALE from producerRunId', () => {
  assert.equal(evidence.switches.sameSemantic.view.status, PACKAGING_WORKSPACE_STATUS.EXECUTED);
  assert.deepEqual(evidence.switches.sameSemantic.view.staleReasons, []);
});
test('AL-32 generation modes retain the same explicit model and API profile', () => {
  assert.equal(evidence.analysis.prepare.modelId, MODEL_ID);
  assert.equal(evidence.reference.prepare.modelId, MODEL_ID);
  assert.equal(evidence.analysis.ready.view.intent.apiProfileId, PROFILE_ID);
  assert.equal(evidence.reference.ready.view.intent.apiProfileId, PROFILE_ID);
});
test('AL-33 canonical run contract does not embed raw upstream Reference objects', () => {
  const run = JSON.stringify(evidence.reference.run);
  assert.doesNotMatch(run, /ReferenceStyleCapsule|activeReferenceSource|producerRunId|sourceFingerprint/u);
});
test('AL-34 no new Packaging context store is introduced', () => assert.doesNotMatch(git(['diff', '--name-only', '456ec3a9d0273b599ed15bcd424fde1f36b8ce1b', 'HEAD']), /packaging.*(?:store|database|cache)|selected-context/iu));
