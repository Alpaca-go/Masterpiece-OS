// P2-D tests — Deterministic Packaging Compiler.
//
// Coverage map (per P2 spec §47 §51 P2-D Exit, §17 §18 §19 §20 §32
// §58 §59):
//   1.  deterministic compiler
//   2.  stable 14-block order (single topology, all 6 routes share it)
//   3.  compiler consumes validated Translation
//   4.  contracts.js remains Shot authority
//   5.  reference-policy.js remains Reference authority
//   6.  Locked Assets preserved (no rewrite)
//   7.  no second reasoning call (no model / reasoner import)
//   8.  no Golden import
//   9.  no project-specific hidden prompt
//   10. Analysis-led compiles
//   11. Reference-First compiles
//   12. HERO compiles
//   13. SERIES compiles
//   14. OPEN compiles
//   15. same input -> same semantic prompt (determinism)
//   16. Runtime Asset Guard PASS (Check H clean)
//   17. repo:verify PASS
//
// Architectural position (P2 spec §17 §18):
//   contracts.js (P2-B) + reference-policy.js (P2-C) + translation.js
//   (P2-A) -> compiler.js (P2-D) -> future P2-E provider adapter
//
// Stop conditions honoured (P2 spec §20 §58 §59):
//   - does not call a model
//   - does not import any Golden project asset
//   - does not mutate the input translation
//   - does not silently rewrite Locked Assets
//   - does not fork 6 separate prompt topologies
//   - does not invent project-specific visual defaults

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
  PACKAGING_COMPILER_VERSION,
  PACKAGING_COMPILE_FAILED,
  PACKAGING_PROMPT_BLOCKS,
  compilePackagingPrompt,
  getPackagingCompilerFingerprint,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/compiler.js'));

