// P3-A11 — AG Translation Completeness corrective guards.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  createPackagingWorkspaceService,
  createPackagingOperations,
  PACKAGING_WORKSPACE_STATUS,
} from '@masterpiece/runtime-core';
import { preparePackagingGeneration } from '@masterpiece/image-generation-runtime/packaging/generation-service.js';
import {
  PACKAGING_SHOT_CONTRACT_IDS,
  getPackagingShotContract,
} from '@masterpiece/image-generation-runtime/packaging/contracts.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const WORKSPACE_SERVICE = path.join(
  ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'workspace-service.js',
);
const OPERATION_GRAPH = path.join(ROOT, 'apps', 'web-runtime', 'src', 'current-operation-graph.ts');
const CURRENT_P2_BASELINE = 'a593278b55e437fac59d768c5cee734d9a9fc201';
const NOW = '2026-08-14T00:00:00.000Z';

function makeTruthSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    lockedAssets: {
      brand: { name: 'Acme', locked: true },
      logo: { present: true, usageMode: 'reserved', locked: true },
      productIdentity: { name: 'Acme Bottle', locked: true },
      category: { name: 'cosmetics', locked: true },
      structure: { formFactor: 'cylindrical glass bottle', locked: true },
      mandatoryCopy: { items: [], locked: true },
      confirmedComponents: { items: [], locked: true },
    },
    projectIdentity: {
      brandName: 'Acme',
      industry: 'cosmetics',
      brandRole: 'premium cosmetics',
      productIdentity: 'Acme Bottle',
    },
    analysisContext: {},
    projectVisualContext: {
      packageStructures: ['cylindrical body', 'dropper closure'],
      packagingConcept: 'Precise botanical care expressed through restrained material contrast.',
    },
    ...overrides,
  };
}

function prepareRoute({
  mode = 'analysis_led',
  shotContractId = 'PKG-HERO-SINGLE',
  truthSnapshot = makeTruthSnapshot(),
}: {
  mode?: 'analysis_led' | 'reference_first';
  shotContractId?: string;
  truthSnapshot?: Record<string, unknown>;
} = {}) {
  let received: any = null;
  const service = createPackagingWorkspaceService({
    newSessionId: () => `ag-${mode}-${shotContractId}`,
    now: () => NOW,
    preparePackagingGeneration(input: any) {
      received = structuredClone(input);
      return preparePackagingGeneration(input);
    },
  });
  const session = service.createSession({ projectId: 'ag-project', truthSnapshot });
  service.updateIntent(session.sessionId, {
    providerModelId: 'seedream-5.0-pro',
    apiProfileId: 'profile-seedream',
    generationMode: mode,
    shotContractId,
    referenceAssignments: mode === 'reference_first'
      ? [{ assetId: 'asset-reference-01', role: 'product_identity_reference', source: 'user' }]
      : [],
  });
  const ready = service.prepareGeneration(session.sessionId);
  return { service, sessionId: session.sessionId, ready, received };
}

test('AG-01 A10 model projection is retained', () => {
  const { received } = prepareRoute();
  assert.equal(received.modelId, 'seedream-5.0-pro');
});

test('AG-02 structure formFactor projects the canonical Locked Asset truth', () => {
  const { received } = prepareRoute();
  assert.equal(received.structure.formFactor, received.lockedAssets.structure.formFactor);
  assert.equal(received.structure.formFactor, 'cylindrical glass bottle');
});

test('AG-03 structuralFeatures project real Project Visual Context packageStructures', () => {
  const { received } = prepareRoute();
  assert.deepEqual(received.structure.structuralFeatures, ['cylindrical body', 'dropper closure']);
  assert.notEqual(received.structure.structuralFeatures[0], received.structure.formFactor);
});

test('AG-04 aspectRatio projects the canonical P2 Shot Contract for every shot', () => {
  for (const shotContractId of PACKAGING_SHOT_CONTRACT_IDS) {
    const { received } = prepareRoute({ shotContractId });
    assert.equal(
      received.providerHints.aspectRatio,
      getPackagingShotContract(shotContractId).aspectRatio,
    );
  }
});

test('AG-05 visualDirection.summary projects Project Visual Context packagingConcept', () => {
  const { received } = prepareRoute();
  assert.equal(
    received.visualDirection.summary,
    makeTruthSnapshot().projectVisualContext.packagingConcept,
  );
});

test('AG-06 complete production projection passes the real P2 validator/compiler', () => {
  const { ready } = prepareRoute();
  assert.equal(ready.status, PACKAGING_WORKSPACE_STATUS.READY);
  assert.equal(ready.prepared.preparedResult.translation.target, 'packaging');
  assert.ok(ready.prepared.preparedResult.compiled.blocks.length > 0);
});

