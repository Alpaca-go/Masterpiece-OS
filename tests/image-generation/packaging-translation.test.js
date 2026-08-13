// P2-A tests — Packaging Translation contract + validator.
//
// Coverage map (per P2 spec §48 P2-A Exit, §35 §36 §37 §38 §39 §40):
//   1. PackagingTranslation exists
//   2. target fixed to packaging
//   3. both generation modes supported
//   4. 3 shot contracts represented
//   5. Locked Assets represented
//   6. reference semantics represented
//   7. validation exists
//   8. no Golden hardcode
// + pre-conditions for P2-B/C/D (six routes deterministically produce a
//   valid translation that survives validation)
// + structural: Legacy structure evidence code preserved (P2 spec §34)
// + structural: Cross-target isolation (Space must not import Packaging
//   Translation)
// + structural: Golden boundary (production translation must not import
//   evaluation/* or tests/fixtures/packaging/*)
//
// Stop conditions honoured:
//   - no second reasoning call
//   - no Golden import
//   - locked assets preserved unchanged

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
  createPackagingTranslation,
  PACKAGING_TRANSLATION_VERSION,
  PACKAGING_TRANSLATION_TARGET,
  PACKAGING_GENERATION_MODES,
  PACKAGING_SHOT_CONTRACT_IDS,
  PACKAGING_REFERENCE_ROLES,
  PACKAGING_REFERENCE_PRECEDENCE,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/translation.js'));

const {
  inspectPackagingTranslation,
  validatePackagingTranslation,
  PACKAGING_VALIDATION_VERSION,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/validation.js'));

const SHOTS = PACKAGING_SHOT_CONTRACT_IDS;
const MODES = PACKAGING_GENERATION_MODES;

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
      logo: { present: true, usageMode: 'reserved' },
      productIdentity: { name: 'Acme Hydrating Serum 30ml' },
      category: { name: 'premium skincare' },
      structure: { formFactor: 'cylindrical glass bottle with dropper' },
      mandatoryCopy: { items: ['30ml'] },
      confirmedComponents: { items: ['dropper', 'cap', 'bottle'] },
    },
    structure: {
      formFactor: 'cylindrical glass bottle with dropper',
      primaryPackage: 'glass dropper bottle',
      structuralFeatures: ['cylindrical body', 'screw cap', 'pipette dropper'],
    },
    visualDirection: {
      summary: 'Calm botanical apothecary aesthetic with controlled gloss highlights.',
    },
    colorSystem: { base: ['soft warm white'], accent: ['sage green'] },
    motifSystem: { primary: ['leaf silhouette'] },
    materialSystem: { substrate: ['frosted glass'], craft: ['matte label'] },
    composition: { type: 'centered hero' },
    lighting: { intent: 'soft studio' },
    camera: { aspectRatio: '1:1' },
    sceneProgram: { type: 'studio' },
    providerHints: { aspectRatio: '1:1' },
    // Default provider capability: reference support on with a
    // generous cap. Tests that exercise reference surface override
    // this explicitly.
    providerCapability: { referenceSupport: true, maxReferenceImages: 4 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// P2-A Exit condition 1 + 2: Translation exists; target is fixed to packaging.
// ---------------------------------------------------------------------------

test('P2-A-1 createPackagingTranslation returns a well-formed Translation object', () => {
  const t = createPackagingTranslation(makeBaseInput());
  assert.equal(typeof t, 'object');
  assert.equal(t.target, 'packaging');
  assert.equal(t.translationVersion, PACKAGING_TRANSLATION_VERSION);
  assert.equal(t.schemaVersion, '1.0');
});

test('P2-A-2 target is hard-fixed; passing a different target value has no effect', () => {
  const t = createPackagingTranslation({ ...makeBaseInput(), target: 'space' });
  assert.equal(t.target, 'packaging');
});

// ---------------------------------------------------------------------------
// P2-A Exit condition 3: both generation modes supported.
// ---------------------------------------------------------------------------

test('P2-A-3a analysis_led mode is accepted', () => {
  const t = createPackagingTranslation(makeBaseInput({ generationMode: 'analysis_led' }));
  assert.equal(t.generationMode, 'analysis_led');
});

test('P2-A-3b reference_first mode is accepted with an explicit reference + provider capability', () => {
  // P2-C: each Reference must have an explicit role and an explicit
  // assetId; providerCapability is the only signal of whether the
  // target provider supports references. The base input ships with
  // referenceSupport=true so this test only needs to pass an explicit
  // reference.
  const t = createPackagingTranslation(makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-ref-001', role: 'high_fidelity_visual_reference', source: 'user' },
      ],
    },
  }));
  assert.equal(t.generationMode, 'reference_first');
  assert.equal(t.referencePolicy.required, true);
  assert.equal(t.referencePolicy.references.length, 1);
  assert.equal(t.referencePolicy.references[0].assetId, 'asset-ref-001');
  assert.equal(t.referencePolicy.references[0].role, 'high_fidelity_visual_reference');
});