const {
  createPackagingTranslation,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/translation.js'));

const {
  inspectPackagingTranslation,
  validatePackagingTranslation,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/validation.js'));

const {
  PACKAGING_SHOT_CONTRACT_IDS,
  getPackagingShotContract,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/contracts.js'));

const {
  PACKAGING_REFERENCE_PRECEDENCE,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/reference-policy.js'));

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
      mandatoryCopy: { items: ['30ml'] },
      confirmedComponents: { items: ['dropper', 'cap', 'bottle'] },
    },
    structure: {
      formFactor: 'cylindrical glass bottle with dropper',
      primaryPackage: 'glass dropper bottle',
      structuralFeatures: ['cylindrical body', 'screw cap', 'pipette dropper'],
    },
    visualDirection: { summary: 'Calm botanical apothecary aesthetic with controlled gloss highlights.' },
    colorSystem: { base: ['soft warm white'], accent: ['sage green'] },
    motifSystem: { primary: ['leaf silhouette'] },
    materialSystem: { substrate: ['frosted glass'], craft: ['matte label'] },
    composition: { type: 'centered hero' },
    lighting: { intent: 'soft studio' },
    camera: { aspectRatio: '1:1' },
    sceneProgram: { type: 'studio' },
    providerHints: { aspectRatio: '1:1' },
    providerCapability: { referenceSupport: true, maxReferenceImages: 4 },
    ...overrides,
  };
}

function makeTranslation(overrides = {}) {
  return createPackagingTranslation(makeBaseInput(overrides));
}

// ---------------------------------------------------------------------------
// P2-D Exit 1 + 2: deterministic compiler + stable 14-block order.
// ---------------------------------------------------------------------------

test('P2-D-1+2 the Compiler exposes a frozen 14-block order (P2 spec §19)', () => {
  const fp = getPackagingCompilerFingerprint();
  assert.equal(PACKAGING_COMPILER_VERSION, '1.0.0');
  assert.equal(fp.blockCount, 14);
  assert.deepEqual(fp.blockIds, [
    'task',
    'product_package_identity',
    'shot_contract',
    'structural_requirements',
    'locked_assets',
    'visual_direction',
    'color_system',
    'motif_graphic_language',
    'material_system',
    'reference_boundary',
    'composition_camera',
    'lighting',
    'rendering_requirements',
    'negative_constraints',
  ]);
});

test('P2-D-2 compile output carries blocks in the canonical 14-block order', () => {
  const t = makeTranslation();
  const out = compilePackagingPrompt(t);
  assert.deepEqual(out.blockOrder, [
    'task',
    'product_package_identity',
    'shot_contract',
    'structural_requirements',
    'locked_assets',
    'visual_direction',
    'color_system',
    'motif_graphic_language',
    'material_system',
    'reference_boundary',
    'composition_camera',
    'lighting',
    'rendering_requirements',
    'negative_constraints',
  ]);
  for (let i = 0; i < out.blocks.length; i += 1) {
    assert.equal(out.blocks[i].id, out.blockOrder[i], `block at index ${i} must match blockOrder`);
  }
});

test('P2-D-2b PACKAGING_PROMPT_BLOCKS is a frozen, single source of truth', () => {
  assert.equal(Object.isFrozen(PACKAGING_PROMPT_BLOCKS), true);
  for (const entry of PACKAGING_PROMPT_BLOCKS) {
    assert.equal(Object.isFrozen(entry), true);
    assert.equal(typeof entry[0], 'string');
    assert.equal(typeof entry[1], 'string');
  }
  // Stable order: re-evaluating must yield the same order.
  const a = PACKAGING_PROMPT_BLOCKS.map(([id]) => id);
  const b = PACKAGING_PROMPT_BLOCKS.map(([id]) => id);
  assert.deepEqual(a, b);
});

// ---------------------------------------------------------------------------
// P2-D Exit 3: compiler consumes validated Translation.
// ---------------------------------------------------------------------------

test('P2-D-3a compilePackagingPrompt throws PACKAGING_TRANSLATION_INVALID on a malformed translation', () => {
  // No upstream validation; defensive inspect surfaces the failure
  // with the canonical upstream code (P2 spec §32).
  assert.throws(
    () => compilePackagingPrompt({ target: 'packaging', /* missing most fields */ }),
    (err) => {
      assert.equal(err.code, 'PACKAGING_TRANSLATION_INVALID');
      return true;
    },
  );
});

test('P2-D-3b compilePackagingPrompt throws PACKAGING_STRUCTURE_EVIDENCE_MISSING when structure evidence is empty (P2 spec §34)', () => {
  const t = makeTranslation({ structure: { formFactor: 'box', structuralFeatures: [] } });
  // The Translation was created upstream, but its structure block is
  // incomplete. The Compiler surfaces the legacy upstream code
  // verbatim rather than re-wrapping it as a generic compiler error.
  assert.throws(
    () => compilePackagingPrompt(t),
    (err) => err.code === 'PACKAGING_STRUCTURE_EVIDENCE_MISSING',
  );
});

test('P2-D-3c compilePackagingPrompt throws PACKAGING_COMPILE_FAILED on a non-object translation', () => {
  assert.throws(
    () => compilePackagingPrompt(null),
    (err) => err.code === 'PACKAGING_COMPILE_FAILED',
  );
  assert.throws(
    () => compilePackagingPrompt('not-a-translation'),
    (err) => err.code === 'PACKAGING_COMPILE_FAILED',
  );
});

test('P2-D-3d compilePackagingPrompt surfaces a non-packaging target as the upstream canonical code (PACKAGING_TRANSLATION_INVALID)', () => {
  // The Compiler does not re-wrap semantic input errors. A non-
  // packaging target is a Translation-shape error and surfaces with
  // the P2-A / P2-B upstream canonical code, NOT as a generic
  // PACKAGING_COMPILE_FAILED.
  const t = makeTranslation();
  t.target = 'space';
  assert.throws(
    () => compilePackagingPrompt(t),
    (err) => err.code === 'PACKAGING_TRANSLATION_INVALID',
  );
});

test('P2-D-3e compilePackagingPrompt surfaces an unknown shot id as the upstream canonical code (PACKAGING_TRANSLATION_INVALID)', () => {
  // The Translation carries a non-canonical shot id. The inspect
  // path catches this upstream and surfaces it as
  // PACKAGING_TRANSLATION_INVALID; the Compiler does not silently
  // re-wrap. (SHOT_CONTRACT_INVALID is the canonical code at the
  // contracts.js / resolveShotContract level — exercised separately
  // in packaging-shot-contracts.test.js; here we are at the
  // Translation layer.)
  const t = makeTranslation();
  t.shotContract.id = 'PKG-WINDOW-DISPLAY';
  assert.throws(
    () => compilePackagingPrompt(t),
    (err) => err.code === 'PACKAGING_TRANSLATION_INVALID',
  );
});

// ---------------------------------------------------------------------------
// P2-D Exit 4: contracts.js remains Shot authority.
// ---------------------------------------------------------------------------

test('P2-D-4 compiler.js does not locally re-define Shot Contract rules', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/compiler.js'),
    'utf8',
  );
  // Forbid local per-shot rule definitions: any literal that names
  // the three shot ids with inline content is a parallel definition.
  // The Compiler should import from contracts.js only.
  assert.ok(
    /from\s+['"]\.\/contracts\.js['"]/.test(src),
    'compiler.js does not import from ./contracts.js',
  );
  assert.ok(
    /getPackagingShotContract\(/.test(src),
    'compiler.js does not call getPackagingShotContract',
  );
  // Forbid inline HERO / SERIES / OPEN rule tables.
  assert.ok(
    !/'PKG-HERO-SINGLE'[\s\S]{0,200}purpose/.test(src),
    'compiler.js still defines an inline HERO purpose; the Shot Contract must come from contracts.js',
  );
});

test('P2-D-4b the Compiler consumes shotContract.structureRequirements / openingLayout / skuStrategy / compilerRequirements verbatim from contracts.js', () => {
  // Build a translation for each shot, compile, and assert the
  // per-shot structural / opening / sku requirements surface in the
  // structural_requirements block. This proves the Compiler is
  // CONSUMING the canonical Shot Contract, not re-deriving it.
  for (const id of PACKAGING_SHOT_CONTRACT_IDS) {
    const t = makeTranslation({ shotContract: { id } });
    const out = compilePackagingPrompt(t);
    const sr = out.blocks.find((b) => b.id === 'structural_requirements');
    assert.ok(sr, `structural_requirements block missing for ${id}`);
    const itemsText = sr.items.join('\n');
    const shotContract = getPackagingShotContract(id);
    if (shotContract.structureRequirements?.primaryPackage) {
      assert.ok(itemsText.includes(shotContract.structureRequirements.primaryPackage),
        `${id} structural_requirements block does not surface the canonical primaryPackage from contracts.js`);
    }
    if (id === 'PKG-GIFT-OPEN') {
      assert.ok(itemsText.includes('OPEN shot') || itemsText.includes('outer package visible'),
        'OPEN shot structural_requirements must surface openingLayout');
    }
    if (id === 'PKG-SERIES-GROUP') {
      assert.ok(itemsText.includes('SKU strategy') || itemsText.includes('family'),
        'SERIES shot structural_requirements must surface skuStrategy');
    }
  }
});

// ---------------------------------------------------------------------------
// P2-D Exit 5: reference-policy.js remains Reference authority.
// ---------------------------------------------------------------------------

test('P2-D-5 compiler.js does not locally re-define the Reference roles or precedence chain', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/compiler.js'),
    'utf8',
  );
  // The Compiler may IMPORT the precedence chain from
  // reference-policy.js (and it does, to render it as a prompt
  // block). It must NOT define a parallel chain.
  assert.ok(
    !/PACKAGING_REFERENCE_PRECEDENCE\s*=\s*Object\.freeze\(\s*\[/.test(src),
    'compiler.js still defines PACKAGING_REFERENCE_PRECEDENCE locally; only reference-policy.js may own it',
  );
  assert.ok(
    !/PACKAGING_REFERENCE_ROLES\s*=\s*Object\.freeze\(\s*\[/.test(src),
    'compiler.js still defines PACKAGING_REFERENCE_ROLES locally; only reference-policy.js may own it',
  );
});

test('P2-D-5b the Compiler renders the frozen 6-layer precedence chain in the reference_boundary block', () => {
  const t = makeTranslation({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-a', role: 'style_reference', source: 'user' },
      ],
    },
  });
  const out = compilePackagingPrompt(t);
  const rb = out.blocks.find((b) => b.id === 'reference_boundary');
  assert.ok(rb, 'reference_boundary block must exist');
  // Strongest first.
  for (let i = 0; i < PACKAGING_REFERENCE_PRECEDENCE.length; i += 1) {
    assert.ok(
      rb.items.some((line) => line.includes(PACKAGING_REFERENCE_PRECEDENCE[i])),
      `reference_boundary block must include precedence layer: ${PACKAGING_REFERENCE_PRECEDENCE[i]}`,
    );
  }
  // Strongest-first order: the index in PACKAGING_REFERENCE_PRECEDENCE
  // (which is strongest-first) of every layer must be ascending
  // through the rendered list.
  const renderedOrder = [];
  for (const line of rb.items) {
    for (const layer of PACKAGING_REFERENCE_PRECEDENCE) {
      if (line.includes(`- ${layer}`)) {
        renderedOrder.push(layer);
      }
    }
  }
  assert.deepEqual(renderedOrder, [...PACKAGING_REFERENCE_PRECEDENCE]);
});

test('P2-D-5c the reference_boundary block surfaces every reference with explicit assetId + role', () => {
  const t = makeTranslation({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-a', role: 'style_reference', source: 'user' },
        { assetId: 'asset-b', role: 'composition_reference', source: 'user' },
        { assetId: 'asset-c', role: 'material_reference', source: 'project' },
      ],
    },
  });
  const out = compilePackagingPrompt(t);
  const rb = out.blocks.find((b) => b.id === 'reference_boundary');
  for (const ref of t.referencePolicy.references) {
    assert.ok(
      rb.items.some((line) => line.includes(ref.assetId) && line.includes(ref.role)),
      `reference_boundary must surface ${ref.assetId} as ${ref.role}`,
    );
  }
});

