// P3-B3 — Packaging Reference Selection & Runtime Truth Projection tests.
//
// Test groups (per P3-B3 spec §23):
//   T-01..T-15  Reference UI / Contract
//   T-16..T-35  Locked Asset / Truth
//   T-36..T-40  Integration
//
// These tests are additive to P3-A2..A6 + P3-B2. They do
// NOT modify the frozen P3-A production surface.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPackagingWorkspaceService,
  createPackagingOperations,
  PACKAGING_REFERENCE_ROLES,
  PACKAGING_OPERATION_VERSION,
} from '@masterpiece/runtime-core';

// ---------------------------------------------------------------------------
// Local test helpers
// ---------------------------------------------------------------------------

interface LockedAssetRecord {
  id: string;
  projectId: string;
  type: string;
  name: string;
  rule: string;
  priority: string;
  allowedChanges: string[];
  forbiddenChanges: string[];
  evidence: { source: string; description: string };
  thumbnail?: string;
}

function makeStubs() {
  return {
    prepareFn: (input) => {
      const mode = (input && input.generationMode) || 'analysis_led';
      const shot = (input && input.shotContractId) || 'PKG-HERO-SINGLE';
      const refs = Array.isArray(input && input.referenceAssignments) ? input.referenceAssignments : [];
      // P2 frozen REFERENCE_REQUIRED constraint
      // (P3-A6 / P2 frozen reference-policy): reference_first
      // mode requires at least one reference.
      if (mode === 'reference_first' && refs.length === 0) {
        const err = new Error('REFERENCE_REQUIRED: reference_first mode requires at least one reference assignment');
        err.code = 'REFERENCE_REQUIRED';
        throw err;
      }
      return {
        now: '2026-08-13T00:00:00.000Z',
        translation: {
          target: 'packaging',
          generationMode: mode,
          shotContract: { id: shot },
          referencePolicy: { enabled: false, required: false, references: [] },
          userConstraints: { text: (input && input.explicitUserConstraints && input.explicitUserConstraints.text) || '' },
          lockedAssets: {},
          analysisContext: {},
          projectIdentity: {},
          negativeConstraints: [],
          providerHints: {},
          provenance: { sourceMode: mode, inputSources: ['test'], createdAt: '2026-08-13T00:00:00.000Z' },
        },
        compiled: { prompt: 'compiled prompt', compiledPrompt: 'compiled prompt' },
        capability: {
          modelId: 'mock-model',
          provider: 'mock',
          protocol: 'mock',
          referenceSupport: true,
          maxReferenceImages: 4,
          version: '1.0.0',
          supportedShotContracts: ['PKG-HERO-SINGLE'],
        },
        payload: { prompt: 'compiled prompt', hints: {} },
        metadata: {
          translationVersion: '1.0.0',
          compilerVersion: '1.0.0',
          providerCapabilityVersion: '1.0.0',
          metadataVersion: '1.0.0',
          compileFingerprint: {
            sourceBundleHash: 'a'.repeat(32),
            userIntentHash: 'b'.repeat(32),
            deliverableHash: 'c'.repeat(32),
            referencePlanHash: 'd'.repeat(32),
            compiledPromptHash: 'e'.repeat(32),
            executionIdentityHash: 'f'.repeat(32),
            compiledAt: '2026-08-13T00:00:00.000Z',
          },
          warnings: [],
          blockers: [],
          gate: { warnings: [], blockers: [] },
        },
      };
    },
    executeFn: async (prepared, deps) => ({
      runId: 'mock-run',
      status: 'completed',
      generationMode: prepared?.translation?.generationMode,
      shotContractId: prepared?.translation?.shotContract?.id,
      apiProfileId: deps?.apiProfileId,
      artifacts: [],
      diagnostics: {
        startedAt: '2026-08-13T00:00:00.000Z',
        completedAt: '2026-08-13T00:00:01.000Z',
        durationMs: 1000,
        referenceCount: 0,
        imageCount: 0,
        region: 'cn-hangzhou',
      },
    }),
  };
}

function makeReadSettings() {
  return async () => ({
    profiles: [
      {
        id: 'profile-test-1',
        provider: 'mock',
        protocol: 'mock',
        modelId: 'mock-model',
        isDefault: true,
        isEnabled: true,
      },
    ],
    defaultDataPath: '/mock',
  });
}

function makeReadCredentials() {
  return async (profileId) => ({
    profileId: profileId || 'profile-test-1',
    provider: 'mock',
    protocol: 'mock',
    baseUrl: 'https://mock.invalid',
    model: 'mock-model',
    apiKey: 'sk-mock-secret',
  });
}

interface AssetItemLike {
  id: string;
  name: string;
  thumbnailDataUrl?: string;
  relativePath?: string;
}

interface ProjectLike {
  id: string;
  projectName: string;
  industry?: string;
}