test('P2-A-3c unsupported generation mode throws PACKAGING_TRANSLATION_INVALID', () => {
  assert.throws(
    () => createPackagingTranslation(makeBaseInput({ generationMode: 'mixed' })),
    (err) => {
      assert.equal(err.code, 'PACKAGING_TRANSLATION_INVALID');
      assert.ok(err.issues.some((issue) => issue.startsWith('unsupported_generation_mode')));
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// P2-A Exit condition 4: 3 shot contracts represented.
// ---------------------------------------------------------------------------

for (const shotId of SHOTS) {
  test(`P2-A-4a shot contract ${shotId} is accepted and returns canonical purpose / mustProve`, () => {
    const t = createPackagingTranslation(makeBaseInput({ shotContract: { id: shotId } }));
    assert.equal(t.shotContract.id, shotId);
    assert.ok(Array.isArray(t.shotContract.mustProve) && t.shotContract.mustProve.length > 0);
    assert.ok(Array.isArray(t.shotContract.compilerRequirements) && t.shotContract.compilerRequirements.length > 0);
  });
}

test('P2-A-4b an unknown shot contract id is rejected', () => {
  assert.throws(
    () => createPackagingTranslation(makeBaseInput({ shotContract: { id: 'PKG-WINDOW-DISPLAY' } })),
    (err) => {
      // P2-B aligned the canonical error code to SHOT_CONTRACT_INVALID
      // (P2 spec §32). The legacy prefixed alias from P2-A is NOT
      // carried forward; if a compat consumer is ever found we stop
      // and report rather than introduce a parallel authority.
      assert.equal(err.code, 'SHOT_CONTRACT_INVALID');
      return true;
    },
  );
});

test('P2-A-4c the three V1 shot contracts are the only ones exported', () => {
  assert.deepEqual([...SHOTS], ['PKG-HERO-SINGLE', 'PKG-SERIES-GROUP', 'PKG-GIFT-OPEN']);
});

// ---------------------------------------------------------------------------
// P2-A Exit condition 5: Locked Assets represented.
// ---------------------------------------------------------------------------

test('P2-A-5a Locked Assets block is fully populated from input', () => {
  const t = createPackagingTranslation(makeBaseInput());
  const la = t.lockedAssets;
  assert.equal(la.brand.name, 'Acme Botanicals');
  assert.equal(la.brand.locked, true);
  assert.equal(la.logo.usageMode, 'reserved');
  assert.equal(la.logo.locked, true);
  assert.equal(la.productIdentity.name, 'Acme Hydrating Serum 30ml');
  assert.equal(la.productIdentity.locked, true);
  assert.equal(la.category.name, 'premium skincare');
  assert.equal(la.category.locked, true);
  assert.equal(la.structure.formFactor, 'cylindrical glass bottle with dropper');
  assert.equal(la.structure.locked, true);
  assert.ok(la.mandatoryCopy.items.includes('30ml'));
  assert.ok(la.confirmedComponents.items.includes('dropper'));
});

test('P2-A-5b Locked Assets fail-closed when input tries to mark them unlocked', () => {
  // P2 spec §16: "Production code must not silently rewrite them."
  // If a field appears in the lockedAssets block it IS a Locked Asset.
  // Explicit `locked: false` is logically inconsistent; we reject it
  // rather than silently coerce.
  assert.throws(
    () => createPackagingTranslation(makeBaseInput({
      lockedAssets: {
        brand: { name: 'X', locked: false },
        logo: { usageMode: 'reserved' },
        productIdentity: { name: 'Y' },
        category: { name: 'Z' },
        structure: { formFactor: 'box' },
      },
    })),
    (err) => {
      assert.equal(err.code, 'PACKAGING_TRANSLATION_INVALID');
      assert.ok(err.issues.includes('locked_assets_unlocked:brand'));
      return true;
    },
  );
});

test('P2-A-5b2 Locked Assets default to locked=true when the locked flag is omitted', () => {
  const t = createPackagingTranslation(makeBaseInput({
    lockedAssets: {
      brand: { name: 'X' },
      logo: { usageMode: 'reserved' },
      productIdentity: { name: 'Y' },
      category: { name: 'Z' },
      structure: { formFactor: 'box' },
    },
  }));
  assert.equal(t.lockedAssets.brand.locked, true);
  assert.equal(t.lockedAssets.logo.locked, true);
  assert.equal(t.lockedAssets.productIdentity.locked, true);
  assert.equal(t.lockedAssets.category.locked, true);
  assert.equal(t.lockedAssets.structure.locked, true);
});

test('P2-A-5c validator rejects Locked Asset vs projectIdentity conflict', () => {
  const t = createPackagingTranslation(makeBaseInput({
    projectIdentity: { brandName: 'Brand A', industry: 'X', brandRole: 'Y', productIdentity: 'P1' },
    lockedAssets: {
      brand: { name: 'Brand B' },
      productIdentity: { name: 'P1' },
      category: { name: 'cat' },
      structure: { formFactor: 'box' },
      logo: { usageMode: 'reserved' },
    },
  }));
  const result = inspectPackagingTranslation(t);
  assert.equal(result.valid, false);
  assert.ok(result.issues.includes('locked_assets_brand_conflicts_with_project_identity'));
});

// ---------------------------------------------------------------------------
// P2-A Exit condition 6: reference semantics represented.
// ---------------------------------------------------------------------------

test('P2-A-6a reference policy carries the six P2 reference roles + frozen precedence', () => {
  assert.deepEqual([...PACKAGING_REFERENCE_ROLES], [
    'high_fidelity_visual_reference',
    'structure_reference',
    'material_reference',
    'composition_reference',
    'style_reference',
    'product_identity_reference',
  ]);
  assert.deepEqual([...PACKAGING_REFERENCE_PRECEDENCE], [
    'locked_assets',
    'explicit_user_constraints',
    'reference_image',
    'packaging_translation',
    'analysis_context',
    'model_defaults',
  ]);
});

test('P2-A-6b reference policy references carry canonical role and a unique assetId per reference', () => {
  // P2-C: the new shape is references: [{ assetId, role, ... }] with
  // each reference carrying its own explicit role. Duplicate assetId
  // is rejected fail-closed (no silent dedup — that would mask a real
  // conflict between two references claiming the same asset).
  const t = createPackagingTranslation(makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-style', role: 'style_reference', source: 'user' },
        { assetId: 'asset-composition', role: 'composition_reference', source: 'user' },
      ],
    },
  }));
  assert.equal(t.referencePolicy.references.length, 2);
  assert.equal(t.referencePolicy.references[0].assetId, 'asset-style');
  assert.equal(t.referencePolicy.references[0].role, 'style_reference');
  assert.equal(t.referencePolicy.references[1].assetId, 'asset-composition');
  assert.equal(t.referencePolicy.references[1].role, 'composition_reference');
  assert.equal(t.referencePolicy.count, 2);
});

