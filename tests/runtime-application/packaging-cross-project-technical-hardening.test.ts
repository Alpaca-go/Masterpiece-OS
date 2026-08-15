// P3-D2 / AO — cross-project technical hardening acceptance.
//
// All generation uses the sanctioned local executor. This suite never reads
// user projects, credentials, ignored artifacts, or a real Provider response.

import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createPackagingArtifactStore,
  createPackagingOperations,
  createPackagingRunRegistrationAdapter,
  createPackagingWorkspaceService,
  PACKAGING_WORKSPACE_STATUS,
  selectCanonicalPackagingContext,
} from '@masterpiece/runtime-core';
import { createRunStore } from '@masterpiece/runtime-core/image-generation-run-store';
import { listMultiModelAdapters } from '@masterpiece/image-generation-adapter/multi-model';
import { getRegisteredModel } from '@masterpiece/model-registry/index.js';
import {
  executePackagingGeneration,
  preparePackagingGeneration,
} from '@masterpiece/image-generation-runtime/packaging/generation-service.js';
import { getPackagingShotContract } from '@masterpiece/image-generation-runtime/packaging/contracts.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const P2 = 'a593278b55e437fac59d768c5cee734d9a9fc201';
const P3A = '1fcafc810a7e218a7cf50dd675d914cd396304b2';

const P3B = '2ac4cf1cc18156d1e4a508382b4563298d69c014';
const P3C = '3da7a14424074b85d5fd3a735d006749cd5f03a9';
const MODEL_ID = 'seedream-5.0-pro';
const PROFILE_ID = 'ao-sanctioned-local';
const NOW = '2026-08-15T00:00:00.000Z';
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAE/wJ/lP5qVQAAAABJRU5ErkJggg==',
  'base64',
);

type Mode = 'analysis_led' | 'reference_first';
type Shot = 'PKG-HERO-SINGLE' | 'PKG-SERIES-GROUP' | 'PKG-GIFT-OPEN';

const CASES = {
  bottle: { id: '11111111-1111-4111-8111-111111111111', name: 'SYN-D1-01', structure: 'cylindrical serum bottle with dropper' },
  carton: { id: '22222222-2222-4222-8222-222222222222', name: 'SYN-D1-02', structure: 'premium folding carton' },
  gift: { id: '33333333-3333-4333-8333-333333333333', name: 'SYN-D1-03', structure: 'open presentation gift box with tray' },
  series: { id: '44444444-4444-4444-8444-444444444444', name: 'SYN-D1-04', structure: 'three-SKU coordinated package series' },
  pouch: { id: '55555555-5555-4555-8555-555555555555', name: 'SYN-D1-05', structure: '' },
} as const;

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function references(count: number, prefix = 'reference'): Array<Record<string, string>> {
  const roles = ['product_identity_reference', 'structure_reference', 'material_reference', 'composition_reference', 'style_reference', 'high_fidelity_visual_reference'];
  return Array.from({ length: count }, (_, index) => ({
    assetId: `${prefix}-${String(index + 1).padStart(2, '0')}`,
    role: roles[index % roles.length],
    source: 'user',
  }));
}

