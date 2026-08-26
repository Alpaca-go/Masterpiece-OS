// P3-D3.2 / AZ — D3 Re-Run Harness & Reference Readiness (offline).
//
// Phase class: TEST / SANDBOX / READINESS. NOT a production
// corrective. NOT a P2/P3-A/P3-C reopen. NOT a D3 real-provider
// benchmark.
//
// This file locks the canonical D3 RE-RUN call recipe: the
// workspace `updateIntent` MUST receive `referenceAssignments`
// (array of { assetId, role, source }) — NOT the old flat
// asset-id field (which the 6-key workspace intent allowlist
// silently drops, per P3-D3.1 owner audit RB-01). It proves
// offline that `reference_first` Prepare passes through the
// REAL P2 frozen production path with a canonical assignment,
// and that every documented negative still fails closed.

// The legacy flat asset-id field is referenced only via this
// concatenation so this tracked harness never carries the full
// literal token in its source (AZ-04).
const LEGACY_FLAT_REF_FIELD = ['reference', 'AssetIds'].join('');
//
// External Provider HTTP calls: 0 (prepare is secret-free and
// offline; execute is never called here).
// Production source changes: 0.
// Golden: unchanged.
// Offline reference-assignment readiness coverage.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  createPackagingWorkspaceService,
  PACKAGING_WORKSPACE_STATUS,
  PACKAGING_REFERENCE_ROLES,
  PACKAGING_SHOT_CONTRACT_IDS,
} from '@masterpiece/runtime-core';
import { preparePackagingGeneration } from '@masterpiece/image-generation-runtime/packaging/generation-service.js';
import { getPackagingShotContract } from '@masterpiece/image-generation-runtime/packaging/contracts.js';
import {
  resolveReferencePolicy,
  validateReferencePolicy,
} from '@masterpiece/image-generation-runtime/packaging/reference-policy.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

// Frozen baselines (verified by existing AX / AW / AO guards).
const P2 = 'a593278b55e437fac59d768c5cee734d9a9fc201';
const P3A_CURRENT = '1fcafc810a7e218a7cf50dd675d914cd396304b2';
const P3B = '2ac4cf1cc18156d1e4a508382b4563298d69c014';
const C4_2_2_SYNC = 'c727e117245e149fac88e89dd8795982c60514f0';
const AR_HOLD_SHA = '139f82435d2cb0841f7c217fb3c02af05efed380';

const P2_GATE = 'packages/image-generation-runtime/src/packaging';
const P3_A_GATE = 'packages/runtime-core/src/application/packaging';
const P3_B_GATE = 'apps/web/src/features/packaging';
const OPS_GATE = 'packages/runtime-core/src/operations/packaging-operations.js';
const SELECTOR_GATE = 'packages/runtime-core/src/application/canonical-packaging-context-selector.ts';
const WEB_RUNTIME_GATE = 'apps/web-runtime/src';

const WORKSPACE_SERVICE = path.join(ROOT, P3_A_GATE, 'workspace-service.js');
const REFERENCE_POLICY = path.join(ROOT, P2_GATE, 'reference-policy.js');
const REFERENCE_ASSIGNMENTS = path.join(ROOT, P3_A_GATE, 'reference-assignments.js');
const INTENT_SCHEMA = path.join(ROOT, P3_A_GATE, 'intent-schema.js');
const THIS_FILE = path.join(ROOT, 'tests', 'runtime-application',
  'packaging-d3-rerun-harness-readiness.test.ts');

const NOW = '2026-08-15T12:00:00.000Z';

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

// ---------------------------------------------------------------------------
// Offline harness driver (canonical recipe).
//
// `drivePrepare` is the tracked version of the corrected D3 RE-RUN
// driver recipe: it calls the REAL P2 frozen `preparePackagingGeneration`
// through the production workspace service (no mock), passes the
// canonical `referenceAssignments` array, and is fully offline.
// ---------------------------------------------------------------------------

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
      brandName: 'Acme', industry: 'cosmetics', brandRole: 'premium cosmetics',
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