test('P2-A-6b2 duplicate assetId is rejected fail-closed (no silent dedup)', () => {
  // Two references claiming the same assetId is a real conflict, not
  // an input typo to silently dedup.
  assert.throws(
    () => createPackagingTranslation(makeBaseInput({
      generationMode: 'reference_first',
      referencePolicy: {
        enabled: true,
        required: true,
        references: [
          { assetId: 'asset-style', role: 'style_reference', source: 'user' },
          { assetId: 'asset-style', role: 'composition_reference', source: 'user' },
        ],
      },
    })),
    (err) => {
      assert.equal(err.code, 'REFERENCE_ROLE_INVALID');
      assert.ok(err.issues.some((issue) => issue.startsWith('reference_asset_id_duplicate')));
      return true;
    },
  );
});

test('P2-A-6c reference policy rejects unknown role strings (REFERENCE_ROLE_INVALID)', () => {
  assert.throws(
    () => createPackagingTranslation(makeBaseInput({
      generationMode: 'reference_first',
      referencePolicy: {
        enabled: true,
        required: true,
        references: [
          { assetId: 'asset-x', role: 'unknown_role' },
          { assetId: 'asset-y', role: 'style_reference' },
        ],
      },
    })),
    (err) => {
      // P2-C: the canonical code for unknown role is REFERENCE_ROLE_INVALID
      // (P2 spec §32). The legacy PACKAGING_TRANSLATION_INVALID prefix
      // is NOT carried forward for the reference surface.
      assert.equal(err.code, 'REFERENCE_ROLE_INVALID');
      assert.ok(err.issues.some((issue) => issue.startsWith('reference_role_invalid')));
      return true;
    },
  );
});

