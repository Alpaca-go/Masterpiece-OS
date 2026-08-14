// P2-C tests — Packaging Reference Policy.
//
// Coverage map (per P2 spec §47 §50 P2-C Exit, §14 §15 §16 §25 §32 §58 §59):
//   1.  reference roles formalized
//   2.  each Reference has explicit role
//   3.  precedence single-source and frozen
//   4.  missing Reference-First reference fails closed (REFERENCE_REQUIRED)
//   5.  missing role fails closed (REFERENCE_ROLE_INVALID)
//   6.  unknown role fails closed (REFERENCE_ROLE_INVALID)
//   7.  reference count has one authority (count === references.length)
//   8.  provider reference support validated (REFERENCE_UNSUPPORTED)
//   9.  no implicit project asset fallback (no auto-pick on missing ref)
//   10. STOP-P2-07 CLOSED (P2 Global Blocker; P2-B had this as OPEN)
//   11. no Golden import
//   12. no new static runtime dependency leak (Check H clean)
//   13. Single Source of Truth: translation.js is a CONSUMER, not a
//       parallel implementation site (architecture: reference-policy.js
//       -> translation.js -> future compiler)
//
// Architectural position (P2 spec §47):
//   reference-policy.js (single source of truth, owner)
//     -> translation.js (consumer; carries resolved policy into the
//        Translation shape)
//     -> future P2-D compiler (consumer)
//
// Stop conditions honoured (P2 spec §20 §58 §59 STOP-P2-07):
//   - no implicit role fill (each Reference MUST carry an explicit role)
//   - no implicit project asset fallback (Reference-First + no
//     references fails closed; no auto-pick from project assets /
//     Golden / Anchor / previous output)
//   - no second runtime
//   - no project-specific literal
//   - no Golden fixture import
//   - referenceCount is DERIVED from resolvedReferences.length; input
//     may not pre-declare a parallel count

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const require = createRequire(import.meta.url);

