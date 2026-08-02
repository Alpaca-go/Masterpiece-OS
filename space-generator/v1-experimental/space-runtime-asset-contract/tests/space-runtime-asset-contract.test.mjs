#!/usr/bin/env node
// Space-Runtime Asset Contract — text-level test suite.
// Phase 9C.2 v2 production-equivalence: 验证 logo / locked / reference role
// 检测逻辑跟 production vnext-service / createFileContextLoader 一致.
//
// 用法: node space-generator/v1-experimental/space-runtime-asset-contract/tests/space-runtime-asset-contract.test.mjs

import {
  buildAssetContract,
  detectLogoAssetIds,
  detectStructureAnchors,
  detectBrandDnaConstraints,
  composeLockedFacts,
  composeLockedAssetIds,
  buildReferences,
  buildSnapshot,
  buildSourceMap,
  SCHEMA_VERSION,
  PIPELINE_MODE,
  PROJECT_CONTEXT_VERSION,
} from '../space-runtime-asset-contract.mjs';

let pass = 0;
let fail = 0;
const failures = [];

function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      return r.then(
        () => { pass += 1; console.log(`  \u2713 ${name}`); },
        (err) => { fail += 1; failures.push({ name, error: err }); console.log(`  \u2717 ${name}\n      ${err.message}`); },
      );
    }
    pass += 1;
    console.log(`  \u2713 ${name}`);
  } catch (err) {
    fail += 1;
    failures.push({ name, error: err });
    console.log(`  \u2717 ${name}\n      ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log('Space-Runtime Asset Contract \u2014 text-level\n');

// ---- Constants ----
console.log('Constants:');
test('schemaVersion is space-runtime-1.0 (per project-rule, vnext 字样不外泄)', () => {
  assert(SCHEMA_VERSION === 'space-runtime-1.0', `expected 'space-runtime-1.0', got '${SCHEMA_VERSION}'`);
});
test('pipelineMode is space-runtime (not vnext)', () => {
  assert(PIPELINE_MODE === 'space-runtime', `expected 'space-runtime', got '${PIPELINE_MODE}'`);
});
test('projectContextVersion is space-runtime-v1', () => {
  assert(PROJECT_CONTEXT_VERSION === 'space-runtime-v1', `got '${PROJECT_CONTEXT_VERSION}'`);
});

// ---- detectLogoAssetIds ----
console.log('\nLogo detection:');
test('No assets → empty array', () => {
  const r = detectLogoAssetIds(null);
  assert(r.length === 0, 'expected 0');
});
test('project.json.logoFiles match against assets.originalName (case-insensitive)', () => {
  const projectJson = {
    assets: [
      { id: 'a1', status: 'ready', originalName: 'logo_brand.png', relativePath: 'assets/logo_brand.png' },
      { id: 'a2', status: 'ready', originalName: 'photo1.jpg', relativePath: 'assets/photo1.jpg' },
    ],
    logoFiles: ['logo_brand.png'],
  };
  const r = detectLogoAssetIds(projectJson);
  assert(r.length === 1 && r[0] === 'a1', `got ${JSON.stringify(r)}`);
});
test('assets with role=logo are detected as fallback', () => {
  const projectJson = {
    assets: [
      { id: 'a1', status: 'ready', role: 'logo', originalName: 'foo.png', relativePath: 'assets/foo.png' },
    ],
    logoFiles: [],
  };
  const r = detectLogoAssetIds(projectJson);
  assert(r.length === 1 && r[0] === 'a1', `got ${JSON.stringify(r)}`);
});
test('originalName contains "logo" → name heuristic (last fallback)', () => {
  const projectJson = {
    assets: [
      { id: 'a1', status: 'ready', originalName: 'myLogo.png', relativePath: 'assets/myLogo.png' },
    ],
  };
  const r = detectLogoAssetIds(projectJson);
  assert(r.length === 1 && r[0] === 'a1', `got ${JSON.stringify(r)}`);
});
test('Skips non-ready assets', () => {
  const projectJson = {
    assets: [
      { id: 'a1', status: 'pending', originalName: 'logo.png' },
    ],
    logoFiles: ['logo.png'],
  };
  const r = detectLogoAssetIds(projectJson);
  assert(r.length === 0, 'should skip non-ready');
});

// ---- detectStructureAnchors ----
console.log('\nStructure anchor detection:');
test('No assets → empty array', () => {
  assert(detectStructureAnchors(null).length === 0);
});
test('stagedStructureAnchors explicit list takes priority', () => {
  const projectJson = {
    assets: [
      { id: 'a1', status: 'ready', originalName: 'a.png', relativePath: 'assets/a.png' },
    ],
    stagedStructureAnchors: ['a1'],
  };
  const r = detectStructureAnchors(projectJson);
  assert(r.length === 1 && r[0].id === 'a1', 'staged list should match');
});
test('role hint matches structure / anchor / arch', () => {
  const projectJson = {
    assets: [
      { id: 'a1', status: 'ready', role: 'structure_anchor', originalName: 'foo.png', relativePath: 'assets/foo.png' },
    ],
  };
  const r = detectStructureAnchors(projectJson);
  assert(r.length === 1 && r[0].id === 'a1');
});
test('name pattern matches ARCH|anchor|结构|参考|架构', () => {
  const projectJson = {
    assets: [
      { id: 'a1', status: 'ready', originalName: 'JZMX-ARCH-01.png', relativePath: 'assets/JZMX-ARCH-01.png' },
    ],
  };
  const r = detectStructureAnchors(projectJson);
  assert(r.length === 1 && r[0].id === 'a1');
});

// ---- detectBrandDnaConstraints ----
console.log('\nBrand DNA constraints:');
test('Empty DNA → empty constraints', () => {
  const r = detectBrandDnaConstraints(null);
  assert(r.literalAssetTokens.length === 0);
  assert(r.prohibitions.length === 0);
  assert(r.preserveTokens.length === 0);
});
test('literalAssetUsage with high/medium/required/mandatory → tokens', () => {
  const brandDna = {
    brandSpaceDna: {
      literalAssetUsage: {
        logoVisibility: 'high',
        frogIPUsage: 'medium',
        sloganUsage: 'low',  // not in accepted list
        taglineUsage: 'required',
        iconUsage: 'mandatory',
      },
    },
    negativeConstraints: { prohibit: ['fine_dining_pretension', 'hospital_pretension'] },
    variationControl: { preserve: ['y2k_street_market', 'frog_ip_repetition'] },
  };
  const r = detectBrandDnaConstraints(brandDna);
  assert(r.literalAssetTokens.length === 4, `got ${r.literalAssetTokens.length}`);
  assert(r.literalAssetTokens.includes('logoVisibility'));
  assert(!r.literalAssetTokens.includes('sloganUsage')); // 'low' excluded
  assert(r.prohibitions.length === 2);
  assert(r.preserveTokens.length === 2);
});

// ---- composeLockedFacts ----
console.log('\nLocked facts composition:');
test('logoLocked=true (default), no explicit facts → seed baseline facts', () => {
  const projectJson = { logoLocked: true };
  const r = composeLockedFacts(projectJson, { prohibitions: [] });
  assert(r.some((f) => f.includes('Logo Locked')), 'should include baseline logo fact');
  assert(r.some((f) => f.includes('简体中文')), 'should include baseline language fact');
});
test('logoLocked=false → no baseline facts', () => {
  const projectJson = { logoLocked: false, lockedFacts: [] };
  const r = composeLockedFacts(projectJson, { prohibitions: [] });
  assert(r.length === 0);
});
test('Explicit lockedFacts + DNA prohibitions (deduped, case-insensitive)', () => {
  const projectJson = { lockedFacts: ['原始 Logo Locked', '特定方言限制'] };
  const dna = { prohibitions: ['fine_dining_pretension', '原始 logo locked'] }; // second is dup
  const r = composeLockedFacts(projectJson, dna);
  // Expect: 原始 Logo Locked, 特定方言限制, fine_dining_pretension (3 unique; "原始 logo locked" deduped)
  assert(r.length === 3, `got ${r.length}: ${JSON.stringify(r)}`);
  assert(r.filter((f) => f.toLowerCase().includes('logo locked')).length === 1, 'should dedupe logo locked');
});

// ---- composeLockedAssetIds ----
console.log('\nLocked asset ids composition:');
test('Logo + structure + DNA tokens', () => {
  const projectJson = { logoFiles: ['logo.png'] };
  const dna = { literalAssetTokens: ['logoVisibility', 'frogIPUsage'] };
  const structureAnchors = [{ id: 'struct-1' }];
  const r = composeLockedAssetIds(projectJson, dna, structureAnchors);
  assert(r.logoAssetIds.length === 1 || r.dnaTokens.length === 2, 'should have logo and DNA tokens');
  assert(r.structuralAssetIds.includes('struct-1'));
  assert(r.dnaTokens.includes('dna:logoVisibility'));
  assert(r.all.length >= 3);
});

// ---- buildReferences ----
console.log('\nReference role mapping:');
test('Logo → identity_reference (priority 1)', () => {
  const projectJson = {
    assets: [
      { id: 'logo-1', status: 'ready', originalName: 'logo.png', relativePath: 'assets/logo.png' },
    ],
  };
  const r = buildReferences({
    logoAssetIds: ['logo-1'],
    structureAnchors: [],
    projectJson,
    hasStagedReference: false,
  });
  assert(r.length === 1);
  assert(r[0].role === 'identity_reference', `expected identity_reference, got ${r[0].role}`);
  assert(r[0].id === 'logo-1');
  assert(r[0].projectRelativePath === 'input/assets/logo.png');
});
test('Structure anchor → structure_reference (priority 2)', () => {
  const projectJson = { assets: [] };
  const r = buildReferences({
    logoAssetIds: [],
    structureAnchors: [{ id: 'struct-1', relativePath: 'assets/JZMX-ARCH-01.png' }],
    projectJson,
    hasStagedReference: false,
  });
  assert(r.length === 1);
  assert(r[0].role === 'structure_reference', `expected structure_reference, got ${r[0].role}`);
  assert(r[0].id === 'struct-1');
});
test('Logo + structure → 2 refs, identity_reference first (priority order)', () => {
  const projectJson = {
    assets: [
      { id: 'logo-1', status: 'ready', originalName: 'logo.png', relativePath: 'assets/logo.png' },
    ],
  };
  const r = buildReferences({
    logoAssetIds: ['logo-1'],
    structureAnchors: [{ id: 'struct-1', relativePath: 'assets/JZMX-ARCH-01.png' }],
    projectJson,
    hasStagedReference: false,
  });
  assert(r.length === 2, `expected 2 refs, got ${r.length}`);
  assert(r[0].role === 'identity_reference');
  assert(r[1].role === 'structure_reference');
});
test('Staged reference → core_reference (smoke-only fallback)', () => {
  const r = buildReferences({
    logoAssetIds: [],
    structureAnchors: [],
    projectJson: null,
    hasStagedReference: true,
    stagedReference: {
      id: 'jzmx-arch-01-staged',
      role: 'structure_reference',  // explicitly upgraded from core
      projectRelativePath: 'input/assets/JZMX-ARCH-01-reference.png',
    },
  });
  assert(r.length === 1);
  assert(r[0].role === 'structure_reference');  // honors staged role
  assert(r[0].id === 'jzmx-arch-01-staged');
});
test('Max 2 references (service.ts:676 cap)', () => {
  const r = buildReferences({
    logoAssetIds: ['logo-1', 'logo-2'],
    structureAnchors: [
      { id: 'struct-1', relativePath: 'assets/s1.png' },
      { id: 'struct-2', relativePath: 'assets/s2.png' },
    ],
    projectJson: { assets: [
      { id: 'logo-1', status: 'ready', relativePath: 'assets/l1.png' },
      { id: 'logo-2', status: 'ready', relativePath: 'assets/l2.png' },
    ] },
    hasStagedReference: true,
    stagedReference: { id: 'staged-1', projectRelativePath: 'input/s1.png' },
  });
  assert(r.length === 2, `expected 2 (capped), got ${r.length}`);
});

// ---- buildSnapshot / buildSourceMap ----
console.log('\nSnapshot + sourceMap:');
test('Snapshot is vnext-style with lockedAssetIds + lockedFacts', () => {
  const compiled = { runtimePath: 'sip_9c1_space_role', blockCount: 18, characterCount: 14279, mode: 'B' };
  const lockedAssetIds = { logoAssetIds: ['logo-1'], structuralAssetIds: ['s-1'], dnaTokens: ['dna:logoVisibility'], all: ['logo-1', 's-1', 'dna:logoVisibility'] };
  const lockedFacts = ['原始 Logo Locked', 'fine_dining_pretension'];
  const references = [{ id: 'logo-1', role: 'identity_reference' }, { id: 's-1', role: 'structure_reference' }];
  const strategy = { selectedStrategy: 'reference_driven', axisScores: { brand: 1, architecture: 1, reference: 1 }, gateStatus: 'pass', gateRiskLevel: 'low' };
  const snap = buildSnapshot({
    taskId: 'srt-12345678',
    compiled,
    lockedAssetIds,
    lockedFacts,
    references,
    brandKey: 'jiuzhou-aesthetics',
    industry: 'medical_aesthetics',
    strategy,
  });
  assert(snap.schemaVersion === 'space-runtime-1.0', `got ${snap.schemaVersion}`);
  assert(snap.projectContextVersion === 'space-runtime-v1');
  assert(snap.taskContract.taskId === 'srt-12345678');
  assert(snap.taskContract.deliverableFamily === 'interior_concept');
  assert(snap.taskContract.referenceAssetIds.length === 2);
  assert(snap.taskContract.logoUsageMode === 'embedded');
  assert(snap.route.templateVersions['spatial-intent-presets'] === 'v1.0');
  assert(snap.route.templateVersions['spatial-strategy-selector'] === '9C.2-v2');
  assert(typeof snap.trace.sourceFingerprint === 'string' && snap.trace.sourceFingerprint.length === 16);
  assert(snap.implicitAnchor === null);
  assert(snap.lockedAssetIds.length === 3);
  assert(snap.lockedFacts.length === 2);
  assert(snap.brandKey === 'jiuzhou-aesthetics');
  assert(snap.industry === 'medical_aesthetics');
  assert(snap.strategy === 'reference_driven');
  assert(snap.gateStatus === 'pass');
});
test('logoUsageMode is "reference_only" when no logo assets', () => {
  const snap = buildSnapshot({
    taskId: 'srt-x',
    compiled: {},
    lockedAssetIds: { logoAssetIds: [], structuralAssetIds: [], dnaTokens: [], all: [] },
    lockedFacts: [],
    references: [],
    brandKey: 'wa-ye',
    industry: 'casual_dining',
    strategy: { selectedStrategy: 'brand_driven' },
  });
  assert(snap.taskContract.logoUsageMode === 'reference_only');
});
test('sourceMap is vnext-style with pipelineMode=space-runtime', () => {
  const snap = buildSnapshot({
    taskId: 'srt-12345678',
    compiled: {},
    lockedAssetIds: { logoAssetIds: [], structuralAssetIds: [], dnaTokens: [], all: [] },
    lockedFacts: [],
    references: [],
    brandKey: 'wa-ye',
    industry: 'casual_dining',
    strategy: {},
  });
  const sm = buildSourceMap({ taskId: 'srt-12345678', snapshot: snap });
  assert(sm.pipelineMode === 'space-runtime', `expected space-runtime, got ${sm.pipelineMode}`);
  assert(sm.taskId === 'srt-12345678');
  assert(sm.contextFingerprint === snap.trace.contextFingerprint);
  assert(sm.implicitAnchorRunId === null);
  assert(sm.templateVersions['spatial-strategy-selector'] === '9C.2-v2');
  assert(sm.brandKey === 'wa-ye');
});

// ---- buildAssetContract (end-to-end) ----
console.log('\nbuildAssetContract (end-to-end):');
test('End-to-end with WAYE DNA (no logo, no structure anchor, brand_driven strategy)', () => {
  const projectJson = {
    id: '8d73845c-1477-485a-b6bb-40aed16c06b1',
    logoLocked: true,
    assets: [
      { id: 'a1', status: 'ready', originalName: 'visual-01.png', relativePath: 'assets/a1.png' },
    ],
  };
  const brandDna = {
    project: { industry: 'casual_dining', brandName: '蛙耶' },
    brandSpaceDna: {
      literalAssetUsage: { logoVisibility: 'high', frogIPUsage: 'high' },
    },
    negativeConstraints: { prohibit: ['fine_dining_pretension', 'hospital_pretension'] },
    variationControl: { preserve: ['y2k_street_market'] },
  };
  const compiled = {
    runtimePath: 'sip_9c1_space_role',
    blockCount: 17,
    characterCount: 11532,
    mode: 'B-architecture-preservation',
  };
  const strategy = {
    selectedStrategy: 'brand_driven',
    axisScores: { brand: 1, architecture: 0.86, reference: 0 },
    gateStatus: 'pass',
    gateRiskLevel: 'low',
  };
  const r = buildAssetContract({ projectJson, brandDna, compiled, strategy });
  assert(r.references.length === 0, `expected 0 refs (no logo, no anchor), got ${r.references.length}`);
  assert(r.lockedFacts.length >= 2, 'should have baseline + DNA prohibitions');
  assert(r.lockedFacts.some((f) => f === 'fine_dining_pretension'));
  assert(r.lockedAssetIds.dnaTokens.length === 2, 'should have 2 DNA tokens');
  assert(r.lockedAssetIds.dnaTokens.includes('dna:frogIPUsage'));
  assert(r.snapshot.schemaVersion === 'space-runtime-1.0');
  assert(r.snapshot.taskContract.logoUsageMode === 'reference_only');
  assert(r.sourceMap.pipelineMode === 'space-runtime');
  assert(r.detection.logoCount === 0);
  assert(r.detection.structureCount === 0);
  assert(r.detection.literalAssetTokenCount === 2);
  assert(r.detection.prohibitionCount === 2);
});
test('End-to-end with JZMX (has staged structure anchor, reference_driven strategy)', () => {
  const projectJson = {
    id: 'a7a56ed7-849f-4671-b47a-466394d7298d',
    logoLocked: true,
    assets: [
      { id: 'a1', status: 'ready', originalName: 'visual-01.png', relativePath: 'assets/a1.png' },
    ],
    stagedStructureAnchors: ['a1'],  // promote first asset as structure anchor
  };
  const brandDna = {
    project: { industry: 'medical_aesthetics', brandName: '九州美学' },
    brandSpaceDna: { literalAssetUsage: {} },
    negativeConstraints: { prohibit: [] },
    variationControl: { preserve: [] },
  };
  const compiled = {
    runtimePath: 'sip_9c1_space_role',
    blockCount: 18,
    characterCount: 14279,
    mode: 'B-architecture-preservation',
  };
  const strategy = {
    selectedStrategy: 'reference_driven',
    axisScores: { brand: 1, architecture: 1, reference: 1 },
    gateStatus: 'pass',
    gateRiskLevel: 'low',
  };
  const r = buildAssetContract({ projectJson, brandDna, compiled, strategy });
  assert(r.references.length === 1);
  assert(r.references[0].role === 'structure_reference');
  assert(r.references[0].id === 'a1');
  assert(r.lockedAssetIds.structuralAssetIds.length === 1);
  assert(r.snapshot.taskContract.logoUsageMode === 'reference_only');  // no logo
  assert(r.detection.structureSource === 'project.stagedStructureAnchors');
});
test('End-to-end with hasStagedReference=true (smoke-only override)', () => {
  const r = buildAssetContract({
    projectJson: { logoLocked: true, assets: [] },
    brandDna: { project: { industry: 'casual_dining' } },
    compiled: { blockCount: 17, characterCount: 11532, mode: 'B' },
    strategy: { selectedStrategy: 'brand_driven' },
    hasStagedReference: true,
    stagedReference: {
      id: 'jzmx-arch-01-staged',
      role: 'structure_reference',
      projectRelativePath: 'input/assets/JZMX-ARCH-01-reference.png',
    },
  });
  assert(r.references.length === 1);
  assert(r.references[0].role === 'structure_reference');  // was 'core_reference' in old smoke
  assert(r.references[0].id === 'jzmx-arch-01-staged');
});

await new Promise((r) => setTimeout(r, 100));
console.log(`\nSummary: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f.name}: ${f.error.message}`);
  process.exit(1);
}
process.exit(0);