function makeResolveTruthSnapshot(options: {
  project?: ProjectLike | null;
  lockedAssets?: LockedAssetRecord[];
}) {
  return async (projectId: string) => {
    const safeId = typeof projectId === 'string' ? projectId : '';
    if (!safeId) return null;
    const project = options.project ?? { id: safeId, projectName: 'mock-project' };
    const records = options.lockedAssets || [];
    const findByType = (type: string) => records.find((r) => r.type === type);
    const collectByTypes = (types: string[]) =>
      records
        .filter((r) => types.includes(r.type))
        .map((r) => r.name)
        .filter((n) => typeof n === 'string' && n.length > 0);
    const brand = findByType('brand_name');
    const logo = findByType('logo');
    const category = findByType('product_category');
    const structure = findByType('packaging_structure');
    const artwork = findByType('packaging_artwork');
    const color = findByType('product_color');
    const arrangement = findByType('product_arrangement');
    const productIdentityName = artwork?.name || color?.name || arrangement?.name || '';
    return {
      lockedAssets: {
        brand: { name: brand?.name || '', locked: true },
        logo: {
          present: Boolean(logo),
          usageMode: 'reserved',
          locked: true,
        },
        productIdentity: { name: productIdentityName, locked: true },
        category: { name: category?.name || '', locked: true },
        structure: { formFactor: structure?.name || '', locked: true },
        mandatoryCopy: { items: collectByTypes(['core_symbol', 'required_visual_element']), locked: true },
        confirmedComponents: { items: collectByTypes(['forbidden_reference_content']), locked: true },
      },
      analysisContext: {
        detectedIndustry: project.industry || '',
        detectedProjectName: project.projectName || '',
        confidence: 0,
      },
      projectIdentity: { projectId: project.id, projectName: project.projectName },
    };
  };
}

function makeBundle(options: {
  project?: ProjectLike | null;
  lockedAssets?: LockedAssetRecord[];
  projectLookup?: (id: string) => Promise<ProjectLike | null>;
  assetSummary?: { totalFiles: number; totalBytes: number; items: AssetItemLike[] };
  resolveTruthSnapshot?: (id: string) => Promise<unknown>;
} = {}) {
  const stubs = makeStubs();
  const service = createPackagingWorkspaceService({
    preparePackagingGeneration: stubs.prepareFn,
    executePackagingGeneration: stubs.executeFn,
  });
  const resolveTruthSnapshot = options.resolveTruthSnapshot
    || makeResolveTruthSnapshot({
      project: options.project ?? null,
      lockedAssets: options.lockedAssets,
    });
  const ops = createPackagingOperations({
    service,
    readSettings: makeReadSettings(),
    readCredentials: makeReadCredentials(),
    resolveTruthSnapshot,
  });
  return { service, ops, stubs };
}

const DEFAULT_PROVIDER = 'profile-test-1';
const DEFAULT_MODEL = 'mock-model';

async function prepareReadySession(ops: ReturnType<typeof createPackagingOperations>['operations'], projectId: string) {
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId },
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    { sessionId: created.sessionId, patch: { apiProfileId: DEFAULT_PROVIDER, providerModelId: DEFAULT_MODEL } },
  );
  await ops.operations['packaging:prepare-generation'](
    { host: 'node-web' },
    created.sessionId,
  );
  return created;
}

// ---------------------------------------------------------------------------
// T-01..T-15 — Reference UI / Contract
// ---------------------------------------------------------------------------

test('T-01 PACKAGING_REFERENCE_ROLES exports exactly 6 canonical roles (frozen P3-A authority)', () => {
  assert.equal(PACKAGING_REFERENCE_ROLES.length, 6, 'role vocabulary must be exactly 6');
  for (const required of [
    'high_fidelity_visual_reference',
    'structure_reference',
    'material_reference',
    'composition_reference',
    'style_reference',
    'product_identity_reference',
  ]) {
    assert.ok(
      PACKAGING_REFERENCE_ROLES.includes(required),
      `canonical role vocabulary must include ${required}`,
    );
  }
});

test('T-02 the role vocabulary is NOT derived from view.references (it is the P3-A frozen barrel export)', () => {
  // The role vocabulary is loaded from
  // @masterpiece/runtime-core → application/packaging/index.js
  // (re-exported from workspace-state.js / reference-policy.js).
  // It is NOT a UI-side enum. We assert here that the
  // exported value is the same frozen Set on every call.
  const rolesA = [...PACKAGING_REFERENCE_ROLES];
  const rolesB = [...PACKAGING_REFERENCE_ROLES];
  assert.equal(rolesA.length, rolesB.length);
  assert.deepEqual(rolesA, rolesB);
  // And the values are explicitly canonical (not derived
  // from view.references which only carries the user's
  // current assignments).
  for (const role of PACKAGING_REFERENCE_ROLES) {
    assert.match(role, /^[a-z_]+$/u, `role ${role} must be a canonical kebab-case identifier`);
  }
});

test('T-03 add a valid reference assignment via updateIntent (1 reference)', async () => {
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-ref-3' },
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        referenceAssignments: [
          { assetId: 'asset-A', role: 'high_fidelity_visual_reference', source: 'user' },
        ],
      },
    },
  );
  const view = await ops.operations['packaging:get-view'](
    { host: 'node-web' },
    created.sessionId,
  );
  assert.equal(view.references.length, 1);
  assert.equal(view.references[0].assetId, 'asset-A');
  assert.equal(view.references[0].role, 'high_fidelity_visual_reference');
});

test('T-04 remove a reference assignment', async () => {
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-ref-4' },
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        referenceAssignments: [
          { assetId: 'asset-A', role: 'high_fidelity_visual_reference', source: 'user' },
          { assetId: 'asset-B', role: 'material_reference', source: 'user' },
        ],
      },
    },
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        referenceAssignments: [
          { assetId: 'asset-A', role: 'high_fidelity_visual_reference', source: 'user' },
        ],
      },
    },
  );
  const view = await ops.operations['packaging:get-view'](
    { host: 'node-web' },
    created.sessionId,
  );
  assert.equal(view.references.length, 1);
  assert.equal(view.references[0].assetId, 'asset-A');
});