test('P2-A-6d reference_first without explicit references fails closed (REFERENCE_REQUIRED)', () => {
  // P2-C: no implicit project asset fallback. An empty references
  // array in reference_first + required = true MUST throw
  // REFERENCE_REQUIRED. analysis_led with no references stays valid.
  assert.throws(
    () => createPackagingTranslation(makeBaseInput({
      generationMode: 'reference_first',
      referencePolicy: { enabled: true, required: true, references: [] },
    })),
    (err) => {
      assert.equal(err.code, 'REFERENCE_REQUIRED');
      return true;
    },
  );
});

test('P2-A-6e reference role must be explicit (missing role per reference fails closed)', () => {
  // P2 spec §14: "Each Reference must have an explicit role."
  assert.throws(
    () => createPackagingTranslation(makeBaseInput({
      generationMode: 'reference_first',
      referencePolicy: {
        enabled: true,
        required: true,
        references: [
          { assetId: 'asset-x' /* role omitted */ },
        ],
      },
    })),
    (err) => {
      assert.equal(err.code, 'REFERENCE_ROLE_INVALID');
      assert.ok(err.issues.some((issue) => issue.startsWith('reference_role_missing')));
      return true;
    },
  );
});

test('P2-A-6f reference assetId must be explicit (missing assetId fails closed)', () => {
  // P2 spec §15 + P2-C: each Reference must be associated with a
  // concrete asset identity; bare roles[] are not enough.
  assert.throws(
    () => createPackagingTranslation(makeBaseInput({
      generationMode: 'reference_first',
      referencePolicy: {
        enabled: true,
        required: true,
        references: [
          { role: 'style_reference' /* assetId omitted */ },
        ],
      },
    })),
    (err) => {
      assert.equal(err.code, 'REFERENCE_ROLE_INVALID');
      assert.ok(err.issues.some((issue) => issue.startsWith('reference_asset_id_missing')));
      return true;
    },
  );
});

test('P2-A-6g analysis_led with no references is valid (no implicit Reference required)', () => {
  const t = createPackagingTranslation(makeBaseInput({
    generationMode: 'analysis_led',
    referencePolicy: { enabled: false, required: false, references: [] },
  }));
  assert.equal(t.referencePolicy.references.length, 0);
  assert.equal(t.referencePolicy.count, 0);
  assert.equal(inspectPackagingTranslation(t).valid, true);
});

// ---------------------------------------------------------------------------
// P2-A Exit condition 7: validation exists.
// ---------------------------------------------------------------------------

test('P2-A-7a validate path returns the input on success and is non-mutating', () => {
  const t = createPackagingTranslation(makeBaseInput());
  const snapshot = JSON.parse(JSON.stringify(t));
  const out = validatePackagingTranslation(t);
  assert.equal(out, t);
  assert.deepEqual(t, snapshot);
});