test('AG-07 analysis_led production Prepare reaches READY', () => {
  assert.equal(prepareRoute({ mode: 'analysis_led' }).ready.status, PACKAGING_WORKSPACE_STATUS.READY);
});

test('AG-08 reference_first production Prepare reaches READY with explicit Reference truth', () => {
  const { ready, received } = prepareRoute({ mode: 'reference_first' });
  assert.equal(ready.status, PACKAGING_WORKSPACE_STATUS.READY);
  assert.equal(received.referencePolicy.references.length, 1);
});

test('AG-09 missing canonical structure formFactor fails closed', () => {
  const truth = makeTruthSnapshot();
  truth.lockedAssets.structure.formFactor = '';
  assert.throws(
    () => prepareRoute({ truthSnapshot: truth }),
    (error: any) => error?.issues?.includes('structure_form_factor_missing')
      && error.issues.includes('locked_assets_structure_form_factor_missing'),
  );
});

test('AG-10 missing structuralFeatures fails closed without filler evidence', () => {
  const truth = makeTruthSnapshot();
  truth.projectVisualContext.packageStructures = [];
  assert.throws(
    () => prepareRoute({ truthSnapshot: truth }),
    (error: any) => error?.issues?.includes('structure_evidence_missing'),
  );
});

test('AG-11 missing packagingConcept fails closed without a visual summary default', () => {
  const truth = makeTruthSnapshot();
  truth.projectVisualContext.packagingConcept = '';
  assert.throws(
    () => prepareRoute({ truthSnapshot: truth }),
    (error: any) => error?.issues?.includes('visual_direction_summary_missing'),
  );
});

test('AG-12 invalid Shot Contract is rejected by the existing intent/contract authority', () => {
  assert.throws(
    () => prepareRoute({ shotContractId: 'PKG-UNKNOWN' }),
    (error: any) => error?.code === 'SHOT_CONTRACT_INVALID'
      && error?.issues?.includes('unknown_shot_contract_id:PKG-UNKNOWN'),
  );
});

test('AG-13 no hardcoded geometry, formFactor, feature, or visual-direction fallback exists', () => {
  const source = readFileSync(WORKSPACE_SERVICE, 'utf8');
  assert.match(source, /getPackagingShotContract\(intent\.shotContractId\)/u);
  assert.match(source, /aspectRatio:\s*shotContract\.aspectRatio/u);
  assert.doesNotMatch(source, /(?:4:5|16:9|4:3)/u);
  assert.doesNotMatch(source, /premium packaging render|packaging structure['"]/iu);
  assert.doesNotMatch(source, /structuralFeatures:\s*\[["']/u);
});

test('AG-14 Project Visual Context drift uses the existing truth fingerprint stale mechanism', () => {
  const { service, sessionId } = prepareRoute();
  const changedTruth = makeTruthSnapshot();
  changedTruth.projectVisualContext.packagingConcept = 'A changed canonical packaging concept.';
  const stale = service.setTruthSnapshot(sessionId, changedTruth);
  assert.equal(stale.status, PACKAGING_WORKSPACE_STATUS.STALE);
  assert.deepEqual([...stale.lastStaleReasons], ['truth_surface_changed']);
});

test('AG-15 Web only composes existing context truth', () => {
  const source = readFileSync(OPERATION_GRAPH, 'utf8');
  assert.match(source, /projectContext\.getShortChain\(safeId\)/u);
  assert.doesNotMatch(source, /(?:4:5|16:9|4:3)/u);
});

test('AG-16 Local RPC operation registry reaches real P2 Prepare and returns READY', async () => {
  const service = createPackagingWorkspaceService({
    newSessionId: () => 'ag-local-rpc',
    now: () => NOW,
  });
  const { operations } = createPackagingOperations({
    service,
    resolveTruthSnapshot: async () => makeTruthSnapshot(),
    readSettings: async () => ({ apiProfiles: [] }),
    readCredentials: async () => ({}),
    packagingArtifactStore: {
      saveRun: async () => undefined,
      resolveArtifactLifecycle: async () => ({}),
      readReference: async () => ({}),
      readArtifactPreview: async () => null,
    },
  });
  const created = await operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'ag-project' },
  );
  await operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        providerModelId: 'seedream-5.0-pro',
        apiProfileId: 'profile-seedream',
      },
    },
  );
  const prepared = await operations['packaging:prepare-generation'](
    { host: 'node-web' },
    created.sessionId,
  );
  assert.equal(prepared.view.status, PACKAGING_WORKSPACE_STATUS.READY);
  assert.equal(prepared.view.error, null);
});