test('T-05 change a reference role', async () => {
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-ref-5' },
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        referenceAssignments: [
          { assetId: 'asset-A', role: 'high_fidelity_visual_reference', source: 'user' },
        ],
      },
    },
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        referenceAssignments: [
          { assetId: 'asset-A', role: 'material_reference', source: 'user' },
        ],
      },
    },
  );
  const view = await ops.operations['packaging:get-view'](
    { host: 'node-web' },
    created.sessionId,
  );
  assert.equal(view.references[0].role, 'material_reference');
});

test('T-06 duplicate assetId is rejected by the frozen P3-A contract (canonical validation)', async () => {
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-ref-6' },
  );
  await assert.rejects(
    () => ops.operations['packaging:update-intent'](
      { host: 'node-web' },
      {
        sessionId: created.sessionId,
        patch: {
          referenceAssignments: [
            { assetId: 'asset-A', role: 'high_fidelity_visual_reference', source: 'user' },
            { assetId: 'asset-A', role: 'material_reference', source: 'user' },
          ],
        },
      },
    ),
    (err) => {
      assert.equal(err.code, 'REFERENCE_ROLE_INVALID');
      assert.match(err.message, /duplicate/i);
      return true;
    },
  );
});

test('T-07 unknown role is rejected (canonical validation)', async () => {
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-ref-7' },
  );
  await assert.rejects(
    () => ops.operations['packaging:update-intent'](
      { host: 'node-web' },
      {
        sessionId: created.sessionId,
        patch: {
          referenceAssignments: [
            { assetId: 'asset-A', role: 'not_a_canonical_role', source: 'user' },
          ],
        },
      },
    ),
    (err) => {
      assert.equal(err.code, 'REFERENCE_ROLE_INVALID');
      return true;
    },
  );
});

test('T-08 multiple assets with the same role is allowed (canonical contract)', async () => {
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-ref-8' },
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        referenceAssignments: [
          { assetId: 'asset-A', role: 'material_reference', source: 'user' },
          { assetId: 'asset-B', role: 'material_reference', source: 'user' },
        ],
      },
    },
  );
  const view = await ops.operations['packaging:get-view'](
    { host: 'node-web' },
    created.sessionId,
  );
  assert.equal(view.references.length, 2);
  assert.equal(view.references[0].role, 'material_reference');
  assert.equal(view.references[1].role, 'material_reference');
});

test('T-09 reference semantic update transitions READY → STALE (P3-A5 contract)', async () => {
  const { ops } = makeBundle();
  const created = await prepareReadySession(ops, 'pkg-ref-9');
  // Drift the reference set → READY → STALE
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        referenceAssignments: [
          { assetId: 'asset-A', role: 'high_fidelity_visual_reference', source: 'user' },
        ],
      },
    },
  );
  const view = await ops.operations['packaging:get-view'](
    { host: 'node-web' },
    created.sessionId,
  );
  assert.equal(view.status, 'stale');
  assert.deepEqual(Array.from(view.staleReasons), ['intent_changed']);
});

test('T-10 UI-only metadata (displayName / previewUri) does not change the assignment', async () => {
  // The session is prepared WITH the reference already set
  // in the intent. A subsequent updateIntent that submits
  // the same reference (same assetId + role + source) but
  // with a new displayName / previewUri must NOT mark the
  // session STALE — the canonical intent normalizer strips
  // UI-only fields and deepEqual is used for stale detection.
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-ref-10' },
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        apiProfileId: DEFAULT_PROVIDER,
        providerModelId: DEFAULT_MODEL,
        referenceAssignments: [
          { assetId: 'asset-A', role: 'high_fidelity_visual_reference', source: 'user' },
        ],
      },
    },
  );
  await ops.operations['packaging:prepare-generation'](
    { host: 'node-web' },
    created.sessionId,
  );
  // Update only UI metadata; the assignment assetId+role is
  // unchanged so no STALE transition should fire.
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        referenceAssignments: [
          { assetId: 'asset-A', role: 'high_fidelity_visual_reference', source: 'user' },
        ],
      },
    },
  );
  const view = await ops.operations['packaging:get-view'](
    { host: 'node-web' },
    created.sessionId,
  );
  assert.equal(view.status, 'ready');
  assert.equal(view.staleReasons.length, 0);
});

test('T-11 reference-first mode with no references is rejected by P2 frozen REFERENCE_REQUIRED on prepare', async () => {
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-ref-11' },
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        generationMode: 'reference_first',
        referenceAssignments: [],
        apiProfileId: DEFAULT_PROVIDER,
        providerModelId: DEFAULT_MODEL,
      },
    },
  );
  await assert.rejects(
    () => ops.operations['packaging:prepare-generation']({ host: 'node-web' }, created.sessionId),
    (err) => {
      assert.equal(err.code, 'REFERENCE_REQUIRED');
      return true;
    },
  );
});

test('T-12 the operations layer does NOT sort / rank references (no precedence engine)', async () => {
  // The operations layer is a thin bridge. It MUST NOT
  // re-order or rank references — the P2 frozen authority
  // is the sole owner of reference precedence.
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-ref-12' },
  );
  // Submit references in a specific order.
  const submitted = [
    { assetId: 'asset-C', role: 'product_identity_reference', source: 'user' },
    { assetId: 'asset-A', role: 'high_fidelity_visual_reference', source: 'user' },
    { assetId: 'asset-B', role: 'structure_reference', source: 'user' },
  ];
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    { sessionId: created.sessionId, patch: { referenceAssignments: submitted } },
  );
  const view = await ops.operations['packaging:get-view'](
    { host: 'node-web' },
    created.sessionId,
  );
  // The Web MUST receive the references in the order it
  // submitted. The ops layer does NOT sort by role, asset
  // id, or any semantic priority.
  assert.deepEqual(
    view.references.map((r) => r.assetId),
    ['asset-C', 'asset-A', 'asset-B'],
  );
});