const {
  PACKAGING_REFERENCE_POLICY_VERSION,
  PACKAGING_REFERENCE_ROLES,
  PACKAGING_REFERENCE_PRECEDENCE,
  REFERENCE_REQUIRED,
  REFERENCE_ROLE_INVALID,
  REFERENCE_UNSUPPORTED,
  resolveReferencePolicy,
  validateReferencePolicy,
  getReferencePolicyFingerprint,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/reference-policy.js'));

const {
  createPackagingTranslation,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/translation.js'));

const {
  inspectPackagingTranslation,
  validatePackagingTranslation,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/validation.js'));

const {
  getPackagingShotContract,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/contracts.js'));

function makeBaseInput(overrides = {}) {
  return {
    generationMode: 'analysis_led',
    shotContract: { id: 'PKG-HERO-SINGLE' },
    projectIdentity: {
      brandName: 'Acme Botanicals',
      industry: 'Skincare',
      brandRole: 'premium botanical skincare',
      productIdentity: 'Acme Hydrating Serum 30ml',
    },
    lockedAssets: {
      brand: { name: 'Acme Botanicals' },
      logo: { usageMode: 'reserved' },
      productIdentity: { name: 'Acme Hydrating Serum 30ml' },
      category: { name: 'premium skincare' },
      structure: { formFactor: 'cylindrical glass bottle with dropper' },
    },
    structure: {
      formFactor: 'cylindrical glass bottle with dropper',
      primaryPackage: 'glass dropper bottle',
      structuralFeatures: ['cylindrical body', 'screw cap', 'pipette dropper'],
    },
    visualDirection: { summary: 'Calm botanical apothecary aesthetic.' },
    providerHints: { aspectRatio: '4:5' },
    providerCapability: { referenceSupport: true, maxReferenceImages: 4 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// P2-C Exit 1: reference roles formalized.
// ---------------------------------------------------------------------------

test('P2-C-1 the six canonical Reference roles are exported from reference-policy.js', () => {
  assert.equal(PACKAGING_REFERENCE_POLICY_VERSION, '1.0.0');
  assert.deepEqual([...PACKAGING_REFERENCE_ROLES], [
    'high_fidelity_visual_reference',
    'structure_reference',
    'material_reference',
    'composition_reference',
    'style_reference',
    'product_identity_reference',
  ]);
});

test('P2-C-1b the frozen fingerprint pins the canonical role list', () => {
  const fp = getReferencePolicyFingerprint();
  assert.equal(fp.roleCount, 6);
  assert.equal(fp.precedenceDepth, 6);
  assert.deepEqual([...fp.roles], [...PACKAGING_REFERENCE_ROLES]);
});

// ---------------------------------------------------------------------------
// P2-C Exit 2: each Reference has explicit role.
// ---------------------------------------------------------------------------

test('P2-C-2a each Reference entry carries its own explicit role + assetId', () => {
  const t = createPackagingTranslation(makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-style', role: 'style_reference', source: 'user' },
        { assetId: 'asset-composition', role: 'composition_reference', source: 'user' },
        { assetId: 'asset-material', role: 'material_reference', source: 'user' },
      ],
    },
  }));
  assert.equal(t.referencePolicy.references.length, 3);
  for (const r of t.referencePolicy.references) {
    assert.ok(typeof r.assetId === 'string' && r.assetId.length > 0, 'assetId missing');
    assert.ok(PACKAGING_REFERENCE_ROLES.includes(r.role), `role ${r.role} not canonical`);
  }
});

test('P2-C-2b Reference role must be explicit — bare roles[] is NOT accepted', () => {
  // The old P2-A shape (a bare roles[] list) is no longer accepted.
  // Upstream must pass references: [{ assetId, role, ... }].
  assert.throws(
    () => createPackagingTranslation(makeBaseInput({
      generationMode: 'reference_first',
      referencePolicy: {
        enabled: true,
        required: true,
        roles: ['style_reference'], // P2-A shape — no longer accepted
      },
    })),
    (err) => err.code === 'REFERENCE_REQUIRED',
  );
});

test('P2-C-2c a Reference without role throws REFERENCE_ROLE_INVALID', () => {
  assert.throws(
    () => createPackagingTranslation(makeBaseInput({
      generationMode: 'reference_first',
      referencePolicy: {
        enabled: true,
        required: true,
        references: [{ assetId: 'asset-x' /* no role */ }],
      },
    })),
    (err) => {
      assert.equal(err.code, 'REFERENCE_ROLE_INVALID');
      assert.ok(err.issues.some((issue) => issue.startsWith('reference_role_missing')));
      return true;
    },
  );
});

test('P2-C-2d a Reference without assetId throws REFERENCE_ROLE_INVALID', () => {
  // P2 spec §15 + P2-C: each Reference must be tied to a concrete
  // asset identity; bare roles are not enough.
  assert.throws(
    () => createPackagingTranslation(makeBaseInput({
      generationMode: 'reference_first',
      referencePolicy: {
        enabled: true,
        required: true,
        references: [{ role: 'style_reference' /* no assetId */ }],
      },
    })),
    (err) => {
      assert.equal(err.code, 'REFERENCE_ROLE_INVALID');
      assert.ok(err.issues.some((issue) => issue.startsWith('reference_asset_id_missing')));
      return true;
    },
  );
});

test('P2-C-2e a Reference with an unknown role throws REFERENCE_ROLE_INVALID', () => {
  assert.throws(
    () => createPackagingTranslation(makeBaseInput({
      generationMode: 'reference_first',
      referencePolicy: {
        enabled: true,
        required: true,
        references: [{ assetId: 'asset-x', role: 'imaginary_role' }],
      },
    })),
    (err) => {
      assert.equal(err.code, 'REFERENCE_ROLE_INVALID');
      assert.ok(err.issues.some((issue) => issue.startsWith('reference_role_invalid')));
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// P2-C Exit 3: precedence single-source and frozen.
// ---------------------------------------------------------------------------

test('P2-C-3a the canonical 6-layer precedence chain is exported from reference-policy.js', () => {
  assert.deepEqual([...PACKAGING_REFERENCE_PRECEDENCE], [
    'locked_assets',
    'explicit_user_constraints',
    'reference_image',
    'packaging_translation',
    'analysis_context',
    'model_defaults',
  ]);
});

test('P2-C-3b the Translation shape carries the canonical precedence chain unchanged', () => {
  const t = createPackagingTranslation(makeBaseInput());
  assert.deepEqual([...t.referencePolicy.precedence], [...PACKAGING_REFERENCE_PRECEDENCE]);
});

test('P2-C-3c the Translation shape is rejected if precedence does not match the frozen chain', () => {
  const t = createPackagingTranslation(makeBaseInput());
  // Mutate the precedence to simulate a translation that lost its
  // frozen chain. The validator must surface it.
  t.referencePolicy.precedence = ['locked_assets', 'something_else'];
  const result = inspectPackagingTranslation(t);
  assert.equal(result.valid, false);
  assert.ok(result.issues.includes('reference_policy_precedence_must_match_frozen_chain'));
});

test('P2-C-3d the precedence chain is the only definition site in the packaging/ subtree', () => {
  const dir = join(repoRoot, 'packages/image-generation-runtime/src/packaging');
  for (const f of readdirSync(dir)) {
    if (!/\.(js|ts|mjs)$/.test(f)) continue;
    const src = readFileSync(join(dir, f), 'utf8');
    // Translation / validation may import and re-export the chain
    // (allowed) but must NOT define a parallel chain of the same
    // shape. The simplest signal of a parallel definition is
    // "PACKAGING_REFERENCE_PRECEDENCE = Object.freeze([" or
    // "= [" near it.
    if (f === 'reference-policy.js') continue;
    const localDef = /PACKAGING_REFERENCE_PRECEDENCE\s*=\s*Object\.freeze\(\s*\[/.test(src);
    assert.ok(!localDef, `${f} defines PACKAGING_REFERENCE_PRECEDENCE locally; only reference-policy.js may own it`);
  }
});

// ---------------------------------------------------------------------------
// P2-C Exit 4: missing Reference-First reference fails closed (REFERENCE_REQUIRED).
// ---------------------------------------------------------------------------

test('P2-C-4 reference_first + enabled + no references throws REFERENCE_REQUIRED', () => {
  assert.throws(
    () => createPackagingTranslation(makeBaseInput({
      generationMode: 'reference_first',
      referencePolicy: { enabled: true, required: true, references: [] },
    })),
    (err) => {
      assert.equal(err.code, 'REFERENCE_REQUIRED');
      assert.ok(err.issues.includes('reference_required_in_reference_first'));
      return true;
    },
  );
});

test('P2-C-4b analysis_led with no references is valid', () => {
  const t = createPackagingTranslation(makeBaseInput({
    generationMode: 'analysis_led',
    referencePolicy: { enabled: false, required: false, references: [] },
  }));
  assert.equal(t.referencePolicy.references.length, 0);
  assert.equal(validatePackagingTranslation(t), t);
});

test('P2-C-4c REFERENCE_REQUIRED is a stable exported constant', () => {
  assert.equal(REFERENCE_REQUIRED, 'REFERENCE_REQUIRED');
});

// ---------------------------------------------------------------------------
// P2-C Exit 7: reference count has one authority.
// ---------------------------------------------------------------------------

test('P2-C-7a count is derived from references.length (not from input)', () => {
  // Pass a count in providerHints and a different references array;
  // the count must follow the references, not the input.
  const t = createPackagingTranslation(makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-a', role: 'style_reference' },
        { assetId: 'asset-b', role: 'composition_reference' },
      ],
    },
    providerHints: { aspectRatio: '4:5', referenceCount: 999 }, // should be ignored
  }));
  assert.equal(t.referencePolicy.count, 2);
  assert.equal(t.providerHints.referenceCount, 2);
});

test('P2-C-7b count === references.length in the resolved policy', () => {
  const resolved = resolveReferencePolicy({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'a', role: 'style_reference' },
        { assetId: 'b', role: 'composition_reference' },
        { assetId: 'c', role: 'material_reference' },
      ],
    },
    providerCapability: { referenceSupport: true, maxReferenceImages: 8 },
  });
  assert.equal(resolved.count, 3);
  assert.equal(resolved.references.length, 3);
});

test('P2-C-7c the inspect path catches count / references drift (defense in depth)', () => {
  const t = createPackagingTranslation(makeBaseInput());
  t.referencePolicy.count = 999;
  t.referencePolicy.references = [];
  const result = inspectPackagingTranslation(t);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.startsWith('reference_policy_count_mismatch')));
});

