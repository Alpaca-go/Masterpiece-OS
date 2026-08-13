// P2-B tests — Shot Contract Production Representation.
//
// Coverage map (per P2 spec §47 §49 P2-B Exit, §34 §38 §40 §49 §59):
//   1. HERO contract compiles
//   2. SERIES contract compiles
//   3. OPEN contract compiles
//   4. no fourth V1 shot contract added
//   5. structure requirements differ meaningfully per shot
//   6. canonical error code is SHOT_CONTRACT_INVALID
//   7. single source of truth (translation.js has no parallel definition)
//   8. P2-C known gap recorded (implicit role inference slated for removal)
//
// Architectural position (P2 spec §47):
//   contracts.js (single source of truth)
//     -> translation.js (consumer)
//     -> future compiler
//
// Stop conditions honoured (P2 spec §20 §59):
//   - no second runtime
//   - no project-specific literal
//   - no Golden import
//   - no second reasoning call
//   - no parallel error authority

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
  PACKAGING_SHOT_CONTRACT_VERSION,
  PACKAGING_SHOT_CONTRACT_IDS,
  SHOT_CONTRACT_INVALID,
  getPackagingShotContract,
  isPackagingShotContractId,
  getPackagingShotContractFingerprint,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/contracts.js'));

const {
  createPackagingTranslation,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/translation.js'));

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
    visualDirection: {
      summary: 'Calm botanical apothecary aesthetic with controlled gloss highlights.',
    },
    providerHints: { aspectRatio: '1:1' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// P2-B Exit 1-3: the three V1 shot contracts compile.
// ---------------------------------------------------------------------------

for (const shotId of PACKAGING_SHOT_CONTRACT_IDS) {
  test(`P2-B-1+2+3 shot contract ${shotId} compiles via getPackagingShotContract`, () => {
    const c = getPackagingShotContract(shotId);
    assert.equal(c.id, shotId);
    assert.ok(typeof c.purpose === 'string' && c.purpose.length > 0);
    assert.ok(Array.isArray(c.mustProve) && c.mustProve.length > 0);
    assert.ok(Array.isArray(c.compilerRequirements) && c.compilerRequirements.length > 0);
    assert.ok(c.structureRequirements && typeof c.structureRequirements === 'object');
    assert.ok(c.presentationStrategy && typeof c.presentationStrategy === 'object');
  });
}

// ---------------------------------------------------------------------------
// P2-B Exit 4: no fourth V1 shot contract added.
// ---------------------------------------------------------------------------

test('P2-B-4 exactly three V1 shot contracts are exported; no fourth is added', () => {
  assert.deepEqual([...PACKAGING_SHOT_CONTRACT_IDS], [
    'PKG-HERO-SINGLE',
    'PKG-SERIES-GROUP',
    'PKG-GIFT-OPEN',
  ]);
});

test('P2-B-4b the frozen fingerprint reports exactly three shot entries', () => {
  const fp = getPackagingShotContractFingerprint();
  assert.equal(fp.schemaVersion, PACKAGING_SHOT_CONTRACT_VERSION);
  assert.equal(fp.ids.length, 3);
  assert.equal(Object.keys(fp.counts).length, 3);
});

// ---------------------------------------------------------------------------
// P2-B Exit 5: structure requirements differ meaningfully per shot.
// ---------------------------------------------------------------------------

test('P2-B-5a HERO structureRequirements: packageCount=1, openingVisibility=closed, no openingLayout, no skuStrategy', () => {
  const c = getPackagingShotContract('PKG-HERO-SINGLE');
  assert.equal(c.structureRequirements.packageCount, 1);
  assert.equal(c.structureRequirements.openingVisibility, 'closed-or-resting');
  assert.equal(c.openingLayout, null);
  assert.equal(c.skuStrategy, null);
});

test('P2-B-5b SERIES structureRequirements: packageCount=multiple, skuRelation=family, has skuStrategy, no openingLayout', () => {
  const c = getPackagingShotContract('PKG-SERIES-GROUP');
  assert.equal(c.structureRequirements.packageCount, 'multiple');
  assert.equal(c.structureRequirements.skuRelation, 'family');
  assert.ok(c.skuStrategy && typeof c.skuStrategy === 'object');
  assert.equal(c.openingLayout, null);
});

test('P2-B-5c OPEN structureRequirements: openingVisibility=open, has openingLayout, no skuStrategy', () => {
  const c = getPackagingShotContract('PKG-GIFT-OPEN');
  assert.equal(c.structureRequirements.openingVisibility, 'open');
  assert.ok(c.openingLayout && typeof c.openingLayout === 'object');
  assert.equal(c.openingLayout.outerVisible, true);
  assert.equal(c.openingLayout.innerVisible, true);
  assert.equal(c.openingLayout.trayOrCompartment, true);
  assert.equal(c.openingLayout.openingMechanism, 'visible');
  assert.equal(c.skuStrategy, null);
});

test('P2-B-5d the three shots have meaningful per-shot structure differences (not all axes pairwise distinct; specific evidence per shot)', () => {
  // P2 spec §49: "structure requirements differ meaningfully per shot".
  // This is per-shot evidence, not strict pairwise uniqueness. Each shot
  // owns at least one axis that the other two do not share in the same
  // shape.
  const hero = getPackagingShotContract('PKG-HERO-SINGLE');
  const series = getPackagingShotContract('PKG-SERIES-GROUP');
  const open = getPackagingShotContract('PKG-GIFT-OPEN');

  // HERO distinctive: structuralReadability + single primary package as
  // visual subject; openingLayout and skuStrategy both null.
  assert.match(hero.structureRequirements.structuralReadability, /silhouette/i);
  assert.equal(hero.openingLayout, null);
  assert.equal(hero.skuStrategy, null);

  // SERIES distinctive: skuStrategy present, packageCount=multiple,
  // skuRelation=family (no other shot has all three).
  assert.ok(series.skuStrategy && series.skuStrategy.duplicatesForbidden === true);
  assert.equal(series.structureRequirements.packageCount, 'multiple');
  assert.equal(series.structureRequirements.skuRelation, 'family');
  assert.equal(series.openingLayout, null);

  // OPEN distinctive: openingLayout present, openingVisibility=open.
  assert.ok(open.openingLayout && open.openingLayout.outerVisible === true);
  assert.equal(open.structureRequirements.openingVisibility, 'open');
  assert.equal(open.skuStrategy, null);

  // Per-shot primaryPackage wording is distinct (this is the most
  // concrete evidence that the three contracts are not interchangeable).
  const heroPkg = hero.structureRequirements.primaryPackage;
  const seriesPkg = series.structureRequirements.primaryPackage;
  const openPkg = open.structureRequirements.primaryPackage;
  assert.notEqual(heroPkg, seriesPkg);
  assert.notEqual(heroPkg, openPkg);
  assert.notEqual(seriesPkg, openPkg);
});

// ---------------------------------------------------------------------------
// P2-B constraint: canonical error code is SHOT_CONTRACT_INVALID.
// ---------------------------------------------------------------------------

test('P2-B-err SHOT_CONTRACT_INVALID is the canonical code (no PACKAGING_ prefix)', () => {
  assert.equal(SHOT_CONTRACT_INVALID, 'SHOT_CONTRACT_INVALID');
});

test('P2-B-err getPackagingShotContract throws SHOT_CONTRACT_INVALID for unknown id', () => {
  assert.throws(
    () => getPackagingShotContract('PKG-WINDOW-DISPLAY'),
    (err) => {
      assert.equal(err.code, 'SHOT_CONTRACT_INVALID');
      assert.ok(err.issues.includes('unknown_shot_contract_id:PKG-WINDOW-DISPLAY'));
      return true;
    },
  );
});

test('P2-B-err getPackagingShotContract throws SHOT_CONTRACT_INVALID for empty id', () => {
  assert.throws(
    () => getPackagingShotContract(''),
    (err) => err.code === 'SHOT_CONTRACT_INVALID',
  );
});

test('P2-B-err no production source file uses the legacy PACKAGING_SHOT_CONTRACT_INVALID alias', () => {
  // Single authority rule. If this test fails it means someone reintroduced
  // a parallel PACKAGING_SHOT_CONTRACT_INVALID authority. Per the P2-B
  // constraint we DO NOT carry an alias forward; if a compat consumer is
  // ever found we stop and report rather than maintain a parallel code.
  const roots = [
    'packages/image-generation-runtime/src/packaging',
    'tests/image-generation',
  ];
  for (const root of roots) {
    const dir = join(repoRoot, root);
    for (const f of readdirSync(dir)) {
      if (!/\.(js|ts|mjs)$/.test(f)) continue;
      const src = readFileSync(join(dir, f), 'utf8');
      // Allow the legacy string ONLY in this single test file as a
      // self-referential marker. Production code (translation.js,
      // validation.js, contracts.js) and other tests must not contain it.
      if (root === 'tests/image-generation' && f === 'packaging-shot-contracts.test.js') continue;
      assert.ok(
        !src.includes('PACKAGING_SHOT_CONTRACT_INVALID'),
        `${f} contains the legacy PACKAGING_SHOT_CONTRACT_INVALID alias; P2-B requires the canonical SHOT_CONTRACT_INVALID`,
      );
    }
  }
});

test('P2-B-err isPackagingShotContractId matches the canonical id list', () => {
  for (const id of PACKAGING_SHOT_CONTRACT_IDS) {
    assert.equal(isPackagingShotContractId(id), true);
  }
  for (const id of ['PKG-WINDOW-DISPLAY', 'PKG-POSTER', '', 'hero', 'PKG-HERO-SINGLE ', ' PKG-HERO-SINGLE']) {
    assert.equal(isPackagingShotContractId(id), false);
  }
});

// ---------------------------------------------------------------------------
// P2-B constraint: translation.js is a CONSUMER, not a parallel definition site.
// ---------------------------------------------------------------------------

test('P2-B-ssot translation.js does not carry a parallel shot contract definition', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/translation.js'),
    'utf8',
  );
  // Forbid any local shot contract table or seed that would create a
  // parallel authority. The single source of truth is contracts.js.
  assert.ok(!/SHOT_CONTRACT_SEED/.test(src), 'translation.js still has SHOT_CONTRACT_SEED; P2-B requires contracts.js to be the single source of truth');
  assert.ok(!/PKG-HERO-SINGLE.*purpose.*'/.test(src), 'translation.js still defines a shot contract purpose inline; move it to contracts.js');
});

test('P2-B-ssot translation.js imports from contracts.js (consumer, not owner)', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/translation.js'),
    'utf8',
  );
  assert.ok(
    /from\s+['"]\.\/contracts\.js['"]/.test(src),
    'translation.js does not import from ./contracts.js; it must consume the canonical authority',
  );
});