test('P2-A-7b inspect path returns {valid, issues} without throwing', () => {
  const t = createPackagingTranslation(makeBaseInput());
  const result = inspectPackagingTranslation(t);
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test('P2-A-7c validate path throws PACKAGING_TRANSLATION_INVALID with issues[]', () => {
  // Use a non-structure-evidence case so the validator surfaces
  // PACKAGING_TRANSLATION_INVALID (not the legacy PACKAGING_STRUCTURE_EVIDENCE_MISSING
  // code, which is asserted separately in P2-A-7d per P2 spec §34).
  const t = createPackagingTranslation(makeBaseInput({
    projectIdentity: { brandName: 'Acme Botanicals', industry: 'Skincare', brandRole: 'premium botanical skincare', productIdentity: 'X' },
    lockedAssets: {
      brand: { name: 'Acme Botanicals' },
      logo: { usageMode: 'reserved' },
      productIdentity: { name: 'DIFFERENT PRODUCT' },
      category: { name: 'premium skincare' },
      structure: { formFactor: 'cylindrical glass bottle with dropper' },
    },
  }));
  assert.throws(
    () => validatePackagingTranslation(t),
    (err) => {
      assert.equal(err.code, 'PACKAGING_TRANSLATION_INVALID');
      assert.ok(Array.isArray(err.issues) && err.issues.length > 0);
      assert.ok(err.issues.includes('locked_assets_product_identity_conflicts_with_project_identity'));
      return true;
    },
  );
});

test('P2-A-7d structure evidence missing surfaces the legacy PACKAGING_STRUCTURE_EVIDENCE_MISSING code (P2 spec §34)', () => {
  const t = createPackagingTranslation(makeBaseInput({
    structure: { formFactor: 'box', structuralFeatures: [] },
  }));
  assert.throws(
    () => validatePackagingTranslation(t),
    (err) => err.code === 'PACKAGING_STRUCTURE_EVIDENCE_MISSING',
  );
});

test('P2-A-7e validation rejects non-object input safely', () => {
  const result = inspectPackagingTranslation(null);
  assert.equal(result.valid, false);
  assert.deepEqual(result.issues, ['translation_not_an_object']);
});

test('P2-A-7f validator version is exposed', () => {
  assert.equal(PACKAGING_VALIDATION_VERSION, '1.0.0');
});

// ---------------------------------------------------------------------------
// P2-A Exit condition 8: no Golden hardcode.
// ---------------------------------------------------------------------------

test('P2-A-8a translation.js does not mention Golden project literal strings', () => {
  const src = readFileSync(join(repoRoot, 'packages/image-generation-runtime/src/packaging/translation.js'), 'utf8');
  // Forbids project-specific literal cues. We only check for the canonical
  // 九州 / 珍珠 / 虹彩 / 羽 references and the 65-70 / 20-25 / 5-10 numeric
  // baseline ranges. Any production code that hard-codes these would
  // violate the P2 spec §28 §29 §58 "Golden Project Rules != Production
  // Rules" hard boundary.
  const forbidden = ['九州', 'Jiuzhou', '珍珠白', 'pearl white', '矿物紫', 'mineral purple', '石墨黑', '虹彩', 'iridescent', '羽眼', 'feather eye', '65-70', '20-25', '5-10'];
  for (const needle of forbidden) {
    assert.ok(!src.includes(needle), `translation.js contains forbidden Golden literal: ${needle}`);
  }
});

test('P2-A-8b validation.js does not mention Golden project literal strings', () => {
  const src = readFileSync(join(repoRoot, 'packages/image-generation-runtime/src/packaging/validation.js'), 'utf8');
  const forbidden = ['九州', 'Jiuzhou', '珍珠白', 'pearl white', '矿物紫', 'mineral purple', '石墨黑', '虹彩', 'iridescent', '羽眼', 'feather eye', '65-70', '20-25', '5-10'];
  for (const needle of forbidden) {
    assert.ok(!src.includes(needle), `validation.js contains forbidden Golden literal: ${needle}`);
  }
});

test('P2-A-8c translation does not import evaluation/* or tests/fixtures/packaging/*', () => {
  const dir = join(repoRoot, 'packages/image-generation-runtime/src/packaging');
  // Match actual import / require statements, not arbitrary string mentions.
  const importPattern = /import\s+[^;]+from\s+['"][^'"]+['"]/g;
  const requirePattern = /require\s*\(\s*['"][^'"]+['"]\s*\)/g;
  for (const file of readdirSync(dir)) {
    const src = readFileSync(join(dir, file), 'utf8');
    const imports = [];
    let m;
    while ((m = importPattern.exec(src))) imports.push(m[0]);
    while ((m = requirePattern.exec(src))) imports.push(m[0]);
    for (const line of imports) {
      assert.ok(!/evaluation\//.test(line), `${file} imports evaluation/* via: ${line}`);
      assert.ok(!/tests\/fixtures\/packaging\//.test(line), `${file} imports tests/fixtures/packaging/* via: ${line}`);
    }
  }
});

// ---------------------------------------------------------------------------
// P2-A pre-conditions for P2-B/C/D: the six routes deterministically
// produce a valid translation that survives validation.
// ---------------------------------------------------------------------------

const SIX_ROUTES = [];
for (const mode of MODES) {
  for (const shot of SHOTS) {
    SIX_ROUTES.push({ mode, shot });
  }
}

for (const { mode, shot } of SIX_ROUTES) {
  test(`P2-A-route ${mode} + ${shot} compiles a valid translation (pre-condition for P2-B/C/D)`, () => {
    const t = createPackagingTranslation(makeBaseInput({
      generationMode: mode,
      shotContract: { id: shot },
      // P2-C: every reference carries an explicit role + assetId; the
      // analysis_led routes ship with no references at all.
      referencePolicy: mode === 'reference_first'
        ? {
          enabled: true,
          required: true,
          references: [
            { assetId: 'asset-route-001', role: 'high_fidelity_visual_reference', source: 'user' },
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

// ---------------------------------------------------------------------------
// Determinism (P2 spec §37) — same normalized input must yield equivalent
// translation shape (timestamps and provenance.createdAt are explicitly
// excluded from this guarantee; they are runtime metadata, not semantic
// translation content).
// ---------------------------------------------------------------------------

test('P2-A-determinism same input yields same shape (excluding createdAt)', () => {
  const a = createPackagingTranslation(makeBaseInput());
  const b = createPackagingTranslation(makeBaseInput());
  const aCopy = { ...a, provenance: { ...a.provenance, createdAt: 'X' } };
  const bCopy = { ...b, provenance: { ...b.provenance, createdAt: 'X' } };
  assert.deepEqual(aCopy, bCopy);
});

// ---------------------------------------------------------------------------
// Cross-target isolation (P2 spec §40).
// ---------------------------------------------------------------------------

test('P2-A-cross-target Space code does not import Packaging Translation', () => {
  const spaceRoots = [
    'space-generator',
    'packages/runtime-core',
  ];
  for (const root of spaceRoots) {
    const dir = join(repoRoot, root);
    let files = [];
    try {
      files = readdirSync(dir, { recursive: true });
    } catch (err) {
      continue;
    }
    for (const f of files) {
      if (!f || !/\.(js|ts|mjs)$/.test(String(f))) continue;
      if (String(f).includes('/node_modules/')) continue;
      const full = join(dir, String(f));
      const src = readFileSync(full, 'utf8');
      assert.ok(
        !src.includes('image-generation-runtime/src/packaging/translation')
          && !src.includes('image-generation-runtime/src/packaging/validation'),
        `${f} imports Packaging translation; cross-target isolation broken`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// No second reasoning call (P2 spec §38) — Translation does not import
// any model / reasoner / provider API surface.
// ---------------------------------------------------------------------------

test('P2-A-no-reasoning Translation does not import any model / reasoner / provider API', () => {
  const dir = join(repoRoot, 'packages/image-generation-runtime/src/packaging');
  for (const file of readdirSync(dir)) {
    const src = readFileSync(join(dir, file), 'utf8');
    // The Translation layer is allowed to import only its sibling
    // module. Reasoning surfaces (Creative Director, Analysis
    // reasoner, model / provider API) are forbidden. We check
    // ACTUAL import statements, not arbitrary string mentions —
    // the P2-B / P2-C / P2-D / P2-E sibling modules
    // (contracts.js / reference-policy.js / compiler.js /
    // provider-adapter.js / provider-capability.js) are mentioned
    // in prose but the Translation layer does not import them.
    const importPattern = /import\s+[^;]+from\s+['"][^'"]+['"]/g;
    const requirePattern = /require\s*\(\s*['"][^'"]+['"]\s*\)/g;
    const imports = [];
    let m;
    while ((m = importPattern.exec(src))) imports.push(m[0]);
    while ((m = requirePattern.exec(src))) imports.push(m[0]);
    const reasonerHints = [
      'creative-director',
      'analysis-engine',
      'reasoner',
      'image-generation-runtime/src/providers',
      'image-generation-runtime/src/model-runtime',
      'fetch(',
    ];
    for (const line of imports) {
      for (const hint of reasonerHints) {
        assert.ok(!line.includes(hint), `${file} imports a reasoning surface: ${hint} (line: ${line})`);
      }
    }
  }
});