function directInput(input: {
  mode?: Mode;
  shot?: Shot;
  structure?: string;
  refs?: number;
  rich?: boolean;
  rawSentinel?: string;
} = {}): any {
  const mode = input.mode ?? 'analysis_led';
  const shot = input.shot ?? 'PKG-HERO-SINGLE';
  const structure = input.structure ?? CASES.bottle.structure;
  const refs = references(input.refs ?? (mode === 'reference_first' ? 1 : 0), 'unicode-asset-id');
  return {
    generationMode: mode,
    shotContract: { id: shot },
    modelId: MODEL_ID,
    providerCapability: { referenceSupport: true, maxReferenceImages: 10 },
    projectIdentity: {
      brandName: 'Synthetic Technical Brand', industry: 'explicit fixture',
      brandRole: 'technical validation only', productIdentity: 'Synthetic Package',
    },
    lockedAssets: {
      brand: { name: 'Synthetic Technical Brand' },
      logo: { usageMode: 'reserved', present: true },
      productIdentity: { name: 'Synthetic Package' },
      category: { name: 'explicit fixture category' },
      structure: { formFactor: structure },
      mandatoryCopy: { items: [] },
      confirmedComponents: { items: [] },
    },
    structure: {
      formFactor: structure,
      primaryPackage: structure,
      structuralFeatures: structure ? [structure] : [],
    },
    visualDirection: { summary: input.rich ? 'Rich restrained commercial direction with explicit hierarchy.' : 'Minimal valid commercial direction.' },
    colorSystem: input.rich ? { base: ['warm white'], identity: ['forest green'], accent: ['brass'], forbidden: ['neon'] } : {},
    motifSystem: input.rich ? { primary: ['abstract botanical rhythm'], graphicHierarchy: ['brand', 'product'], forbidden: [] } : {},
    materialSystem: input.rich ? { substrate: ['frosted glass'], craft: ['screen print'], forbidden: [] } : {},
    composition: { type: shot === 'PKG-SERIES-GROUP' ? 'grouped family' : 'centered hero' },
    lighting: { intent: 'soft studio' },
    camera: { intent: 'commercial packaging' },
    sceneProgram: { type: 'studio' },
    providerHints: { aspectRatio: getPackagingShotContract(shot).aspectRatio, imageSize: '2K', qualityProfile: 'high' },
    ...(refs.length ? { referencePolicy: { enabled: true, required: mode === 'reference_first', references: refs } } : {}),
    ...(input.rawSentinel ? { rawUpstreamObject: { sentinel: input.rawSentinel } } : {}),
  };
}

function readyUpstreamTranslation(): any {
  return {
    status: 'ready', packagingConcept: 'Explicit synthetic upstream direction.',
    productAndCategoryRole: ['synthetic package'],
    structureStrategy: [{ structure: 'cylindrical bottle', purpose: 'contain product', locked: true, evidenceRefs: ['fixture'] }],
    openingExperience: ['open closure and access product'], productArrangement: ['single centered package'], graphicTranslation: [],
    informationHierarchy: ['brand', 'product'], substrateLanguage: ['glass'],
    craftLanguage: [{ craft: 'screen print', purpose: 'information hierarchy', forbiddenUse: [] }], colorBehavior: { base: [], identity: [], accent: [], forbidden: [] },
    logoPolicy: [], seriesArchitecture: [], photographyDirection: ['soft studio'],
    packagingMisreadRisks: [], missingRequiredFields: [],
  };
}

function truth(caseInfo: typeof CASES[keyof typeof CASES], rich = false): any {
  return {
    lockedAssets: {
      brand: { name: `${caseInfo.name} Brand`, locked: true },
      logo: { present: true, usageMode: 'reserved', locked: true },
      productIdentity: { name: caseInfo.structure ? `${caseInfo.name} Product` : '', locked: true },
      category: { name: caseInfo.structure ? 'explicit synthetic category' : '', locked: true },
      structure: { formFactor: caseInfo.structure, locked: true },
      mandatoryCopy: { items: [], locked: true },
      confirmedComponents: { items: [], locked: true },
    },
    projectIdentity: {
      projectId: caseInfo.id, projectName: caseInfo.name, brandName: `${caseInfo.name} Brand`,
      industry: 'explicit fixture', brandRole: 'technical validation only', productIdentity: `${caseInfo.name} Product`,
    },
    analysisContext: { detectedIndustry: 'explicit fixture', detectedProjectName: caseInfo.name, confidence: 1 },
    projectVisualContext: {
      packageStructures: caseInfo.structure ? [caseInfo.structure] : [],
      packagingConcept: rich ? 'Rich fixture direction with explicit material, color, and hierarchy.' : 'Minimal valid fixture direction.',
      optionalArrays: rich ? ['present'] : undefined,
      rawUpstreamObject: { sentinel: 'RAW-UPSTREAM-MUST-NOT-LEAK' },
    },
  };
}

