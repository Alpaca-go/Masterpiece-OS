/**
 * CI-W1C.5 PART H (REWRITTEN for CI-W1C.6): Understanding input → Need
 * → Insight → Opportunity → Concept → Direction propagation tests
 * (UI / NI / OP / CP / DR).
 *
 * Project-agnostic: uses synthetic visualDecisionPacket payloads
 * (G01-shape and G02-shape) — NO G01/G02 production hardcode.
 *
 * CI-W1C.6 PART B demoted the CI-W1C.5 PART E behavior:
 *   - Rule 9 now emits a `preservation` Need (was `differentiation`) with
 *     `coverageRequirement: 'constraint_only'` (was `'required'`). The
 *     visual descriptors no longer appear in the Need statement.
 *   - Concept generation no longer auto-promotes a visualAsset
 *     differentiation Need into the concept's needRefs.
 *   - Concept no longer appends a "视觉锚点：..." suffix to
 *     thesis/mechanism.
 *   - Direction no longer appends a "视觉锚点：..." suffix to
 *     thesis/visualMechanism/systemHypothesis.
 *
 * The new tests assert the demoted behavior:
 *   - visualAsset.* facts REMAIN traceable evidence (UI).
 *   - Rule 9 emits a preservation Need (NOT a differentiation Need) with
 *     constraint_only coverage (NI).
 *   - OpportunityMap is non-empty; the preservation Need is reachable
 *     but does NOT auto-promote into Concept/Direction coverage (OP).
 *   - Concept thesis/mechanism does NOT contain visual anchor text
 *     from legacy visual descriptors (CP).
 *   - Direction visualMechanism does NOT contain visual anchor text;
 *     ≥2/4 directions grounded via planning-first semantics (DR).
 *   - Direction visualMechanism strings are TEMPLATE-DRIVEN (CN): two
 *     projects with the same cluster + family produce the same
 *     template text (no per-project visual anchor pollution).
 *
 * Frozen surfaces: all assertions target only the changes made in
 * CI-W1C.6 PART B. They DO NOT mutate frozen schemas (DVC, Truth
 * taxonomy, Canon, etc.).
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptProjectRecord,
  adaptCurrentProjectCorePack,
  adaptDocumentVisualContext,
  assembleProjectTruth,
  runNicePipeline,
  runConceptPipeline,
  runDirectionPipeline,
  buildVisualEvidenceContribution,
  contributionToTruthFacts,
} from '@masterpiece/creative-intelligence/index.ts';

const CTX = (projectId) => ({ projectId, generatedAt: '2026-01-01T00:00:00.000Z', sourceFingerprints: {} });

function makeDvc(brandName, industry) {
  return {
    schemaVersion: '1.0',
    sourceRunId: 'r-' + brandName,
    generatedAt: '2026-01-01T00:00:00.000Z',
    brandName,
    industry,
    brandRole: `${brandName} is a premium service provider in ${industry}.`,
    products: ['service'],
    services: ['consulting'],
    targetAudience: ['general'],
    pricePositioning: 'premium',
    businessModel: 'B2B',
    brandPersonality: ['professional'],
    visualPreferences: ['minimal'],
    requiredTouchpoints: ['logo'],
    lockedFacts: ['locked.logo'],
    prohibitedDirections: [],
    unknownFields: [],
    evidence: [{ field: 'brandName', documentId: 'd1', filename: 'brief.pdf', summary: 'X', section: 'intro', page: 1 }],
    sourceDocuments: [{ documentId: 'd1', filename: 'brief.pdf', sourceType: 'pdf', characterCount: 1000, pageCount: 5 }],
  };
}

function makeVnextA() {
  return {
    schemaVersion: '2.0', version: 1,
    visualDecisionPacket: {
      assetInventory: {
        logoAssets: [{ assetId: 'logo-a-1', name: 'ProjectA主标志', visualFeatures: ['紫色渐变', '孔雀形态'], possibleBrandMeaning: ['高端'] }],
        colorAssets: [{ assetId: 'color-a-1', name: 'ProjectA主色', visualFeatures: ['#5837BD', '紫色系'], possibleBrandMeaning: ['高贵'] }],
        typographyAssets: [{ assetId: 'typo-a-1', name: 'ProjectA字体', visualFeatures: ['定制衬线'], possibleBrandMeaning: ['高端'] }],
        graphicMotifs: [{ assetId: 'motif-a-1', name: 'ProjectA图形', visualFeatures: ['孔雀羽毛', '莲花'], possibleBrandMeaning: ['自然'] }],
        imageryAssets: [{ assetId: 'image-a-1', name: 'ProjectA影像', visualFeatures: ['孔雀主题海报'], possibleBrandMeaning: ['梦幻'] }],
        layoutPatterns: [{ assetId: 'layout-a-1', name: 'ProjectA版式', visualFeatures: ['左右组合'] }],
        materialCues: [{ assetId: 'mat-a-1', name: 'ProjectA材质', visualFeatures: ['混凝土', '玻璃'], possibleBrandMeaning: ['现代'] }],
      },
    },
  };
}

function makeVnextB() {
  return {
    schemaVersion: '2.0', version: 1,
    visualDecisionPacket: {
      assetInventory: {
        logoAssets: [{ assetId: 'logo-b-1', name: 'ProjectB图标', visualFeatures: ['红色圆形', '良字变体', '印章'], possibleBrandMeaning: ['传统'] }],
        colorAssets: [{ assetId: 'color-b-1', name: 'ProjectB色盘', visualFeatures: ['#B00000', '#B59A6B'], possibleBrandMeaning: ['古朴'] }],
        typographyAssets: [{ assetId: 'typo-b-1', name: 'ProjectB字体', visualFeatures: ['思源宋体', '繁体字形'], possibleBrandMeaning: ['文化'] }],
        graphicMotifs: [{ assetId: 'motif-b-1', name: 'ProjectB底纹', visualFeatures: ['花瓣', '圆线交错'], possibleBrandMeaning: ['传统'] }],
        imageryAssets: [{ assetId: 'image-b-1', name: 'ProjectB影像', visualFeatures: ['中药柜摄影'], possibleBrandMeaning: ['疗愈'] }],
        layoutPatterns: [{ assetId: 'layout-b-1', name: 'ProjectB版式', visualFeatures: ['安全空间规范'] }],
        materialCues: [{ assetId: 'mat-b-1', name: 'ProjectB材质', visualFeatures: ['哑光纸张', '凸印'], possibleBrandMeaning: ['触觉'] }],
      },
    },
  };
}

function runFull(vnext, brandName, industry) {
  const projectId = 'p-' + brandName;
  const carrierOutputs = [
    adaptProjectRecord({ id: projectId, brandName, industry, logoLocked: false }, CTX(projectId)),
    adaptCurrentProjectCorePack({
      projectId, brandName, industry,
      brandPositioning: `${brandName} is a premium service provider in ${industry}.`,
      targetAudience: ['general'],
      productFacts: ['service'],
      logoAssetIds: [`logo-${brandName.toLowerCase()}-1`],
    }, CTX(projectId)),
    adaptDocumentVisualContext(makeDvc(brandName, industry), CTX(projectId)),
  ];
  const { truth, ledger } = assembleProjectTruth({ projectId, carrierOutputs, context: CTX(projectId) });
  const contribution = buildVisualEvidenceContribution(projectId, vnext);
  const visualFacts = contributionToTruthFacts(contribution);
  const inMemoryTruth = { ...truth, facts: [...truth.facts, ...visualFacts] };
  const nice = runNicePipeline({ projectId, truth: inMemoryTruth, evidence: ledger });
  const concept = runConceptPipeline({
    projectId, truth: inMemoryTruth, evidence: ledger,
    needs: nice.needs, insights: nice.insights, opportunityMap: nice.opportunityMap,
    generatedAt: CTX(projectId).generatedAt, expectedBrandName: brandName,
  });
  const direction = runDirectionPipeline({
    projectId, truth: inMemoryTruth, evidence: ledger,
    needs: nice.needs, insights: nice.insights, opportunityMap: nice.opportunityMap,
    conceptSet: concept.conceptSet, generatedAt: CTX(projectId).generatedAt, expectedBrandName: brandName,
  });
  return { nice, concept, direction, inMemoryTruth };
}

// ── UI-01: visualAsset.* facts are still traceable evidence (per spec)
// but are NOT auto-promoted to positive future-style coverage. ──

test('CI-5 UI-01: inMemoryTruth contains per-project visualAsset.* facts (still traceable evidence)', () => {
  const a = buildVisualEvidenceContribution('p-a', makeVnextA());
  const b = buildVisualEvidenceContribution('p-b', makeVnextB());
  const fa = contributionToTruthFacts(a);
  const fb = contributionToTruthFacts(b);
  assert.ok(fa.some((f) => f.key === 'visualAsset.logo'), 'A has visualAsset.logo');
  assert.ok(fb.some((f) => f.key === 'visualAsset.logo'), 'B has visualAsset.logo');
  // Per-item: A's color fact value should mention "#5837BD" / purple; B's
  // should mention "#B00000" / red-wood.
  const aColor = fa.find((f) => f.key === 'visualAsset.color');
  const bColor = fb.find((f) => f.key === 'visualAsset.color');
  assert.match(JSON.stringify(aColor.value), /#5837BD|紫色/);
  assert.match(JSON.stringify(bColor.value), /#B00000|#B59A6B|红色/);
  // VisualEvidenceContribution is PRESERVED (not deleted).
  assert.equal(a.observedFacts.length > 0, true, 'A observed facts preserved');
  assert.equal(b.observedFacts.length > 0, true, 'B observed facts preserved');
});

// ── NI-01 (CI-W1C.6 demoted): Rule 9 emits a PRESERVATION Need (not
// differentiation) with constraint_only coverage. The Need statement
// does NOT embed visual descriptors as positive future-style. ──

test('CI-5 NI-01: visualAsset preservation Need is emitted with constraint_only coverage (NOT differentiation)', () => {
  const ra = runFull(makeVnextA(), 'BrandA', 'tech');
  const rb = runFull(makeVnextB(), 'BrandB', 'health');
  // The Rule 9 Need has type='preservation' (not 'differentiation').
  const presA = ra.nice.needs.find((n) => n.id.includes('visualAsset') && n.type === 'preservation');
  const presB = rb.nice.needs.find((n) => n.id.includes('visualAsset') && n.type === 'preservation');
  assert.ok(presA, 'A has visualAsset preservation Need (Rule 9 demoted)');
  assert.ok(presB, 'B has visualAsset preservation Need (Rule 9 demoted)');
  // The Need has coverageRequirement='constraint_only' (NOT 'required').
  assert.equal(presA.coverageRequirement, 'constraint_only',
    'A preservation Need has coverageRequirement=constraint_only (demoted from required)');
  assert.equal(presB.coverageRequirement, 'constraint_only',
    'B preservation Need has coverageRequirement=constraint_only (demoted from required)');
  // The Need statement does NOT embed visual descriptors as positive
  // future-style (the CI-W1C.5 PART E behaviour is demoted).
  // Specifically, the statement must NOT contain a "Differentiate creative
  // direction via project-specific visual assets: ..." pattern.
  assert.doesNotMatch(presA.statement, /Differentiate creative direction via project-specific visual assets:/);
  assert.doesNotMatch(presB.statement, /Differentiate creative direction via project-specific visual assets:/);
  // The statement is intentionally generic.
  assert.match(presA.statement, /Preserve legacy visual evidence/);
  assert.match(presB.statement, /Preserve legacy visual evidence/);
  // The Need factRefs still include visualAsset.* facts (for trace).
  assert.ok(presA.factRefs.some((f) => f.startsWith('visualAsset.')),
    'A preservation Need factRefs include visualAsset.* (traceable)');
  assert.ok(presB.factRefs.some((f) => f.startsWith('visualAsset.')),
    'B preservation Need factRefs include visualAsset.* (traceable)');
});

// ── OP-01 (CI-W1C.6 demoted): OpportunityMap is non-empty; the
// preservation Need is reachable but does NOT auto-promote into
// Concept/Direction coverage targets. ──

test('CI-5 OP-01: OpportunityMap is non-empty and the preservation Need is reachable but NOT auto-promoted', () => {
  const ra = runFull(makeVnextA(), 'BrandA', 'tech');
  assert.ok(ra.nice.opportunityMap.opportunities.length > 0, 'OpportunityMap non-empty');
  const presNeed = ra.nice.needs.find((n) => n.id.includes('visualAsset') && n.type === 'preservation');
  assert.ok(presNeed, 'preservation Need present');
  // The preservation Need has coverageRequirement='constraint_only',
  // which means it is NOT a required coverage target for Concept.
  // The value-coverage gate (Gate 5) does NOT block on a preservation
  // Need, even when the need is referenced.
  assert.equal(presNeed.coverageRequirement, 'constraint_only',
    'preservation Need is NOT a required coverage target');
  // Confirm at least one opportunity is reachable OR the concept is
  // not blocked by the value-coverage gate. The actual differentiation
  // Need (from Rule 5 brandRole+industry, NOT Rule 9 visualAsset) drives
  // coverage; the preservation Need is silent.
  const conceptsNotBlocked = ra.concept.conceptSet.concepts.filter((c) => c.status !== 'blocked');
  assert.ok(conceptsNotBlocked.length > 0,
    'At least one concept is not blocked (preservation Need does not block)');
});

// ── CP-01 (CI-W1C.6 demoted): Concept thesis/mechanism does NOT
// contain the "视觉锚点" suffix from legacy visual descriptors.
// CI-W1C.5 PART E auto-injection is removed. ──

test('CI-5 CP-01: Concept thesis/mechanism does NOT contain legacy visual anchor suffix', () => {
  const ra = runFull(makeVnextA(), 'BrandA', 'tech');
  const rb = runFull(makeVnextB(), 'BrandB', 'health');
  const aGrounded = ra.concept.conceptSet.concepts.filter((c) => c.status === 'grounded');
  const bGrounded = rb.concept.conceptSet.concepts.filter((c) => c.status === 'grounded');
  assert.ok(aGrounded.length > 0, 'A has grounded concepts');
  assert.ok(bGrounded.length > 0, 'B has grounded concepts');
  // CI-W1C.5 PART E auto-injection removed: no "视觉锚点：..." suffix.
  const aWithAnchor = aGrounded.find((c) => c.thesis.includes('视觉锚点') || c.strategicMechanism.includes('视觉锚点'));
  const bWithAnchor = bGrounded.find((c) => c.thesis.includes('视觉锚点') || c.strategicMechanism.includes('视觉锚点'));
  assert.equal(aWithAnchor, undefined, 'A has no Concept with 视觉锚点 suffix (CI-W1C.6 demoted)');
  assert.equal(bWithAnchor, undefined, 'B has no Concept with 视觉锚点 suffix (CI-W1C.6 demoted)');
  // Concept factRefs MAY still include visualAsset.* (for trace / evidence).
  const aConceptWithVisualRefs = aGrounded.find((c) =>
    c.factRefs.some((fid) => fid.startsWith('visualAsset.')),
  );
  assert.ok(aConceptWithVisualRefs,
    'A Concept factRefs include visualAsset.* (still traceable, no auto-promotion)');
});

// ── DR-01 (CI-W1C.6 demoted): Direction visualMechanism does NOT
// contain the "视觉锚点" suffix. ≥2/4 directions grounded via
// planning-first semantics. ──

test('CI-5 DR-01: Direction visualMechanism does NOT contain legacy visual anchor suffix; ≥2/4 grounded', () => {
  const ra = runFull(makeVnextA(), 'BrandA', 'tech');
  const rb = runFull(makeVnextB(), 'BrandB', 'health');
  const aDirections = ra.direction.directionSet.directions.filter((d) => d.status === 'grounded');
  const bDirections = rb.direction.directionSet.directions.filter((d) => d.status === 'grounded');
  assert.ok(aDirections.length >= 2, `A has ≥2/4 grounded directions (got ${aDirections.length})`);
  assert.ok(bDirections.length >= 2, `B has ≥2/4 grounded directions (got ${bDirections.length})`);
  // No "视觉锚点：..." suffix in any direction.
  const aWithAnchor = aDirections.find((d) =>
    d.visualMechanism.includes('视觉锚点') || d.thesis.includes('视觉锚点') || d.systemHypothesis.includes('视觉锚点'),
  );
  const bWithAnchor = bDirections.find((d) =>
    d.visualMechanism.includes('视觉锚点') || d.thesis.includes('视觉锚点') || d.systemHypothesis.includes('视觉锚点'),
  );
  assert.equal(aWithAnchor, undefined, 'A has no Direction with 视觉锚点 suffix (CI-W1C.6 demoted)');
  assert.equal(bWithAnchor, undefined, 'B has no Direction with 视觉锚点 suffix (CI-W1C.6 demoted)');
});

// ── CN-01 (CI-W1C.6 demoted): Direction visualMechanism strings are
// template-driven. Two projects with the same cluster + family produce
// the SAME visualMechanism (no per-project visual anchor pollution).
// This is the inverse of the CI-W1C.5 PART E semantic fingerprint
// assertion: under CI-W1C.5, A's and B's visualMechanism differed
// (because of the visual anchor). Under CI-W1C.6, they are EQUAL
// (template-driven; planning-first semantics drive the differentiation). ──

test('CI-5 CN-01: Direction visualMechanism is template-driven (no per-project visual anchor pollution)', () => {
  const ra = runFull(makeVnextA(), 'BrandA', 'tech');
  const rb = runFull(makeVnextB(), 'BrandB', 'health');
  // Sort by direction id so we pair directions with the same family/cluster.
  const aDirs = [...ra.direction.directionSet.directions].sort((x, y) => x.id.localeCompare(y.id));
  const bDirs = [...rb.direction.directionSet.directions].sort((x, y) => x.id.localeCompare(y.id));
  assert.ok(aDirs.length > 0, 'A has directions');
  assert.ok(bDirs.length > 0, 'B has directions');
  assert.equal(aDirs.length, bDirs.length, 'A and B have the same number of directions');
  // Pair by id and compare visualMechanism: the per-direction template
  // text is the same across A and B (the family template is the only
  // source of visualMechanism text).
  let sameCount = 0;
  for (let i = 0; i < aDirs.length; i += 1) {
    const aVM = aDirs[i].visualMechanism;
    const bVM = bDirs[i].visualMechanism;
    if (aVM === bVM) sameCount += 1;
  }
  assert.ok(sameCount === aDirs.length,
    `All ${aDirs.length} direction visualMechanism strings are template-equal across A and B (got ${sameCount})`);
  // Direction systemHypothesis: same template equality.
  let sameSH = 0;
  for (let i = 0; i < aDirs.length; i += 1) {
    if (aDirs[i].systemHypothesis === bDirs[i].systemHypothesis) sameSH += 1;
  }
  assert.ok(sameSH === aDirs.length,
    `All ${aDirs.length} direction systemHypothesis strings are template-equal across A and B (got ${sameSH})`);
});