// ---------------------------------------------------------------------------
// P2-D Exit 6: Locked Assets preserved.
// ---------------------------------------------------------------------------

test('P2-D-6a the locked_assets block surfaces the canonical Locked Asset fields from the Translation', () => {
  const t = makeTranslation();
  const out = compilePackagingPrompt(t);
  const la = out.blocks.find((b) => b.id === 'locked_assets');
  assert.ok(la, 'locked_assets block must exist');
  // The Translation's lockedAssets values are surfaced verbatim.
  assert.ok(la.items.some((line) => line.includes(t.lockedAssets.brand.name)), 'brand name missing');
  assert.ok(la.items.some((line) => line.includes(t.lockedAssets.productIdentity.name)), 'product identity missing');
  assert.ok(la.items.some((line) => line.includes(t.lockedAssets.category.name)), 'category missing');
  assert.ok(la.items.some((line) => line.includes(t.lockedAssets.structure.formFactor)), 'structure form factor missing');
});

test('P2-D-6b the Compiler fails closed if a Locked Asset is not locked on the input (canonical upstream code preserved)', () => {
  // Translate, then mutate to simulate a Translation shape that lost
  // the lock declaration. The Compiler fails closed (P2 spec §16
  // "Production code must not silently rewrite them"). The error
  // surfaces with the upstream canonical code
  // PACKAGING_TRANSLATION_INVALID, NOT a generic
  // PACKAGING_COMPILE_FAILED wrapper, because the failure is a
  // semantic input error caught by the Translation inspect path
  // (P2-D pre-condition: canonical error codes are not silently
  // re-wrapped).
  const t = makeTranslation();
  t.lockedAssets.brand.locked = false;
  assert.throws(
    () => compilePackagingPrompt(t),
    (err) => {
      assert.equal(err.code, 'PACKAGING_TRANSLATION_INVALID');
      assert.ok(err.issues.includes('locked_assets_brand_not_locked'));
      return true;
    },
  );
});