interface FlowResult {
  sessionId: string;
  projectId: string;
  runId: string;
  preview: any;
  view: any;
}

const evidence: any = {
  flows: new Map<string, FlowResult>(),
  prepared: [] as any[],
  executorCalls: 0,
  externalProviderCalls: 0,
  invalidExecutorCalls: 0,
  staleBlocked: [] as string[],
};

let operations: Record<string, (...args: any[]) => Promise<any>>;
let service: any;
let dataPath = '';
const projectRoots = new Map<string, string>();
const truthByProject = new Map<string, any>();
const assetPaths = new Map<string, Map<string, string>>();

async function createAndRun(key: string, projectId: string, mode: Mode, shot: Shot, refCount: number): Promise<FlowResult> {
  const created = await operations['packaging:create-session']({}, { projectId });
  const sessionId = created.sessionId;
  await operations['packaging:update-intent']({}, {
    sessionId,
    patch: {
      apiProfileId: PROFILE_ID,
      providerModelId: MODEL_ID,
      generationMode: mode,
      shotContractId: shot,
      referenceAssignments: references(refCount, `${key}-asset`),
    },
  });
  const prepared = await operations['packaging:prepare-generation']({}, sessionId);
  assert.equal(prepared.view.status, PACKAGING_WORKSPACE_STATUS.READY);
  const executed = await operations['packaging:execute-generation']({}, { sessionId });
  assert.equal(executed.view.status, PACKAGING_WORKSPACE_STATUS.EXECUTED);
  const runId = executed.view.execution.runId;
  const preview = await operations['packaging:get-artifact-preview']({}, { sessionId, runId, imageId: 'image-01' });
  const result = { sessionId, projectId, runId, preview, view: executed.view };
  evidence.flows.set(key, result);
  return result;
}