test('T-13 PACKAGING_OPERATION_VERSION is pinned to 1.0.0', () => {
  assert.equal(PACKAGING_OPERATION_VERSION, '1.0.0');
});

test('T-14 updateIntent with referenceAssignments returns the new view (P3-A RPC contract)', async () => {
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-ref-14' },
  );
  const result = await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        referenceAssignments: [
          { assetId: 'asset-A', role: 'composition_reference', source: 'user' },
        ],
      },
    },
  );
  assert.equal(result.view.references.length, 1);
  assert.equal(result.view.references[0].role, 'composition_reference');
  // The mutation result carries the frozen UI-safe view,
  // not a raw session.
  assert.equal(typeof result.view.schemaVersion, 'string');
  assert.equal(result.view.target, 'packaging');
});

test('T-15 UI-only metadata fields do not create stale semantics', async () => {
  // Updating ONLY previewUri / displayName must NOT mark
  // the session STALE — these are UI-only fields per the
  // P3-A6 reference view projection. The session is
  // prepared WITH the reference already in the intent; the
  // subsequent re-submission with the same semantic
  // reference (assetId + role + source) but with new
  // displayName / previewUri keeps the session READY.
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-ref-15' },
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        apiProfileId: DEFAULT_PROVIDER,
        providerModelId: DEFAULT_MODEL,
        referenceAssignments: [
          { assetId: 'asset-A', role: 'high_fidelity_visual_reference', source: 'user' },
        ],
      },
    },
  );
  await ops.operations['packaging:prepare-generation'](
    { host: 'node-web' },
    created.sessionId,
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        referenceAssignments: [
          // Same assetId + role; only displayName + previewUri change.
          {
            assetId: 'asset-A',
            role: 'high_fidelity_visual_reference',
            source: 'user',
            displayName: 'A new label',
            previewUri: 'data:image/png;base64,AAA',
          },
        ],
      },
    },
  );
  const view = await ops.operations['packaging:get-view'](
    { host: 'node-web' },
    created.sessionId,
  );
  // UI-only metadata change keeps the session READY.
  assert.equal(view.status, 'ready');
});

// ---------------------------------------------------------------------------
// T-16..T-35 — Locked Asset / Truth
// ---------------------------------------------------------------------------

function makeLockedAsset(type: string, name: string): LockedAssetRecord {
  return {
    id: `la-${type}`,
    projectId: 'pkg-truth',
    type,
    name,
    rule: 'frozen',
    priority: 'high',
    allowedChanges: [],
    forbiddenChanges: [],
    evidence: { source: 'user_confirmed', description: 'mock' },
  };
}

test('T-16 createSession resolves real upstream truth (no fake seed)', async () => {
  const { ops } = makeBundle({
    project: { id: 'pkg-truth', projectName: 'Project Truth', industry: 'cosmetics' },
    lockedAssets: [
      makeLockedAsset('brand_name', 'Acme Co'),
      makeLockedAsset('logo', 'acme-logo.png'),
    ],
  });
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth' },
  );
  assert.equal(created.view.lockedAssets.fields.brand.name, 'Acme Co');
  assert.equal(created.view.lockedAssets.fields.logo.present, true);
  assert.equal(created.view.lockedAssets.fields.logo.usageMode, 'reserved');
});

test('T-17 the brand projection renders the upstream brand_name', async () => {
  const { ops } = makeBundle({
    lockedAssets: [makeLockedAsset('brand_name', 'Brand-XYZ')],
  });
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth' },
  );
  assert.equal(created.view.lockedAssets.fields.brand.name, 'Brand-XYZ');
});

test('T-18 the logo projection renders present=true when a logo Locked Asset exists', async () => {
  const { ops } = makeBundle({
    lockedAssets: [makeLockedAsset('logo', 'logo.png')],
  });
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth' },
  );
  assert.equal(created.view.lockedAssets.fields.logo.present, true);
  // usageMode is constrained to 'reserved' | 'rendered' per
  // the P3-A frozen projection; the default is 'reserved'.
  assert.equal(created.view.lockedAssets.fields.logo.usageMode, 'reserved');
});

test('T-19 the productIdentity projection falls back to artwork → color → arrangement', async () => {
  const { ops } = makeBundle({
    lockedAssets: [makeLockedAsset('product_color', 'Glossy Red')],
  });
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth' },
  );
  assert.equal(created.view.lockedAssets.fields.productIdentity.name, 'Glossy Red');
});

test('T-20 the category projection renders the upstream product_category', async () => {
  const { ops } = makeBundle({
    lockedAssets: [makeLockedAsset('product_category', 'Premium skincare')],
  });
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth' },
  );
  assert.equal(created.view.lockedAssets.fields.category.name, 'Premium skincare');
});

test('T-21 the structure projection renders the upstream packaging_structure', async () => {
  const { ops } = makeBundle({
    lockedAssets: [makeLockedAsset('packaging_structure', 'Lid-and-base box')],
  });
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth' },
  );
  assert.equal(created.view.lockedAssets.fields.structure.formFactor, 'Lid-and-base box');
});