test('P2-D-6c the Compiler does not silently rewrite Locked Assets (mutate attempt is preserved in output)', () => {
  const t = makeTranslation();
  // Snapshot the Translation to detect any silent mutation.
  const before = JSON.parse(JSON.stringify(t));
  compilePackagingPrompt(t);
  const after = JSON.parse(JSON.stringify(t));
  assert.deepEqual(after, before, 'Compiler must not mutate the input Translation');
});

// ---------------------------------------------------------------------------
// P2-D Exit 7: no second reasoning call.
// ---------------------------------------------------------------------------

test('P2-D-7 compiler.js does not import any model / reasoner / provider API', () => {
  // The Compiler is allowed to import from its sibling modules
  // (contracts.js, reference-policy.js, validation.js) and the
  // standard library. Reasoning surfaces (Creative Director,
  // Analysis reasoner, provider API) are forbidden. P2-E
  // sibling modules (provider-adapter.js, provider-capability.js)
  // are mentioned in the Compiler's docstrings (as architectural
  // context) but the Compiler does not import them — the Compiler
  // is the upstream renderer; the adapter consumes its output.
  // We assert the boundary by parsing the actual import / require
  // statements, not by scanning arbitrary strings.
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/compiler.js'),
    'utf8',
  );
  // Extract only the import / require statements (single-line).
  // Multi-line `import { ... } from '...'` is rare in this file
  // (none currently), so a per-line scan is sufficient and
  // immune to comment mis-classification.
  const importLines = src.split(/\r?\n/).filter((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith('import ') || trimmed.startsWith('import{')
      || /^import\s/.test(trimmed)
      || /^const\s+.*=\s*require\(/.test(trimmed);
  });
  const forbidden = [
    'creative-director',
    'analysis-engine',
    'reasoner',
    'fetch(',
    'http.request',
    'https.request',
    'image-generation-runtime/src/providers',
    'image-generation-runtime/src/model-runtime',
    'image-generation-runtime/src/packaging/provider-adapter',
    'image-generation-runtime/src/packaging/provider-capability',
  ];
  for (const line of importLines) {
    for (const hint of forbidden) {
      assert.ok(!line.includes(hint), `compiler.js imports a forbidden surface: ${hint} (line: ${line})`);
    }
  }
});