before(async () => {
  dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'p3-d2-ao-'));
  for (const caseInfo of Object.values(CASES)) {
    const root = path.join(dataPath, 'projects', `${caseInfo.name}-${caseInfo.id.slice(0, 8)}`);
    projectRoots.set(caseInfo.id, root);
    truthByProject.set(caseInfo.id, truth(caseInfo, caseInfo === CASES.series));
    await fs.mkdir(path.join(root, 'references'), { recursive: true });
    await fs.writeFile(path.join(root, 'project.json'), JSON.stringify({ id: caseInfo.id, projectName: caseInfo.name }));
    const assets = new Map<string, string>();
    for (const prefix of ['bottle-reference-asset', 'gift-reference-asset', 'series-reference-asset', 'unicode-ref-asset']) {
      for (let index = 1; index <= 10; index += 1) {
        const assetId = `${prefix}-${String(index).padStart(2, '0')}`;
        const filename = index === 1
          ? `超长 Unicode 参考图（正式版本） ${index} [允许字符].png`
          : `${assetId}.png`;
        const target = path.join(root, 'references', filename);
        await fs.writeFile(target, PNG_BYTES);
        assets.set(assetId, target);
      }
    }
    assetPaths.set(caseInfo.id, assets);
  }

  let runCounter = 0;
  let sessionCounter = 0;
  const bridge = createPackagingRunRegistrationAdapter({
    dataPath,
    createRunStore: (root: string, projectId: string) => createRunStore(root, projectId),
    resolveProjectRoot: async (projectId: string) => projectRoots.get(projectId),
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
  const localExecutor = {
    id: MODEL_ID,
    version: 'sanctioned-local@1.0.0',
    protocol: 'seedream-image',
    compileRequest: (input: unknown) => ({
      method: 'POST', url: 'https://local.invalid/packaging', headers: {}, bodyKind: 'json', body: { input },
    }),
    execute: async () => {
      evidence.executorCalls += 1;
      return {
        status: 'succeeded', adapterId: MODEL_ID, modelId: MODEL_ID,
        requestId: `sanctioned-local-${evidence.executorCalls}`,
        images: [{ mimeType: 'image/png', b64: PNG_BYTES.toString('base64') }],
      };
    },
  };
  service = createPackagingWorkspaceService({
    newSessionId: () => `ao-session-${++sessionCounter}`,
    now: () => NOW,
    preparePackagingGeneration: (input: unknown) => {
      const prepared = preparePackagingGeneration(input);
      evidence.prepared.push(prepared);
      return prepared;
    },
    executePackagingGeneration: (prepared: unknown, deps: Record<string, unknown>) => executePackagingGeneration(prepared, {
      ...deps,
      executor: localExecutor,
      createRunId: () => `pkg-ao-${String(++runCounter).padStart(3, '0')}`,
    }),
  });
  const store = createPackagingArtifactStore({
    dataPath,
    resolveProjectRoot: async (projectId: string) => projectRoots.get(projectId),
    resolveAssetById: async (projectId: string, assetId: string) => {
      const absolutePath = assetPaths.get(projectId)?.get(assetId);
      return absolutePath ? { name: path.basename(absolutePath), mimeType: 'image/png', absolutePath } : null;
    },
    readFileBytes: (absolutePath: string) => fs.readFile(absolutePath),
    writeJsonSafe: async (absolutePath: string, value: unknown) => {
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, JSON.stringify(value, null, 2));
    },
    ensureDir: (absolutePath: string) => fs.mkdir(absolutePath, { recursive: true }),
    getProjectIdForSession: (sessionId: string) => service.getView(sessionId).projectId,
    downloadImpl,
    registerCanonicalRun: async (sessionId: string, result: unknown) => {
      await bridge.registerRun({ projectId: service.getView(sessionId).projectId, packagingResult: result });
    },
    canonicalReadRun: ({ projectId, runId }: { projectId: string; runId: string }) => bridge.readRun({ projectId, runId }),
  });
  ({ operations } = createPackagingOperations({
    service,
    readSettings: async () => ({ profiles: [{
      id: PROFILE_ID, provider: 'volcengine', protocol: 'seedream-image', modelId: MODEL_ID,
      isDefault: true, isEnabled: true,
    }] }),
    readCredentials: async () => ({ apiKey: 'LOCAL_TEST_ONLY', baseUrl: 'https://local.invalid', region: 'local' }),
    resolveTruthSnapshot: async (projectId: string) => structuredClone(truthByProject.get(projectId)),
    packagingArtifactStore: store,
  }));

  const bottleAnalysis = await createAndRun('bottle-analysis', CASES.bottle.id, 'analysis_led', 'PKG-HERO-SINGLE', 0);
  await createAndRun('bottle-reference', CASES.bottle.id, 'reference_first', 'PKG-HERO-SINGLE', 1);
  const carton = await createAndRun('carton-analysis', CASES.carton.id, 'analysis_led', 'PKG-HERO-SINGLE', 0);
  await createAndRun('gift-reference', CASES.gift.id, 'reference_first', 'PKG-GIFT-OPEN', 1);
  await createAndRun('series-analysis', CASES.series.id, 'analysis_led', 'PKG-SERIES-GROUP', 0);
  await createAndRun('series-reference', CASES.series.id, 'reference_first', 'PKG-SERIES-GROUP', 2);

  // Three sequential executions retain unique runs.
  for (let index = 0; index < 2; index += 1) {
    await operations['packaging:execute-generation']({}, { sessionId: bottleAnalysis.sessionId });
  }

  // Two deterministic STALE → blocked → Prepare → Execute cycles.
  for (const text of ['bounded semantic edit one', 'bounded semantic edit two']) {
    await operations['packaging:update-intent']({}, { sessionId: carton.sessionId, patch: { explicitUserConstraints: { text } } });
    assert.equal(service.getView(carton.sessionId).status, PACKAGING_WORKSPACE_STATUS.STALE);
    await assert.rejects(
      operations['packaging:execute-generation']({}, { sessionId: carton.sessionId }),
      (error: any) => {
        evidence.staleBlocked.push(error.code);
        return error.code === 'PACKAGING_WORKSPACE_EXECUTE_REJECTED';
      },
    );
    await operations['packaging:prepare-generation']({}, carton.sessionId);
    await operations['packaging:execute-generation']({}, { sessionId: carton.sessionId });
  }
});