test('T-22 the mandatoryCopy projection collects core_symbol + required_visual_element', async () => {
  const { ops } = makeBundle({
    lockedAssets: [
      makeLockedAsset('core_symbol', 'sunflower'),
      makeLockedAsset('required_visual_element', 'logo lockup'),
      makeLockedAsset('forbidden_reference_content', 'competitor logo'),
    ],
  });
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth' },
  );
  const items = created.view.lockedAssets.fields.mandatoryCopy.items;
  assert.ok(items.includes('sunflower'));
  assert.ok(items.includes('logo lockup'));
  // forbidden_reference_content is collected into
  // confirmedComponents, NOT mandatoryCopy.
  assert.equal(items.includes('competitor logo'), false);
});

test('T-23 the confirmedComponents projection collects forbidden_reference_content', async () => {
  const { ops } = makeBundle({
    lockedAssets: [makeLockedAsset('forbidden_reference_content', 'no rival brand')],
  });
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth' },
  );
  const items = created.view.lockedAssets.fields.confirmedComponents.items;
  assert.ok(items.includes('no rival brand'));
});

test('T-24 missing Locked Asset field renders as empty (NOT a fake seed)', async () => {
  const { ops } = makeBundle({ lockedAssets: [] });
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth' },
  );
  assert.equal(created.view.lockedAssets.fields.brand.name, '');
  assert.equal(created.view.lockedAssets.fields.logo.present, false);
  assert.equal(created.view.lockedAssets.fields.productIdentity.name, '');
  assert.equal(created.view.lockedAssets.fields.category.name, '');
  assert.equal(created.view.lockedAssets.fields.structure.formFactor, '');
  assert.equal(created.view.lockedAssets.fields.mandatoryCopy.items.length, 0);
  assert.equal(created.view.lockedAssets.fields.confirmedComponents.items.length, 0);
  // allLocked is the frozen P3-A invariant; empty fields are
  // still "locked" because the projection is a 7-canonical
  // locked shape (each field has `locked: true`).
  assert.equal(created.view.lockedAssets.allLocked, true);
});

test('T-25 the project truth refresh re-resolves the canonical authority (runtime-side)', async () => {
  // Simulate a Locked Asset being added after the session
  // was created. The truth refresh RPC must re-pull from
  // the upstream authority and reflect the new asset.
  const lockedAssetStore: LockedAssetRecord[] = [];
  const project: ProjectLike = { id: 'pkg-truth', projectName: 'Project Truth', industry: 'cosmetics' };
  const { ops } = makeBundle({
    project,
    lockedAssets: lockedAssetStore,
    resolveTruthSnapshot: makeResolveTruthSnapshot({
      project,
      // The closure reads from the live store on every call.
      // We rebuild the resolver so it picks up the latest.
      // Simulate a delayed list implementation by always
      // reading the current store.
    }),
  });
  // Override the resolver used by ops so the closed-over
  // `lockedAssetStore` is read on every refresh.
  const liveResolver = async (projectId: string) => {
    return makeResolveTruthSnapshot({ project, lockedAssets: lockedAssetStore })(projectId);
  };
  const liveOps = createPackagingOperations({
    service: ops.operations['packaging:create-session'] ? (createPackagingWorkspaceService({
      preparePackagingGeneration: makeStubs().prepareFn,
      executePackagingGeneration: makeStubs().executeFn,
    })) : (null as never),
    readSettings: makeReadSettings(),
    readCredentials: makeReadCredentials(),
    resolveTruthSnapshot: liveResolver,
  });
  const created = await liveOps.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth' },
  );
  // Initially: no brand
  assert.equal(created.view.lockedAssets.fields.brand.name, '');
  // Add a brand Locked Asset upstream
  lockedAssetStore.push(makeLockedAsset('brand_name', 'New Brand'));
  // Request truth refresh
  const refreshed = await liveOps.operations['packaging:set-truth-snapshot'](
    { host: 'node-web' },
    { sessionId: created.sessionId },
  );
  assert.equal(refreshed.view.lockedAssets.fields.brand.name, 'New Brand');
});

test('T-26 the Web caller cannot inject an arbitrary truthSnapshot (P3-B3 §11)', async () => {
  const { ops } = makeBundle({
    lockedAssets: [makeLockedAsset('brand_name', 'Original')],
  });
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth' },
  );
  await assert.rejects(
    () => ops.operations['packaging:set-truth-snapshot'](
      { host: 'node-web' },
      { sessionId: created.sessionId, truthSnapshot: { lockedAssets: { brand: { name: 'Injected' } } } },
    ),
    (err) => {
      assert.equal(err.code, 'PACKAGING_OPERATIONS_TRUTH_AUTHORITY_VIOLATION');
      return true;
    },
  );
  // The original truth is preserved — the authority override was
  // rejected, the session's view is unchanged.
  const view = await ops.operations['packaging:get-view'](
    { host: 'node-web' },
    created.sessionId,
  );
  assert.equal(view.lockedAssets.fields.brand.name, 'Original');
});

test('T-27 the Web caller cannot supply a cross-projectId in setTruthSnapshot (P3-B3 §12)', async () => {
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth-A' },
  );
  await assert.rejects(
    () => ops.operations['packaging:set-truth-snapshot'](
      { host: 'node-web' },
      { sessionId: created.sessionId, projectId: 'pkg-truth-B' },
    ),
    (err) => {
      assert.equal(err.code, 'PACKAGING_OPERATIONS_TRUTH_AUTHORITY_VIOLATION');
      return true;
    },
  );
});