// ---------------------------------------------------------------------------
// P2-C Exit 8: provider reference support validated (REFERENCE_UNSUPPORTED).
// ---------------------------------------------------------------------------

test('P2-C-8 reference_first + referenceSupport=false throws REFERENCE_UNSUPPORTED', () => {
  assert.throws(
    () => createPackagingTranslation(makeBaseInput({
      generationMode: 'reference_first',
      providerCapability: { referenceSupport: false, maxReferenceImages: 1 },
      referencePolicy: {
        enabled: true,
        required: true,
        references: [
          { assetId: 'asset-x', role: 'high_fidelity_visual_reference' },
        ],
      },
    })),
    (err) => {
      assert.equal(err.code, 'REFERENCE_UNSUPPORTED');
      assert.ok(err.issues.includes('reference_unsupported_by_provider'));
      return true;
    },
  );
});

test('P2-C-8b analysis_led + referenceSupport=false is valid (no reference required)', () => {
  const t = createPackagingTranslation(makeBaseInput({
    generationMode: 'analysis_led',
    providerCapability: { referenceSupport: false, maxReferenceImages: 0 },
    referencePolicy: { enabled: false, required: false, references: [] },
  }));
  assert.equal(t.referencePolicy.enabled, false);
  assert.equal(validatePackagingTranslation(t), t);
});