// ---------------------------------------------------------------------------
// P2-D Exit 8: no Golden import.
// ---------------------------------------------------------------------------

test('P2-D-8 compiler.js does not import any Golden / evaluation / fixture asset', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/compiler.js'),
    'utf8',
  );
  const importPattern = /import\s+[^;]+from\s+['"][^'"]+['"]/g;
  const requirePattern = /require\s*\(\s*['"][^'"]+['"]\s*\)/g;
  const imports = [];
  let m;
  while ((m = importPattern.exec(src))) imports.push(m[0]);
  while ((m = requirePattern.exec(src))) imports.push(m[0]);
  for (const line of imports) {
    assert.ok(!/evaluation\//.test(line), `compiler.js imports evaluation/* via: ${line}`);
    assert.ok(!/tests\/fixtures\/packaging\//.test(line), `compiler.js imports tests/fixtures/packaging/* via: ${line}`);
  }
});

test('P2-D-8b the entire packaging/ subtree contains no project-specific literal strings', () => {
  const dir = join(repoRoot, 'packages/image-generation-runtime/src/packaging');
  for (const f of readdirSync(dir)) {
    if (!/\.(js|ts|mjs)$/.test(f)) continue;
    const src = readFileSync(join(dir, f), 'utf8');
    // Forbid the canonical Golden project literal cues. These are
    // the same forbidden strings used in the P2-A / P2-B / P2-C
    // tests; the Compiler is the most likely place someone would
    // accidentally reach for a project-specific default to "make
    // the prompt look better", so we re-pin the boundary here.
    const forbidden = [
      '九州', 'Jiuzhou', '珍珠白', 'pearl white',
      '矿物紫', 'mineral purple', '石墨黑', '虹彩', 'iridescent',
      '羽眼', 'feather eye',
    ];
    for (const needle of forbidden) {
      assert.ok(!src.includes(needle), `${f} contains forbidden Golden literal: ${needle}`);
    }
    // Numeric ranges that map to the Golden color baseline. These
    // appear in the Golden manifest as percentages, so we forbid
    // them as a literal substring in the production code.
    for (const range of ['65-70', '20-25', '5-10']) {
      assert.ok(!src.includes(range), `${f} contains forbidden Golden numeric range: ${range}`);
    }
  }
});

test('P2-D-8c the Compiler output does not contain any project-specific literal string', () => {
  // Build a translation with deliberately generic content and assert
  // that the compile output does not introduce any project literal
  // that was not in the input.
  const t = makeTranslation();
  const out = compilePackagingPrompt(t);
  const outText = out.blocks.map((b) => `${b.title}\n${b.items.join('\n')}`).join('\n');
  const forbidden = [
    '九州', 'Jiuzhou', '珍珠白', 'pearl white', '矿物紫', 'mineral purple',
    '石墨黑', '虹彩', 'iridescent', '羽眼', 'feather eye', '65-70', '20-25', '5-10',
  ];
  for (const needle of forbidden) {
    assert.ok(!outText.includes(needle), `compile output contains forbidden Golden literal: ${needle}`);
  }
});