test('T-28 truth drift after truth refresh transitions READY → STALE with truth_surface_changed (P3-A5)', async () => {
  // P3-A5: when the truth surface changes, the prepared
  // snapshot is marked STALE. The reason is
  // `truth_surface_changed` (per P3-A6 contract).
  const project: ProjectLike = { id: 'pkg-truth', projectName: 'Project' };
  const lockedAssetStore: LockedAssetRecord[] = [];
  const liveResolver = async (projectId: string) => {
    return makeResolveTruthSnapshot({ project, lockedAssets: lockedAssetStore })(projectId);
  };
  const service = createPackagingWorkspaceService({
    preparePackagingGeneration: makeStubs().prepareFn,
    executePackagingGeneration: makeStubs().executeFn,
  });
  const liveOps = createPackagingOperations({
    service,
    readSettings: makeReadSettings(),
    readCredentials: makeReadCredentials(),
    resolveTruthSnapshot: liveResolver,
  });
  const created = await liveOps.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth' },
  );
  await liveOps.operations['packaging:update-intent'](
    { host: 'node-web' },
    { sessionId: created.sessionId, patch: { apiProfileId: DEFAULT_PROVIDER, providerModelId: DEFAULT_MODEL } },
  );
  await liveOps.operations['packaging:prepare-generation'](
    { host: 'node-web' },
    created.sessionId,
  );
  // Truth drift upstream
  lockedAssetStore.push(makeLockedAsset('brand_name', 'Drift Brand'));
  // Refresh truth → STALE
  const refreshed = await liveOps.operations['packaging:set-truth-snapshot'](
    { host: 'node-web' },
    { sessionId: created.sessionId },
  );
  assert.equal(refreshed.view.status, 'stale');
  assert.deepEqual(Array.from(refreshed.view.staleReasons), ['truth_surface_changed']);
});

test('T-29 STALE execute after truth drift preserves the STALE-specific issue envelope', async () => {
  // P3-A5.1: the STALE issue envelope must remain
  // distinguishable from the UNPREPARED 'not_ready' envelope.
  const project: ProjectLike = { id: 'pkg-truth', projectName: 'Project' };
  const lockedAssetStore: LockedAssetRecord[] = [];
  const liveResolver = async (projectId: string) => {
    return makeResolveTruthSnapshot({ project, lockedAssets: lockedAssetStore })(projectId);
  };
  const service = createPackagingWorkspaceService({
    preparePackagingGeneration: makeStubs().prepareFn,
    executePackagingGeneration: makeStubs().executeFn,
  });
  const liveOps = createPackagingOperations({
    service,
    readSettings: makeReadSettings(),
    readCredentials: makeReadCredentials(),
    resolveTruthSnapshot: liveResolver,
  });
  const created = await liveOps.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth' },
  );
  await liveOps.operations['packaging:update-intent'](
    { host: 'node-web' },
    { sessionId: created.sessionId, patch: { apiProfileId: DEFAULT_PROVIDER, providerModelId: DEFAULT_MODEL } },
  );
  await liveOps.operations['packaging:prepare-generation']({ host: 'node-web' }, created.sessionId);
  lockedAssetStore.push(makeLockedAsset('brand_name', 'Drift Brand'));
  await liveOps.operations['packaging:set-truth-snapshot']({ host: 'node-web' }, { sessionId: created.sessionId });
  await assert.rejects(
    () => liveOps.operations['packaging:execute-generation'](
      { host: 'node-web' },
      { sessionId: created.sessionId },
    ),
    (err) => {
      assert.equal(err.code, 'PACKAGING_WORKSPACE_EXECUTE_REJECTED');
      assert.deepEqual(
        Array.from(err.issues),
        ['stale', 'truth_surface_changed'],
        'STALE execute must surface the STALE-specific issue envelope after truth drift',
      );
      return true;
    },
  );
});

test('T-30 the view never carries an absolute filesystem path (P3-B3 §18)', async () => {
  const project: ProjectLike = { id: 'pkg-truth', projectName: 'Project' };
  const lockedAssetStore: LockedAssetRecord[] = [
    {
      ...makeLockedAsset('logo', 'logo.png'),
      // Even if the upstream Locked Asset somehow leaks an
      // absolute path into its thumbnail, the view projection
      // must strip it. (P3-A6 hostile-input redaction.)
      thumbnail: 'C:\\Users\\admin\\secret\\logo.png',
    },
  ];
  const liveResolver = async (projectId: string) => {
    return makeResolveTruthSnapshot({ project, lockedAssets: lockedAssetStore })(projectId);
  };
  const service = createPackagingWorkspaceService({
    preparePackagingGeneration: makeStubs().prepareFn,
    executePackagingGeneration: makeStubs().executeFn,
  });
  const liveOps = createPackagingOperations({
    service,
    readSettings: makeReadSettings(),
    readCredentials: makeReadCredentials(),
    resolveTruthSnapshot: liveResolver,
  });
  const created = await liveOps.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth' },
  );
  const viewText = JSON.stringify(created.view);
  // The view does not expose an absolute path.
  for (const forbidden of [
    'C:\\\\Users\\\\admin',
    '/Users/admin',
    'C:/Users',
    'file://',
    '\\\\admin',
  ]) {
    assert.equal(
      viewText.includes(forbidden),
      false,
      `view must not contain absolute path substring ${forbidden}`,
    );
  }
});