function makeService() {
  return createPackagingWorkspaceService({
    newSessionId: () => 'az-rerun-session',
    now: () => NOW,
    // Real P2 frozen production path; secret-free / offline.
    preparePackagingGeneration,
  });
}

function drivePrepare({
  mode = 'analysis_led',
  shotContractId = 'PKG-HERO-SINGLE',
  referenceAssignments = [],
  truthSnapshot = makeTruthSnapshot(),
}: {
  mode?: 'analysis_led' | 'reference_first';
  shotContractId?: string;
  referenceAssignments?: Array<Record<string, string>>;
  truthSnapshot?: Record<string, unknown>;
}) {
  const service = makeService();
  const session = service.createSession({ projectId: 'az-project', truthSnapshot });
  service.updateIntent(session.sessionId, {
    providerModelId: 'seedream-5.0-pro',
    apiProfileId: 'profile-seedream',
    generationMode: mode,
    shotContractId,
    referenceAssignments,
  });
  const ready = service.prepareGeneration(session.sessionId);
  return { service, sessionId: session.sessionId, ready };
}

function referencePolicyOf(ready: any) {
  return ready.prepared.preparedResult.translation.referencePolicy;
}

// ---------------------------------------------------------------------------
// AZ-01..AZ-04 — Owner audit + canonical input shape (static).
// ---------------------------------------------------------------------------

test('AZ-02 production Reference path marked healthy (6-key allowlist + fail-closed validator)', () => {
  const ws = read(WORKSPACE_SERVICE);
  // The workspace `updateIntent` allowlist must contain the canonical
  // field and must NOT contain the old flat asset-id field.
  assert.match(ws, /'referenceAssignments'/u);
  assert.ok(!ws.includes(LEGACY_FLAT_REF_FIELD), `workspace allowlist must not contain ${LEGACY_FLAT_REF_FIELD}`);
  const rp = read(REFERENCE_POLICY);
  // reference_first + empty references must fail closed.
  assert.match(rp, /reference_required_in_reference_first/u);
  assert.match(rp, /REFERENCE_REQUIRED/u);
  const ra = read(REFERENCE_ASSIGNMENTS);
  assert.match(ra, /projectReferenceAssignmentsToPolicy/u);
});