test('P2-B-ssot validation.js does not carry a parallel shot contract definition', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/validation.js'),
    'utf8',
  );
  assert.ok(!/SHOT_CONTRACT_SEED/.test(src));
  assert.ok(!/PKG-HERO-SINGLE.*purpose/.test(src));
});

test('P2-B-ssot the translation Translation shape now carries structureRequirements / openingLayout / skuStrategy from contracts.js', () => {
  for (const id of PACKAGING_SHOT_CONTRACT_IDS) {
    const t = createPackagingTranslation(makeBaseInput({ shotContract: { id } }));
    const c = getPackagingShotContract(id);
    assert.equal(t.shotContract.id, id);
    assert.deepEqual(t.shotContract.structureRequirements, c.structureRequirements);
    assert.deepEqual(t.shotContract.presentationStrategy, c.presentationStrategy);
    assert.equal(t.shotContract.openingLayout, c.openingLayout);
    assert.equal(t.shotContract.skuStrategy, c.skuStrategy);
  }
});

// ---------------------------------------------------------------------------
// P2-C known gap (recorded here per the P2-B pre-conditions).
//
// This test currently passes because the implicit role inference is still
// in buildReferencePolicy. P2-C MUST remove the inference, at which point
// this test will go RED until P2-C adds the fail-closed path. That is the
// intent: a red-flag that catches the gap before P2-D Compiler lands.
// ---------------------------------------------------------------------------

test('P2-C-known-gap (RED on P2-C) reference_first + enabled + empty roles currently triggers implicit role fill', () => {
  // The implicit fill is a P2 spec §14 violation. P2-C will remove the
  // branch and replace it with a fail-closed REFERENCE_REQUIRED error.
  // Until then this test pins the current behavior so the gap is
  // visible. The TODO marker in translation.js buildReferencePolicy
  // names the work block.
  const t = createPackagingTranslation(makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: { enabled: true, required: true, roles: [] },
  }));
  // Current behavior: roles are filled with the canonical
  // high_fidelity_visual_reference so validation passes.
  assert.deepEqual(t.referencePolicy.roles, ['high_fidelity_visual_reference']);
});