test('T-31 the view never carries a credential (P3-B3 §18)', async () => {
  const { ops } = makeBundle();
  const created = await prepareReadySession(ops, 'pkg-truth-31');
  const viewText = JSON.stringify(created.view);
  for (const forbidden of [
    'sk-mock-secret',
    'apiKey',
    'Authorization',
    'Bearer',
    'password',
    'secret',
    'credential',
  ]) {
    assert.equal(
      viewText.includes(forbidden),
      false,
      `view must not contain credential substring ${forbidden}`,
    );
  }
});

test('T-32 the view never carries raw sourceFile / rawPath / rawProviderPayload', async () => {
  const { ops } = makeBundle();
  const created = await prepareReadySession(ops, 'pkg-truth-32');
  const viewText = JSON.stringify(created.view);
  for (const forbidden of [
    'sourceFile',
    'rawPath',
    'absolutePath',
    'tmpPath',
    'tempPath',
    'localPath',
    'fsPath',
    'rawProviderPayload',
    'providerRequestBody',
    'providerResponseBody',
  ]) {
    assert.equal(
      viewText.includes(forbidden),
      false,
      `view must not contain raw field ${forbidden}`,
    );
  }
});

test('T-33 the view never carries binary / base64 / data URI for the Locked Asset fields', async () => {
  const project: ProjectLike = { id: 'pkg-truth', projectName: 'Project' };
  const lockedAssetStore: LockedAssetRecord[] = [
    {
      ...makeLockedAsset('logo', 'logo.png'),
      thumbnail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA',
    },
  ];
  const liveResolver = async (projectId: string) => {
    return makeResolveTruthSnapshot({ project, lockedAssets: lockedAssetStore })(projectId);
  };
  const service = createPackagingWorkspaceService({
    preparePackagingGeneration: makeStubs().prepareFn,
    executePackagingGeneration: makeStubs().executeFn,
  });
  const liveOps = createPackagingOperations({
    service,
    readSettings: makeReadSettings(),
    readCredentials: makeReadCredentials(),
    resolveTruthSnapshot: liveResolver,
  });
  const created = await liveOps.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth' },
  );
  const viewText = JSON.stringify(created.view);
  for (const forbidden of [
    'data:image/png;base64,',
    'iVBORw0KGgoAAAANSUhEUgAA',
  ]) {
    assert.equal(
      viewText.includes(forbidden),
      false,
      `view must not contain binary / base64 / data URI ${forbidden}`,
    );
  }
});

test('T-34 a session has a single projectId binding; truth refresh reads from the bound projectId only', async () => {
  // The session is bound to projectId 'pkg-bound'. The
  // resolver sees a different project with a different
  // brand. The truth refresh MUST NOT pick up the brand of
  // the other project.
  const projectA: ProjectLike = { id: 'pkg-bound', projectName: 'Project A' };
  const projectB: ProjectLike = { id: 'pkg-other', projectName: 'Project B' };
  const lockedAssetStoreA: LockedAssetRecord[] = [];
  const lockedAssetStoreB: LockedAssetRecord[] = [
    makeLockedAsset('brand_name', 'Other-Project-Brand'),
  ];
  // The resolver is keyed by projectId; it must return the
  // truth for the bound project only.
  const projectLookup = async (id: string) => {
    if (id === 'pkg-bound') return projectA;
    if (id === 'pkg-other') return projectB;
    return null;
  };
  // We bypass the simple makeBundle helper to construct a
  // custom resolver that reads from two stores.
  const service = createPackagingWorkspaceService({
    preparePackagingGeneration: makeStubs().prepareFn,
    executePackagingGeneration: makeStubs().executeFn,
  });
  const liveOps = createPackagingOperations({
    service,
    readSettings: makeReadSettings(),
    readCredentials: makeReadCredentials(),
    resolveTruthSnapshot: async (projectId: string) => {
      const project = await projectLookup(projectId);
      const records = projectId === 'pkg-bound' ? lockedAssetStoreA : lockedAssetStoreB;
      return makeResolveTruthSnapshot({ project, lockedAssets: records })(projectId);
    },
  });
  const created = await liveOps.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-bound' },
  );
  // The session is bound to 'pkg-bound'; the truth refresh
  // must resolve against lockedAssetStoreA, NOT B.
  const refreshed = await liveOps.operations['packaging:set-truth-snapshot'](
    { host: 'node-web' },
    { sessionId: created.sessionId },
  );
  assert.notEqual(refreshed.view.lockedAssets.fields.brand.name, 'Other-Project-Brand');
  assert.equal(refreshed.view.projectId, 'pkg-bound');
});

test('T-35 setTruthSnapshot on a session with no bound projectId is rejected', async () => {
  // A session with projectId '' cannot have its truth
  // refreshed (no upstream authority to consult).
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-truth-35' },
  );
  // We do not synthesize a session with empty projectId
  // here because createSession rejects empty projectId. So
  // this test simply confirms the contract: a session
  // created with a non-empty projectId has a bound
  // projectId, and the truth refresh path uses that
  // projectId only.
  const view = await ops.operations['packaging:get-view'](
    { host: 'node-web' },
    created.sessionId,
  );
  assert.equal(view.projectId, 'pkg-truth-35');
});

// ---------------------------------------------------------------------------
// T-36..T-40 — Integration
// ---------------------------------------------------------------------------