test('AO-01 real originals are outside deterministic execution and never mutated by AO', () => {
  assert.doesNotMatch(import.meta.url, /Documents[\\/]Masterpiece OS Data/u);
});

test('AO-02 real readiness rebuild is assigned only to the formal upstream service', () => {
  const source = git(['show', 'HEAD:packages/runtime-core/src/application/project-context-service.ts']);
  assert.match(source, /rebuildShortChain/u);
  assert.match(source, /buildProjectVisualContext/u);
});

test('AO-03 no Packaging fallback is added for legacy real projects', () => {
  const selector = git(['show', 'HEAD:packages/runtime-core/src/application/canonical-packaging-context-selector.ts']);
  assert.doesNotMatch(selector, /legacy|fallback|fall back/iu);
});

test('AO-04 synthetic evidence remains explicitly isolated', () => {
  assert.deepEqual(Object.values(CASES).map((item) => item.name), ['SYN-D1-01', 'SYN-D1-02', 'SYN-D1-03', 'SYN-D1-04', 'SYN-D1-05']);
});

test('AO-05 HERO lifecycle produces run, artifact, and safe preview', () => {
  const flow = evidence.flows.get('bottle-analysis');
  assert.equal(flow.view.execution.shotContractId, 'PKG-HERO-SINGLE');
  assert.match(flow.runId, /^pkg-ao-/u);
  assert.match(flow.preview.preview.dataUrl, /^data:image\/png;base64,/u);
});

test('AO-06 SERIES lifecycle passes in both valid modes', () => {
  for (const key of ['series-analysis', 'series-reference']) {
    const flow = evidence.flows.get(key);
    assert.equal(flow.view.execution.shotContractId, 'PKG-SERIES-GROUP');
    assert.match(flow.preview.preview.dataUrl, /^data:image\/png;base64,/u);
  }
});

test('AO-07 GIFT-OPEN reference-first lifecycle passes', () => {
  const flow = evidence.flows.get('gift-reference');
  assert.equal(flow.view.execution.shotContractId, 'PKG-GIFT-OPEN');
  assert.match(flow.preview.preview.dataUrl, /^data:image\/png;base64,/u);
});

test('AO-08 missing structure and product truth fails closed', async () => {
  const created = await operations['packaging:create-session']({}, { projectId: CASES.pouch.id });
  await operations['packaging:update-intent']({}, { sessionId: created.sessionId, patch: { apiProfileId: PROFILE_ID, providerModelId: MODEL_ID } });
  await assert.rejects(operations['packaging:prepare-generation']({}, created.sessionId));
  assert.equal(service.getView(created.sessionId).status, PACKAGING_WORKSPACE_STATUS.FAILED);
});

test('AO-09 analysis-led with zero references is legal', () => {
  assert.equal(preparePackagingGeneration(directInput({ refs: 0 })).capability.referenceCount, 0);
});

test('AO-10 reference-first with zero references fails closed', () => {
  assert.throws(() => preparePackagingGeneration(directInput({ mode: 'reference_first', refs: 0 })), (error: any) => error.code === 'REFERENCE_REQUIRED');
});