test('P2-C-8c reference_count > provider maxReferenceImages fails closed with PROVIDER_CAPABILITY_MISMATCH (P2-E closes the P2-C placeholder)', () => {
  // P2-E closes the P2-C placeholder. The Reference role is
  // legal; the failure is a Provider capability issue. The
  // canonical code is PROVIDER_CAPABILITY_MISMATCH (P2 spec §32).
  assert.throws(
    () => createPackagingTranslation(makeBaseInput({
      generationMode: 'reference_first',
      providerCapability: { referenceSupport: true, maxReferenceImages: 1 },
      referencePolicy: {
        enabled: true,
        required: true,
        references: [
          { assetId: 'asset-a', role: 'style_reference' },
          { assetId: 'asset-b', role: 'composition_reference' },
        ],
      },
    })),
    (err) => {
      assert.equal(err.code, 'PROVIDER_CAPABILITY_MISMATCH');
      assert.ok(err.issues.some((issue) => issue.startsWith('reference_count_exceeds_provider_capability')));
      return true;
    },
  );
});

test('P2-C-8d REFERENCE_UNSUPPORTED is a stable exported constant', () => {
  assert.equal(REFERENCE_UNSUPPORTED, 'REFERENCE_UNSUPPORTED');
});

// ---------------------------------------------------------------------------
// P2-C Exit 9: no implicit project asset fallback.
// ---------------------------------------------------------------------------

test('P2-C-9a Reference-First with no references does NOT auto-pick from project assets', () => {
  // The previous P2-A behavior silently filled roles[] with
  // high_fidelity_visual_reference. P2-C removes that path entirely;
  // an empty references array in reference_first + required MUST
  // throw REFERENCE_REQUIRED, never silently succeed.
  assert.throws(
    () => createPackagingTranslation(makeBaseInput({
      generationMode: 'reference_first',
      referencePolicy: { enabled: true, required: true, references: [] },
    })),
    (err) => {
      assert.equal(err.code, 'REFERENCE_REQUIRED');
      // The shape that comes out of buildReferencePolicy on the
      // happy path must NEVER contain an inferred reference.
      // Here we only assert the throw; the next test asserts the
      // shape on a non-throwing path.
      return true;
    },
  );
});