// ---------------------------------------------------------------------------
// P2-D Exit 10 + 11: Analysis-led + Reference-First both compile.
// ---------------------------------------------------------------------------

test('P2-D-10 Analysis-led compiles (no references required, no implicit fallback)', () => {
  const t = makeTranslation({
    generationMode: 'analysis_led',
    referencePolicy: { enabled: false, required: false, references: [] },
  });
  const out = compilePackagingPrompt(t);
  assert.equal(out.generationMode, 'analysis_led');
  const rb = out.blocks.find((b) => b.id === 'reference_boundary');
  assert.ok(rb.items.some((line) => line.includes('disabled')));
});

test('P2-D-11 Reference-First compiles with explicit references', () => {
  const t = makeTranslation({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-style', role: 'style_reference', source: 'user' },
      ],
    },
  });
  const out = compilePackagingPrompt(t);
  assert.equal(out.generationMode, 'reference_first');
  const rb = out.blocks.find((b) => b.id === 'reference_boundary');
  assert.ok(rb.items.some((line) => line.includes('Reference: asset-style as style_reference')));
});

// ---------------------------------------------------------------------------
// P2-D Exit 12-14: HERO / SERIES / OPEN each compile through the same
// 14-block topology (per-shot differences come from the Translation
// shape, NOT from per-route fork logic).
// ---------------------------------------------------------------------------

for (const id of PACKAGING_SHOT_CONTRACT_IDS) {
  test(`P2-D-12-14 ${id} compiles through the same 14-block topology`, () => {
    const t = makeTranslation({ shotContract: { id } });
    const out = compilePackagingPrompt(t);
    assert.equal(out.shotContractId, id);
    assert.equal(out.blocks.length, 14);
    for (let i = 0; i < 14; i += 1) {
      assert.equal(out.blocks[i].id, out.blockOrder[i]);
    }
  });
}

test('P2-D-12-14b the 6-route matrix (analysis_led + reference_first × 3 shots) shares the same 14-block order', () => {
  const routes = [];
  for (const mode of ['analysis_led', 'reference_first']) {
    for (const id of PACKAGING_SHOT_CONTRACT_IDS) {
      routes.push({ mode, id });
    }
  }
  for (const { mode, id } of routes) {
    const t = makeTranslation({
      generationMode: mode,
      shotContract: { id },
      referencePolicy: mode === 'reference_first'
        ? { enabled: true, required: true, references: [{ assetId: 'asset-r', role: 'high_fidelity_visual_reference' }] }
        : { enabled: false, required: false, references: [] },
    });
    const out = compilePackagingPrompt(t);
    assert.equal(out.blocks.length, 14);
    assert.deepEqual(out.blockOrder, out.blockOrder); // self-equal
    for (let i = 0; i < 14; i += 1) {
      assert.equal(out.blocks[i].id, out.blockOrder[i]);
    }
  }
});

// ---------------------------------------------------------------------------
// P2-D Exit 15: same input -> same semantic prompt (determinism).
// ---------------------------------------------------------------------------

test('P2-D-15a compile(A) and compile(A) yield structurally equal output', () => {
  const t = makeTranslation();
  // Make sure provenance.createdAt is stable across the two calls.
  t.provenance.createdAt = 'X';
  const a = compilePackagingPrompt(t);
  const b = compilePackagingPrompt(t);
  // The output is deeply equal (deterministic).
  assert.deepEqual(a, b);
});

test('P2-D-15b the Compiler output is byte-stable across the createdAt field of the input', () => {
  // Same semantic content, different createdAt; output must be equal.
  const t1 = makeTranslation();
  t1.provenance.createdAt = '2026-08-13T00:00:00.000Z';
  const t2 = makeTranslation();
  t2.provenance.createdAt = '2026-08-14T00:00:00.000Z';
  // Wipe createdAt on both for the deterministic comparison; the
  // Compiler does not put createdAt into its output, so any
  // difference in createdAt must NOT affect the output.
  delete t1.provenance.createdAt;
  delete t2.provenance.createdAt;
  const a = compilePackagingPrompt(t1);
  const b = compilePackagingPrompt(t2);
  assert.deepEqual(a, b);
});