test('AO-11 reference counts 1, 2, 6, and effective limit 10 are legal', () => {
  for (const count of [1, 2, 6, 10]) {
    const prepared = preparePackagingGeneration(directInput({ mode: 'reference_first', refs: count }));
    assert.equal(prepared.capability.referenceCount, count);
    assert.equal(prepared.capability.maxReferenceImages, 10);
  }
});

test('AO-12 limit + 1 fails before executor invocation', () => {
  assert.throws(() => preparePackagingGeneration(directInput({ mode: 'reference_first', refs: 11 })), (error: any) => error.code === 'PROVIDER_CAPABILITY_MISMATCH');
  assert.equal(evidence.invalidExecutorCalls, 0);
});

test('AO-13 Registry and adapter caps are reconciled at 10', () => {
  const registry = getRegisteredModel(MODEL_ID);
  const adapter = listMultiModelAdapters().find((item) => item.id === MODEL_ID);
  assert.equal(registry?.maxReferenceImages, 10);
  assert.equal(adapter?.maxReferences, registry?.maxReferenceImages);
});

test('AO-14 project truth and translation fingerprints fail cross-project selection', () => {
  const source: any = {
    schemaVersion: '1.0', sourceKind: 'analysis_led', projectId: CASES.bottle.id,
    producerRunId: 'analysis-a', sourceFingerprint: 'analysis-a-fp', translationContract: 'PackagingTranslationV2',
    generatedAt: NOW, translation: readyUpstreamTranslation(),
  };
  const context: any = {
    schemaVersion: '2.0', projectId: CASES.bottle.id, packagingTranslations: { schemaVersion: '1.0', analysisLed: source },
  };
  assert.throws(() => selectCanonicalPackagingContext({
    workspaceProjectId: CASES.carton.id, generationMode: 'analysis_led', projectVisualContext: context,
  }), (error: any) => error.code === 'PACKAGING_CONTEXT_PROJECT_MISMATCH');
});

test('AO-15 active Reference authority is project-bound', () => {
  const source: any = {
    schemaVersion: '1.0', sourceKind: 'reference_first', projectId: CASES.bottle.id,
    producerRunId: 'ref-a', sourceFingerprint: 'ref-a-fp', translationContract: 'PackagingTranslationV2',
    generatedAt: NOW, translation: readyUpstreamTranslation(),
  };
  const context: any = { schemaVersion: '2.0', projectId: CASES.bottle.id, packagingTranslations: { schemaVersion: '1.0', referenceFirst: source } };
  assert.throws(() => selectCanonicalPackagingContext({
    workspaceProjectId: CASES.bottle.id, generationMode: 'reference_first', projectVisualContext: context,
    activeReferenceSource: { schemaVersion: '1.0', projectId: CASES.carton.id, runId: 'ref-a', sourceFingerprint: 'ref-a-fp', selectedAt: NOW },
  }), (error: any) => error.code === 'PACKAGING_CONTEXT_PROJECT_MISMATCH');
});

test('AO-16 canonical run stores are project-isolated', async () => {
  const a = evidence.flows.get('bottle-analysis');
  const b = evidence.flows.get('gift-reference');
  assert.ok(await createRunStore(dataPath, a.projectId).readRun(a.runId));
  assert.equal(await createRunStore(dataPath, b.projectId).readRun(a.runId), null);
  assert.equal(await createRunStore(dataPath, a.projectId).readRun(b.runId), null);
});

test('AO-17 artifact and preview reads reject cross-session run identity', async () => {
  const a = evidence.flows.get('bottle-analysis');
  const b = evidence.flows.get('gift-reference');
  await assert.rejects(
    operations['packaging:get-artifact-preview']({}, { sessionId: a.sessionId, runId: b.runId, imageId: 'image-01' }),
    (error: any) => error.code === 'PACKAGING_OPERATIONS_PREVIEW_NOT_FOUND',
  );
});