test('P2-C-9b a successful Reference-First translation carries only the explicit references', () => {
  const t = createPackagingTranslation(makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-only', role: 'high_fidelity_visual_reference' },
      ],
    },
  }));
  assert.equal(t.referencePolicy.references.length, 1);
  assert.equal(t.referencePolicy.references[0].assetId, 'asset-only');
  assert.equal(t.referencePolicy.count, 1);
});

test('P2-C-9c resolveReferencePolicy + validateReferencePolicy are deterministic for the same input', () => {
  const input = {
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-a', role: 'style_reference' },
      ],
    },
    providerCapability: { referenceSupport: true, maxReferenceImages: 4 },
  };
  const a = resolveReferencePolicy(input);
  const b = resolveReferencePolicy(input);
  assert.deepEqual(a, b);
  validateReferencePolicy(a);
  validateReferencePolicy(b);
});

// ---------------------------------------------------------------------------
// P2-C Exit 13: single source of truth — translation.js is a CONSUMER.
// ---------------------------------------------------------------------------

test('P2-C-ssot translation.js does not carry a parallel Reference Policy implementation', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/translation.js'),
    'utf8',
  );
  // Forbid local re-implementation of policy logic. The only
  // acceptable patterns are: re-export of the canonical constant,
  // import from reference-policy.js, and a thin consumer call to
  // resolveReferencePolicy + validateReferencePolicy.
  assert.ok(/from\s+['"]\.\/reference-policy\.js['"]/.test(src), 'translation.js does not import from ./reference-policy.js');
  assert.ok(
    /resolveReferencePolicy\(/.test(src) && /validateReferencePolicy\(/.test(src),
    'translation.js does not consume the canonical resolver + validator',
  );
  // Forbid a parallel implicit-fill branch (the original P2-A bug).
  assert.ok(
    !/high_fidelity_visual_reference'\s*\]/.test(src),
    'translation.js still has the implicit role fill branch; P2-C requires it removed',
  );
});

test('P2-C-ssot reference-policy.js does not import from translation.js (no circular ownership)', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/reference-policy.js'),
    'utf8',
  );
  assert.ok(!/from\s+['"]\.\/translation\.js['"]/.test(src), 'reference-policy.js must not depend on translation.js');
});

test('P2-C-ssot validation.js does not carry a parallel Reference Policy implementation', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/validation.js'),
    'utf8',
  );
  // validation.js is allowed to import the canonical roles /
  // precedence constants from translation.js (re-export surface),
  // but must not define a parallel policy implementation.
  assert.ok(!/resolveReferencePolicy\s*=\s*function/.test(src));
  assert.ok(!/validateReferencePolicy\s*=\s*function/.test(src));
});

// ---------------------------------------------------------------------------
// P2-C Exit 11: no Golden import.
// ---------------------------------------------------------------------------

test('P2-C-no-golden reference-policy.js does not import any Golden / evaluation / fixture asset', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/reference-policy.js'),
    'utf8',
  );
  const importPattern = /import\s+[^;]+from\s+['"][^'"]+['"]/g;
  const requirePattern = /require\s*\(\s*['"][^'"]+['"]\s*\)/g;
  const imports = [];
  let m;
  while ((m = importPattern.exec(src))) imports.push(m[0]);
  while ((m = requirePattern.exec(src))) imports.push(m[0]);
  for (const line of imports) {
    assert.ok(!/evaluation\//.test(line), `reference-policy.js imports evaluation/* via: ${line}`);
    assert.ok(!/tests\/fixtures\/packaging\//.test(line), `reference-policy.js imports tests/fixtures/packaging/* via: ${line}`);
  }
});

// ---------------------------------------------------------------------------
// P2-C Exit 12: no new static runtime dependency leak (Check H clean).
// ---------------------------------------------------------------------------

test('P2-C-no-static-deps reference-policy.js does not introduce a new static fs read', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/reference-policy.js'),
    'utf8',
  );
  // Check H (Runtime Dependency Declaration Coverage) flags any
  // production fs.* / new URL / path.join / resolve(__dirname,...)
  // call against an undeclared literal. P2-C introduces zero new
  // static reads; this test is a guard against accidental future
  // regressions in the file.
  assert.ok(!/fs\.(readFile|readFileSync|existsSync|readdir)/.test(src), 'reference-policy.js reads a static file; declare it in runtime-static-assets.json');
  assert.ok(!/new\s+URL\(/.test(src));
});