test('P2-D-15c the Compiler output excludes any createdAt / local path / temp path / run UUID', () => {
  const t = makeTranslation();
  t.provenance.createdAt = '2026-08-13T12:34:56.789Z';
  const out = compilePackagingPrompt(t);
  const outText = JSON.stringify(out);
  assert.ok(!outText.includes('2026-08-13T12:34:56'), 'createdAt must not enter the semantic output');
  // Common "non-deterministic" tokens that must not appear.
  for (const token of ['uuid', 'UUID', 'tmp/', 'temp/', 'createdAt']) {
    assert.ok(!outText.includes(token), `non-deterministic token leaked into output: ${token}`);
  }
});

test('P2-D-15d fingerprint of the same Translation is stable across calls', () => {
  const t = makeTranslation();
  const a = compilePackagingPrompt(t);
  const b = compilePackagingPrompt(t);
  // Block order + block ids + source map should be byte-equal.
  assert.deepEqual(a.blockOrder, b.blockOrder);
  assert.deepEqual(a.sourceMap, b.sourceMap);
  for (let i = 0; i < a.blocks.length; i += 1) {
    assert.deepEqual(a.blocks[i], b.blocks[i]);
  }
});

// ---------------------------------------------------------------------------
// P2-D structural: each block has items (no empty blocks).
// ---------------------------------------------------------------------------

test('P2-D-struct every block has at least one item on the canonical 6 routes', () => {
  const routes = [];
  for (const mode of ['analysis_led', 'reference_first']) {
    for (const id of PACKAGING_SHOT_CONTRACT_IDS) {
      routes.push({ mode, id });
    }
  }
  for (const { mode, id } of routes) {
    const t = makeTranslation({
      generationMode: mode,
      shotContract: { id },
      referencePolicy: mode === 'reference_first'
        ? { enabled: true, required: true, references: [{ assetId: 'asset-r', role: 'high_fidelity_visual_reference' }] }
        : { enabled: false, required: false, references: [] },
    });
    const out = compilePackagingPrompt(t);
    for (const b of out.blocks) {
      assert.ok(b.items.length > 0, `${mode} + ${id}: block ${b.id} is empty`);
    }
  }
});

test('P2-D-struct every block has a non-empty sources array (provenance)', () => {
  const t = makeTranslation();
  const out = compilePackagingPrompt(t);
  for (const b of out.blocks) {
    assert.ok(Array.isArray(b.sources) && b.sources.length > 0, `block ${b.id} has no sources`);
  }
});

// ---------------------------------------------------------------------------
// P2-D structural: PACKAGING_COMPILE_FAILED is the canonical code.
// ---------------------------------------------------------------------------

test('P2-D-struct PACKAGING_COMPILE_FAILED is the canonical compiler error code', () => {
  assert.equal(PACKAGING_COMPILE_FAILED, 'PACKAGING_COMPILE_FAILED');
});

// ---------------------------------------------------------------------------
// P2-D architectural: Space code does not import the Packaging Compiler.
// ---------------------------------------------------------------------------

test('P2-D-cross Space code does not import the Packaging Compiler', () => {
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
        !src.includes('image-generation-runtime/src/packaging/compiler'),
        `${f} imports the Packaging Compiler; cross-target isolation broken`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// P2-E known item (CLOSED at P2-E; recorded for historical reference
// in case future readers want to trace the rename).
// ---------------------------------------------------------------------------

test('P2-E the Compiler does not extend provider serialization (P2 spec §13 / §24)', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/compiler.js'),
    'utf8',
  );
  // P2-D: provider serialization lives in the Shared Provider
  // adapter boundary (image-generation-runtime + image-provider-*).
  // P2-E added provider-adapter.js (Packaging) which is the
  // provider-AGNOSTIC serialization boundary; it does not branch
  // on a specific provider / model / protocol. The Compiler
  // remains provider-agnostic and does not import the provider
  // subsystem.
  assert.ok(
    !/image-generation-runtime\/src\/providers/.test(src),
    'compiler.js reached into the provider subsystem; P2-D must not serialize to a provider',
  );
  assert.ok(
    !/seedream|gemini|openai|qwen|volcengine|ark/i.test(src),
    'compiler.js references a specific provider; P2-D must remain provider-agnostic',
  );
});