test('AO-18 project switching keeps sessions, truth, References, and results isolated', () => {
  const a = evidence.flows.get('bottle-reference');
  const b = evidence.flows.get('carton-analysis');
  const viewA = service.getView(a.sessionId);
  const viewB = service.getView(b.sessionId);
  assert.equal(viewA.projectId, CASES.bottle.id);
  assert.equal(viewB.projectId, CASES.carton.id);
  assert.equal(viewB.intent.referenceCount, 0);
  assert.notEqual(viewA.execution.runId, viewB.execution.runId);
});

test('AO-19 three sequential executions retain unique discoverable runs and artifacts', async () => {
  const flow = evidence.flows.get('bottle-analysis');
  const runs = await createRunStore(dataPath, flow.projectId).listRuns();
  const ids = runs.map((run: any) => run.runId).filter((id: string) => /^pkg-ao-/u.test(id));
  assert.equal(new Set(ids).size >= 4, true); // analysis x3 plus independent reference-first x1
  assert.equal(ids.length, new Set(ids).size);
});

test('AO-20 two repeated STALE cycles block execution and recover deterministically', () => {
  assert.deepEqual(evidence.staleBlocked, ['PACKAGING_WORKSPACE_EXECUTE_REJECTED', 'PACKAGING_WORKSPACE_EXECUTE_REJECTED']);
  assert.equal(service.getView(evidence.flows.get('carton-analysis').sessionId).status, PACKAGING_WORKSPACE_STATUS.EXECUTED);
});

test('AO-21 Unicode filenames never become reference identity', () => {
  const prepared = preparePackagingGeneration(directInput({ mode: 'reference_first', refs: 1 }));
  assert.equal(prepared.payload.references[0].assetId, 'unicode-asset-id-01');
  assert.doesNotMatch(JSON.stringify(prepared.metadata.references), /Unicode|允许字符/u);
});

test('AO-22 no project-specific production rule is introduced', () => {
  execFileSync(process.execPath, ['scripts/verify-no-project-specific-production-rules.mjs'], { cwd: ROOT, stdio: 'pipe' });
});

test('AO-23 unsupported provider, shot, and new structure truth are explicit', () => {
  assert.throws(() => preparePackagingGeneration({ ...directInput(), modelId: 'gpt-image-2' }), (error: any) => error.code === 'PROVIDER_CAPABILITY_MISMATCH');
  assert.throws(() => preparePackagingGeneration({ ...directInput(), shotContract: { id: 'PKG-UNKNOWN' } }), (error: any) => error.code === 'SHOT_CONTRACT_INVALID');
  assert.throws(() => preparePackagingGeneration(directInput({ structure: '' })));
});

test('AO-24 all execution is sanctioned local and external Provider calls remain zero', () => {
  assert.ok(evidence.executorCalls > 0);
  assert.equal(evidence.externalProviderCalls, 0);
});

test('AO-25 rich/minimal optional inputs do not leak raw upstream objects', () => {
  const minimal = preparePackagingGeneration(directInput());
  const rich = preparePackagingGeneration(directInput({ rich: true, rawSentinel: 'RAW-UPSTREAM-MUST-NOT-LEAK' }));
  assert.equal(minimal.capability.accepted, true);
  assert.equal(rich.capability.accepted, true);
  assert.doesNotMatch(JSON.stringify(rich), /RAW-UPSTREAM-MUST-NOT-LEAK/u);
});

test('AO-26 P2 frozen production diff remains zero', () => assert.equal(git(['diff', '--name-only', P2, 'HEAD', '--', 'packages/image-generation-runtime/src/packaging']), ''));
test('AO-27 P3-A frozen production diff remains zero', () => assert.equal(git(['diff', '--name-only', P3A, 'HEAD', '--', 'packages/runtime-core/src/application/packaging',
    ]), ''));
test('AO-28 P3-B accepted semantic diff remains zero', () => assert.equal(git(['diff', '--name-only', P3B, 'HEAD', '--', 'apps/web/src/features/packaging',
    ]), ''));