// ---------------------------------------------------------------------------
// P2-C Exit 10: STOP-P2-07 CLOSED (was OPEN at P2-B; P2-C removes the
// implicit role fill that caused STOP-P2-07 to be OPEN).
// ---------------------------------------------------------------------------

test('P2-C-stop STOP-P2-07 is CLOSED: no implicit role fill exists in translation.js', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/translation.js'),
    'utf8',
  );
  // STOP-P2-07 was OPEN at P2-B because the P2-A implicit-fill branch
  // was still in buildReferencePolicy. P2-C removes it; the
  // canonical 'roles=[] -> high_fidelity_visual_reference' branch
  // is gone. The signature is the absence of:
  //   "high_fidelity_visual_reference"  inside translation.js
  assert.ok(
    !/high_fidelity_visual_reference/.test(src),
    'translation.js still has the implicit role fill literal; STOP-P2-07 would still be OPEN',
  );
});

test('P2-C-stop STOP-P2-07 is CLOSED: the previous known-gap test has been removed', () => {
  const dir = join(repoRoot, 'tests/image-generation');
  const SELF = 'packaging-reference-policy.test.js';
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.test.js')) continue;
    // Skip self to avoid matching the regex source itself.
    if (f === SELF) continue;
    // The P2-A / P2-B "known gap" test pinned the implicit fill
    // behavior. P2-C requires it gone. The new P2-C test file is
    // allowed to mention the gap only as a historical note in
    // comments, not as a pinning assertion. We check the test
    // identifier (test name) and the exact pin pattern the previous
    // known-gap test used.
    const src = readFileSync(join(dir, f), 'utf8');
    // Match an ACTIVE test() call that names the known gap, not a
    // tombstone comment. The previous P2-B test used
    // `test('P2-C-known-gap (RED on P2-C) ...')`; tombstone comments
    // that mention the name in prose are allowed.
    const hasPinningTestName = /test\s*\(\s*['"]P2-C-known-gap/.test(src);
    const hasPinningAssert = /assert\.deepEqual\([\s\S]*?\.referencePolicy\.roles[\s\S]*?high_fidelity_visual_reference[\s\S]*?\)/.test(src);
    assert.ok(
      !hasPinningTestName && !hasPinningAssert,
      `${f} still pins the implicit fill behavior; P2-C requires the known-gap pin removed`,
    );
  }
});

// ---------------------------------------------------------------------------
// Six-route pre-condition: P2-C must still allow all 6 routes to
// produce a valid translation (Analysis-led × 3 shots + Reference-First
// × 3 shots) with the new policy shape.
// ---------------------------------------------------------------------------

const SIX_ROUTES = [];
for (const mode of ['analysis_led', 'reference_first']) {
  for (const shot of ['PKG-HERO-SINGLE', 'PKG-SERIES-GROUP', 'PKG-GIFT-OPEN']) {
    SIX_ROUTES.push({ mode, shot });
  }
}

for (const { mode, shot } of SIX_ROUTES) {
  test(`P2-C-route ${mode} + ${shot} compiles a valid translation with the new policy shape`, () => {
    const t = createPackagingTranslation(makeBaseInput({
      generationMode: mode,
      shotContract: { id: shot },
      providerHints: { aspectRatio: getPackagingShotContract(shot).aspectRatio },
      referencePolicy: mode === 'reference_first'
        ? {
          enabled: true,
          required: true,
          references: [
            { assetId: 'asset-route-001', role: 'high_fidelity_visual_reference' },
          ],
        }
        : { enabled: false, required: false, references: [] },
    }));
    assert.equal(t.generationMode, mode);
    assert.equal(t.shotContract.id, shot);
    assert.equal(inspectPackagingTranslation(t).valid, true);
    assert.equal(validatePackagingTranslation(t), t);
  });
}