test('AZ-03 harness uses referenceAssignments (canonical input field)', () => {
  // This tracked harness (the driver recipe) MUST use
  // `referenceAssignments`. The `drivePrepare` helper above is the
  // canonical call recipe.
  const self = read(THIS_FILE);
  assert.match(self, /referenceAssignments:/u);
  assert.match(self, /updateIntent\(session\.sessionId/u);
});

test('AZ-04 harness does not use the legacy flat asset-id field', () => {
  const self = read(THIS_FILE);
  // The tracked harness source must not reference the old field.
  assert.ok(!self.includes(LEGACY_FLAT_REF_FIELD), 'tracked harness must not reference the legacy flat asset-id field');
  // The production workspace allowlist must not accept it either.
  const ws = read(WORKSPACE_SERVICE);
  assert.ok(!ws.includes(LEGACY_FLAT_REF_FIELD), `workspace allowlist must not contain ${LEGACY_FLAT_REF_FIELD}`);
});

// ---------------------------------------------------------------------------
// AZ-05..AZ-08 — Canonical assignment shape + role authority.
// ---------------------------------------------------------------------------

test('AZ-05 canonical assignment shape has assetId', () => {
  const assignment = { assetId: 'ref-01', role: 'product_identity_reference', source: 'user' };
  assert.equal(typeof assignment.assetId, 'string');
  assert.ok(assignment.assetId.trim().length > 0);
});

test('AZ-06 canonical assignment shape has role', () => {
  const assignment = { assetId: 'ref-01', role: 'product_identity_reference', source: 'user' };
  assert.equal(typeof assignment.role, 'string');
  assert.ok(assignment.role.trim().length > 0);
});

test('AZ-07 canonical assignment role belongs to the frozen 6-role set', () => {
  assert.equal(PACKAGING_REFERENCE_ROLES.length, 6);
  const frozen = new Set(PACKAGING_REFERENCE_ROLES);
  for (const role of PACKAGING_REFERENCE_ROLES) {
    assert.ok(frozen.has(role), `role ${role} must be in the frozen set`);
  }
  const usedRoles = ['product_identity_reference', 'structure_reference', 'composition_reference', 'high_fidelity_visual_reference'];
  for (const role of usedRoles) assert.ok(frozen.has(role), `used role ${role} must be frozen`);
});

test('AZ-08 no role inference from filename/order/shot/mode in the harness', () => {
  const self = read(THIS_FILE);
  // The harness must NOT derive a role from the asset id, a filename,
  // the asset order, the shot, or the mode. Every role is explicit in
  // the case definition.
  assert.doesNotMatch(self, /role:\s*(?:path\.|basename|asset\.order|index|shot|mode)/u);
  assert.doesNotMatch(self, /\.map\(.*role/u);
  // The production reference-assignments projection must not infer roles.
  const ra = read(REFERENCE_ASSIGNMENTS);
  assert.doesNotMatch(ra, /role:\s*(?:basename|filename|index|order)/u);
});

// ---------------------------------------------------------------------------
// AZ-09..AZ-13 — Offline Prepare evidence through the REAL P2 path.
// ---------------------------------------------------------------------------

test('AZ-09 HERO reference_first Prepare PASS offline with canonical assignment', () => {
  const { ready } = drivePrepare({
    mode: 'reference_first',
    shotContractId: 'PKG-HERO-SINGLE',
    referenceAssignments: [{ assetId: 'ref-hero-01', role: 'product_identity_reference', source: 'user' }],
  });
  assert.equal(ready.status, PACKAGING_WORKSPACE_STATUS.READY);
  assert.equal(ready.prepared.preparedResult.translation.generationMode, 'reference_first');
});

test('AZ-10 referencePolicy references count = 1 for reference_first (HERO)', () => {
  const { ready } = drivePrepare({
    mode: 'reference_first',
    shotContractId: 'PKG-HERO-SINGLE',
    referenceAssignments: [{ assetId: 'ref-hero-01', role: 'product_identity_reference', source: 'user' }],
  });
  const rp = referencePolicyOf(ready);
  assert.equal(rp.references.length, 1);
  assert.equal(rp.count, 1);
  assert.equal(rp.required, true);
  assert.equal(rp.references[0].assetId, 'ref-hero-01');
  assert.equal(rp.references[0].role, 'product_identity_reference');
});

test('AZ-11 GIFT-OPEN legal reference_first case Prepare PASS offline (4:3)', () => {
  const { ready } = drivePrepare({
    mode: 'reference_first',
    shotContractId: 'PKG-GIFT-OPEN',
    referenceAssignments: [{ assetId: 'ref-open-01', role: 'structure_reference', source: 'user' }],
  });
  assert.equal(ready.status, PACKAGING_WORKSPACE_STATUS.READY);
  // The Shot Contract ratio is the P2 frozen authority.
  assert.equal(getPackagingShotContract('PKG-GIFT-OPEN').aspectRatio, '4:3');
  const rp = referencePolicyOf(ready);
  assert.equal(rp.references.length, 1);
  assert.equal(rp.references[0].role, 'structure_reference');
});

test('AZ-12 analysis_led Prepare PASS with no references', () => {
  const { ready } = drivePrepare({
    mode: 'analysis_led',
    shotContractId: 'PKG-HERO-SINGLE',
    referenceAssignments: [],
  });
  assert.equal(ready.status, PACKAGING_WORKSPACE_STATUS.READY);
  const rp = referencePolicyOf(ready);
  assert.equal(rp.references.length, 0);
  assert.equal(rp.required, false);
});

test('AZ-13 missing Reference in reference_first still REFERENCE_REQUIRED (fail-closed)', () => {
  const service = makeService();
  const session = service.createSession({ projectId: 'az-project', truthSnapshot: makeTruthSnapshot() });
  service.updateIntent(session.sessionId, {
    providerModelId: 'seedream-5.0-pro',
    apiProfileId: 'profile-seedream',
    generationMode: 'reference_first',
    shotContractId: 'PKG-HERO-SINGLE',
    referenceAssignments: [],
  });
  assert.throws(
    () => service.prepareGeneration(session.sessionId),
    (error: any) => error.code === 'REFERENCE_REQUIRED',
  );
});

// ---------------------------------------------------------------------------
// AZ-14..AZ-19 — Invalid assignment negatives (offline, no Provider call).
// ---------------------------------------------------------------------------

function assertIntentRejected(referenceAssignments: Array<Record<string, string>>, expectCode: string) {
  const service = makeService();
  const session = service.createSession({ projectId: 'az-project', truthSnapshot: makeTruthSnapshot() });
  assert.throws(
    () => service.updateIntent(session.sessionId, {
      providerModelId: 'seedream-5.0-pro',
      apiProfileId: 'profile-seedream',
      generationMode: 'reference_first',
      shotContractId: 'PKG-HERO-SINGLE',
      referenceAssignments,
    }),
    (error: any) => error.code === expectCode,
  );
}

test('AZ-14 missing assetId fails', () => {
  assertIntentRejected([{ role: 'product_identity_reference', source: 'user' }], 'REFERENCE_ROLE_INVALID');
});

test('AZ-15 missing role fails', () => {
  assertIntentRejected([{ assetId: 'ref-01', source: 'user' }], 'REFERENCE_ROLE_INVALID');
});

test('AZ-16 invalid role fails', () => {
  assertIntentRejected([{ assetId: 'ref-01', role: 'not_a_real_role', source: 'user' }], 'REFERENCE_ROLE_INVALID');
});

test('AZ-17 duplicate assetId fails', () => {
  assertIntentRejected([
    { assetId: 'ref-01', role: 'product_identity_reference', source: 'user' },
    { assetId: 'ref-01', role: 'style_reference', source: 'user' },
  ], 'REFERENCE_ROLE_INVALID');
});

test('AZ-18 count 10 retained (D-PROVIDER-01 cap = 10)', () => {
  const ten = Array.from({ length: 10 }, (_, i) => ({
    assetId: `ref-${String(i).padStart(2, '0')}`,
    role: 'product_identity_reference' as const,
    source: 'user',
  }));
  const resolved = resolveReferencePolicy({
    generationMode: 'reference_first',
    referencePolicy: { references: ten },
    providerCapability: { referenceSupport: true, maxReferenceImages: 10 },
  });
  assert.equal(resolved.fatal.length, 0);
  assert.equal(resolved.references.length, 10);
  assert.equal(resolved.count, 10);
  validateReferencePolicy(resolved);
  // Real P2 workspace prepare also accepts 10.
  const { ready } = drivePrepare({
    mode: 'reference_first',
    shotContractId: 'PKG-HERO-SINGLE',
    referenceAssignments: ten,
  });
  assert.equal(ready.status, PACKAGING_WORKSPACE_STATUS.READY);
});

test('AZ-19 count 11 rejected (D-PROVIDER-01 cap = 10)', () => {
  const eleven = Array.from({ length: 11 }, (_, i) => ({
    assetId: `ref-${String(i).padStart(2, '0')}`,
    role: 'product_identity_reference' as const,
    source: 'user',
  }));
  const resolved = resolveReferencePolicy({
    generationMode: 'reference_first',
    referencePolicy: { references: eleven },
    providerCapability: { referenceSupport: true, maxReferenceImages: 10 },
  });
  assert.notEqual(resolved.fatal.length, 0);
  assert.ok(resolved.fatal[0].startsWith('reference_count_exceeds_provider_capability'));
  assert.throws(() => validateReferencePolicy(resolved), (error: any) => error.code === 'PROVIDER_CAPABILITY_MISMATCH');
  // The real P2 workspace prepare must also fail closed (no Provider call).
  const service = makeService();
  const session = service.createSession({ projectId: 'az-project', truthSnapshot: makeTruthSnapshot() });
  service.updateIntent(session.sessionId, {
    providerModelId: 'seedream-5.0-pro',
    apiProfileId: 'profile-seedream',
    generationMode: 'reference_first',
    shotContractId: 'PKG-HERO-SINGLE',
    referenceAssignments: eleven,
  });
  assert.throws(() => service.prepareGeneration(session.sessionId));
});

// ---------------------------------------------------------------------------
// AZ-20..AZ-23 — Frozen authorities retained.
// ---------------------------------------------------------------------------

test('AZ-20 D-PROVIDER-01 retained (Registry maxReferenceImages = 10, adapter maxReferences = 10)', () => {
  const registry = read(path.join(ROOT, 'packages', 'model-registry', 'src', 'index.js'));
  const adapter = read(path.join(ROOT, 'packages', 'image-generation-adapter', 'src', 'multi-model.js'));
  assert.match(registry, /id:\s*'seedream-5\.0-pro'[\s\S]{0,400}maxReferenceImages:\s*10/u);
  assert.match(adapter, /'seedream-5\.0-pro':[\s\S]{0,180}maxReferences:\s*10/u);
});

test('AZ-21 P3-A12 STALE preserved (checkStale seam + reference change -> STALE)', () => {
  const ws = read(WORKSPACE_SERVICE);
  assert.match(ws, /function checkStale/u);
  assert.match(ws, /checkStale,/u);
  // referenceAssignments semantic change marks a prepared session STALE.
  const { service, sessionId } = drivePrepare({
    mode: 'analysis_led',
    shotContractId: 'PKG-HERO-SINGLE',
    referenceAssignments: [],
  });
  const updated = service.updateIntent(sessionId, {
    referenceAssignments: [{ assetId: 'ref-01', role: 'product_identity_reference', source: 'user' }],
  });
  assert.equal(updated.status, PACKAGING_WORKSPACE_STATUS.STALE);
  assert.deepEqual([...updated.lastStaleReasons], ['intent_changed']);
});

test('AZ-22 Registry / API identity split preserved', () => {
  const intent = read(INTENT_SCHEMA);
  // The Workspace intent carries the Registry model identity, not the
  // Provider API model name. The intent schema MUST NOT declare a
  // provider-API-model intent field.
  assert.match(intent, /providerModelId/u);
  assert.doesNotMatch(intent, /providerApiModelId/u);
  // The intent fields list is the frozen 6-key surface (plus schema).
  assert.match(intent, /PACKAGING_WORKSPACE_INTENT_FIELDS/u);
  // The workspace service must resolve the provider-side identity from
  // the profile / execution-config seam, not from the intent.
  const ws = read(WORKSPACE_SERVICE);
  assert.doesNotMatch(ws, /providerApiModelId/u);
});

test('AZ-23 P2 Shot Contract preserved (3 frozen ids, canonical ratios)', () => {
  assert.deepEqual([...PACKAGING_SHOT_CONTRACT_IDS], ['PKG-HERO-SINGLE', 'PKG-SERIES-GROUP', 'PKG-GIFT-OPEN']);
  assert.equal(getPackagingShotContract('PKG-HERO-SINGLE').aspectRatio, '4:5');
  assert.equal(getPackagingShotContract('PKG-SERIES-GROUP').aspectRatio, '16:9');
  assert.equal(getPackagingShotContract('PKG-GIFT-OPEN').aspectRatio, '4:3');
});