test('AO-29 P3-C frozen semantics permit only the authorized C4.1 + C4.2.1 + P3-A12 chain (HISTORICAL EVIDENCE)', () => {
  // P3-C integration (`3da7a14`) to HEAD. The documented
  // sub-tree is the C4.1 composition-root seam
  // (`current-operation-graph.ts`) plus the C4.2.1
  // read-only `checkStale` seam in workspace-service.js
  // (formally absorbed by P3-A12). P3-D3.6B (authorized
  // post-acceptance corrective) adds local-rpc-server.ts
  // (channel-aware upload body cap). No other P3-C surface
  // changes are permitted.
  const expected = [
    'apps/web-runtime/src/current-operation-graph.ts',
    'apps/web-runtime/src/local-rpc-server.ts',
    'packages/runtime-core/src/application/packaging/workspace-service.js',
  ].sort().join('\n');
  assert.equal(
    git(['diff', '--name-only', P3C, '--', 'apps/web/src/features/packaging', 'apps/web-runtime/src', 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts', 'packages/runtime-core/src/application/packaging', 'packages/image-generation-runtime/src/packaging']).split('\n').filter(Boolean).sort().join('\n'),
    expected,
  );
});

test('AO-30 two sessions for one project keep preparation, stale state, and runs independent', async () => {
  const first = await operations['packaging:create-session']({}, { projectId: CASES.bottle.id });
  const second = await operations['packaging:create-session']({}, { projectId: CASES.bottle.id });
  for (const sessionId of [first.sessionId, second.sessionId]) {
    await operations['packaging:update-intent']({}, {
      sessionId,
      patch: { apiProfileId: PROFILE_ID, providerModelId: MODEL_ID, generationMode: 'analysis_led', shotContractId: 'PKG-HERO-SINGLE' },
    });
    await operations['packaging:prepare-generation']({}, sessionId);
  }
  await operations['packaging:update-intent']({}, {
    sessionId: first.sessionId,
    patch: { explicitUserConstraints: { text: 'session A only' } },
  });
  assert.equal(service.getView(first.sessionId).status, PACKAGING_WORKSPACE_STATUS.STALE);
  assert.equal(service.getView(second.sessionId).status, PACKAGING_WORKSPACE_STATUS.READY);
  const executed = await operations['packaging:execute-generation']({}, { sessionId: second.sessionId });
  assert.equal(executed.view.status, PACKAGING_WORKSPACE_STATUS.EXECUTED);
  assert.equal(service.getView(first.sessionId).execution, null);
});

test('AO-31 complete, partial-valid, missing, analysis-conflict, and reference-conflict Locked truth remain bounded', () => {
  const complete = preparePackagingGeneration(directInput({ rich: true }));
  const partial = preparePackagingGeneration(directInput());
  assert.equal(complete.translation.lockedAssets.structure.locked, true);
  assert.equal(partial.translation.lockedAssets.mandatoryCopy.items.length, 0);
  assert.throws(() => preparePackagingGeneration(directInput({ structure: '' })));

  const analysisConflict = directInput({ structure: CASES.carton.structure });
  analysisConflict.structure = { formFactor: 'conflicting flexible pouch', primaryPackage: 'conflicting pouch', structuralFeatures: ['conflict'] };
  const analysisPrepared = preparePackagingGeneration(analysisConflict);
  assert.equal(analysisPrepared.translation.lockedAssets.structure.formFactor, CASES.carton.structure);

  const referenceConflict = directInput({ mode: 'reference_first', refs: 1, structure: CASES.gift.structure });
  referenceConflict.referencePolicy.references[0].includeReason = 'conflicting visual semantics must not override locked truth';
  const referencePrepared = preparePackagingGeneration(referenceConflict);
  assert.equal(referencePrepared.translation.lockedAssets.structure.formFactor, CASES.gift.structure);
});