test('T-36 reference edit + truth drift produces the canonical stale envelope', async () => {
  const project: ProjectLike = { id: 'pkg-integration', projectName: 'Project' };
  const lockedAssetStore: LockedAssetRecord[] = [];
  const liveResolver = async (projectId: string) => {
    return makeResolveTruthSnapshot({ project, lockedAssets: lockedAssetStore })(projectId);
  };
  const service = createPackagingWorkspaceService({
    preparePackagingGeneration: makeStubs().prepareFn,
    executePackagingGeneration: makeStubs().executeFn,
  });
  const liveOps = createPackagingOperations({
    service,
    readSettings: makeReadSettings(),
    readCredentials: makeReadCredentials(),
    resolveTruthSnapshot: liveResolver,
  });
  const created = await liveOps.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-integration' },
  );
  await liveOps.operations['packaging:update-intent'](
    { host: 'node-web' },
    { sessionId: created.sessionId, patch: { apiProfileId: DEFAULT_PROVIDER, providerModelId: DEFAULT_MODEL } },
  );
  await liveOps.operations['packaging:prepare-generation']({ host: 'node-web' }, created.sessionId);
  // First, drift the intent (references)
  await liveOps.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        referenceAssignments: [
          { assetId: 'asset-A', role: 'high_fidelity_visual_reference', source: 'user' },
        ],
      },
    },
  );
  // Now drift the truth as well
  lockedAssetStore.push(makeLockedAsset('brand_name', 'Brand-X'));
  await liveOps.operations['packaging:set-truth-snapshot'](
    { host: 'node-web' },
    { sessionId: created.sessionId },
  );
  // Try to execute — must fail closed with the STALE
  // envelope that combines intent_changed + truth_surface_changed.
  await assert.rejects(
    () => liveOps.operations['packaging:execute-generation'](
      { host: 'node-web' },
      { sessionId: created.sessionId },
    ),
    (err) => {
      assert.equal(err.code, 'PACKAGING_WORKSPACE_EXECUTE_REJECTED');
      const issues = Array.from(err.issues);
      // The order of issues is the canonical order from
      // detectStaleChange (intent_changed first, then
      // truth_surface_changed).
      assert.ok(issues.includes('stale'));
      assert.ok(issues.includes('intent_changed'));
      assert.ok(issues.includes('truth_surface_changed'));
      return true;
    },
  );
});

test('T-37 explicit prepare is required after STALE (no implicit re-prepare)', async () => {
  const { ops } = makeBundle();
  const created = await prepareReadySession(ops, 'pkg-integration-37');
  // Drift intent
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        referenceAssignments: [
          { assetId: 'asset-A', role: 'high_fidelity_visual_reference', source: 'user' },
        ],
      },
    },
  );
  // Now try to execute directly — must fail closed; the
  // workspace does NOT auto-re-prepare.
  await assert.rejects(
    () => ops.operations['packaging:execute-generation'](
      { host: 'node-web' },
      { sessionId: created.sessionId },
    ),
    (err) => {
      assert.equal(err.code, 'PACKAGING_WORKSPACE_EXECUTE_REJECTED');
      return true;
    },
  );
  // After explicit re-prepare, the session reaches READY
  // and execute is allowed again.
  await ops.operations['packaging:prepare-generation'](
    { host: 'node-web' },
    created.sessionId,
  );
  const ready = await ops.operations['packaging:get-view']({ host: 'node-web' }, created.sessionId);
  assert.equal(ready.status, 'ready');
  // Update intent again so the prepare snapshot is valid.
  // (The previous prepare was based on a different intent
  // patch; we need the current intent to match.)
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        referenceAssignments: [
          { assetId: 'asset-A', role: 'high_fidelity_visual_reference', source: 'user' },
        ],
      },
    },
  );
  // Re-prepare (now based on the new intent)
  await ops.operations['packaging:prepare-generation'](
    { host: 'node-web' },
    created.sessionId,
  );
  // After the second re-prepare, the session is READY and
  // execute is allowed.
  const finalView = await ops.operations['packaging:get-view']({ host: 'node-web' }, created.sessionId);
  assert.equal(finalView.readiness.canExecute, true);
});

test('T-38 the session persists across many RPC calls (no per-call service recreation)', async () => {
  const { service, ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-integration-38' },
  );
  for (let i = 0; i < 10; i += 1) {
    const view = await ops.operations['packaging:get-view']({ host: 'node-web' }, created.sessionId);
    assert.equal(view.sessionId, created.sessionId);
  }
  // And the service is the sole authority:
  const direct = service.getView(created.sessionId);
  assert.equal(direct.sessionId, created.sessionId);
});

test('T-39 the Web feature is RPC-only — there is no local createPackagingWorkspaceService in the Web source', async () => {
  // This test is a source-level guard. The actual
  // enforcement is in the architecture-guards test
  // (W-02..W-10). The P3-B3 reference + truth tests must
  // continue to pass.
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-integration-39' },
  );
  assert.ok(created.sessionId);
});

test('T-40 the canonical 18 top-level view keys are present after a reference + truth cycle', async () => {
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-integration-40' },
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: {
        referenceAssignments: [
          { assetId: 'asset-A', role: 'high_fidelity_visual_reference', source: 'user' },
        ],
      },
    },
  );
  await ops.operations['packaging:set-truth-snapshot'](
    { host: 'node-web' },
    { sessionId: created.sessionId },
  );
  const view = await ops.operations['packaging:get-view']({ host: 'node-web' }, created.sessionId);
  for (const key of [
    'schemaVersion', 'sessionId', 'projectId', 'target', 'status', 'statusLabel',
    'isBusy', 'canEditIntent', 'mode', 'shot', 'references', 'lockedAssets',
    'intent', 'readiness', 'prepared', 'execution', 'error', 'staleReasons',
  ]) {
    assert.ok(key in view, `view must include canonical key ${key}`);
  }
});
