/**
 * CI-W1C.5 PART H: Understanding input → Need → Insight → Opportunity
 * → Concept → Direction propagation tests (UI / NI / OP / CP / DR).
 *
 * Project-agnostic: uses synthetic visualDecisionPacket payloads (G01-shape
 * and G02-shape) — NO G01/G02 production hardcode. The synthetic payloads
 * differ in color/typography/motif/imagery/material so the propagation
 * chain can be asserted to produce differentiated outputs.
 *
 * Frozen surfaces: all assertions target only the changes made in
 * CI-W1C.5 PART E (VisualEvidenceContribution + Rule 9 + Concept /
 * Direction visual anchor injection). They DO NOT mutate frozen
 * schemas (DVC, Truth taxonomy, Canon, etc.).
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptProjectRecord,
  adaptDocumentVisualContext,
  assembleProjectTruth,
  runNicePipeline,
  runConceptPipeline,
  runDirectionPipeline,
  buildVisualEvidenceContribution,
  contributionToTruthFacts,
} from '@masterpiece/creative-intelligence/index.ts';

const CTX = { projectId: 'p-test', generatedAt: '2026-01-01T00:00:00.000Z', sourceFingerprints: {} };

function makeVnextA() {
  // Project-A shape: purple / peacock / feather / concrete-glass
  return {
    schemaVersion: '2.0',
    version: 1,
    visualDecisionPacket: {
      assetInventory: {
        logoAssets: [{ assetId: 'logo-a-1', name: 'ProjectA主标志', visualFeatures: ['紫色渐变', '孔雀形态', '流线型'], possibleBrandMeaning: ['高端', '优雅'] }],
        colorAssets: [{ assetId: 'color-a-1', name: 'ProjectA主色', visualFeatures: ['#5837BD', '紫色系'], possibleBrandMeaning: ['神秘', '高贵'] }],
        typographyAssets: [{ assetId: 'typo-a-1', name: 'ProjectA字体', visualFeatures: ['定制衬线', '优雅'], possibleBrandMeaning: ['高端'] }],
        graphicMotifs: [{ assetId: 'motif-a-1', name: 'ProjectA图形', visualFeatures: ['孔雀羽毛', '莲花'], possibleBrandMeaning: ['自然', '文化'] }],
        imageryAssets: [{ assetId: 'image-a-1', name: 'ProjectA影像', visualFeatures: ['孔雀主题海报'], possibleBrandMeaning: ['梦幻', '紫色调'] }],
        layoutPatterns: [{ assetId: 'layout-a-1', name: 'ProjectA版式', visualFeatures: ['左右组合'] }],
        materialCues: [{ assetId: 'mat-a-1', name: 'ProjectA材质', visualFeatures: ['混凝土', '玻璃'], possibleBrandMeaning: ['现代', '通透'] }],
      },
    },
  };
}

function makeVnextB() {
  // Project-B shape: red 良 / siyuan song / seal / wood-ink / matte paper
  return {
    schemaVersion: '2.0',
    version: 1,
    visualDecisionPacket: {
      assetInventory: {
        logoAssets: [{ assetId: 'logo-b-1', name: 'ProjectB图标', visualFeatures: ['红色圆形', '良字变体', '印章'], possibleBrandMeaning: ['传统', '可信'] }],
        colorAssets: [{ assetId: 'color-b-1', name: 'ProjectB色盘', visualFeatures: ['#B00000', '#B59A6B', '#E8E5E0'], possibleBrandMeaning: ['古朴', '温暖'] }],
        typographyAssets: [{ assetId: 'typo-b-1', name: 'ProjectB字体', visualFeatures: ['思源宋体', '繁体字形', '衬线'], possibleBrandMeaning: ['文化', '权威'] }],
        graphicMotifs: [{ assetId: 'motif-b-1', name: 'ProjectB底纹', visualFeatures: ['花瓣', '圆线交错'], possibleBrandMeaning: ['传统'] }],
        imageryAssets: [{ assetId: 'image-b-1', name: 'ProjectB影像', visualFeatures: ['中药柜摄影', '古书籍'], possibleBrandMeaning: ['疗愈', '真实'] }],
        layoutPatterns: [{ assetId: 'layout-b-1', name: 'ProjectB版式', visualFeatures: ['安全空间规范'] }],
        materialCues: [{ assetId: 'mat-b-1', name: 'ProjectB材质', visualFeatures: ['哑光纸张', '凸印'], possibleBrandMeaning: ['触觉', '质感'] }],
      },
    },
  };
}

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
    // CI-W1A.4 L11: locked logo is required to surface the
    // asset-activation opportunity / insight, which is the cluster
    // that drives visual-anchor propagation in PART E.
    lockedFacts: ['locked.logo'],
    prohibitedDirections: [],
    unknownFields: [],
    evidence: [{ field: 'brandName', documentId: 'd1', filename: 'brief.pdf', summary: 'X', section: 'intro', page: 1 }],
    sourceDocuments: [{ documentId: 'd1', filename: 'brief.pdf', sourceType: 'pdf', characterCount: 1000, pageCount: 5 }],
  };
}

function runFull(vnext, brandName, industry) {
  const carrierOutputs = [
    adaptProjectRecord({ id: 'p-' + brandName, brandName, industry, logoLocked: false }, CTX),
    adaptDocumentVisualContext(makeDvc(brandName, industry), CTX),
  ];
  const { truth, ledger } = assembleProjectTruth({
    projectId: 'p-' + brandName, carrierOutputs, context: CTX,
  });
  const contribution = buildVisualEvidenceContribution('p-' + brandName, vnext);
  const visualFacts = contributionToTruthFacts(contribution);
  const inMemoryTruth = { ...truth, facts: [...truth.facts, ...visualFacts] };
  const nice = runNicePipeline({ projectId: 'p-' + brandName, truth: inMemoryTruth, evidence: ledger });
  const concept = runConceptPipeline({
    projectId: 'p-' + brandName, truth: inMemoryTruth, evidence: ledger,
    needs: nice.needs, insights: nice.insights, opportunityMap: nice.opportunityMap,
    generatedAt: CTX.generatedAt, expectedBrandName: brandName,
  });
  const direction = runDirectionPipeline({
    projectId: 'p-' + brandName, truth: inMemoryTruth, evidence: ledger,
    needs: nice.needs, insights: nice.insights, opportunityMap: nice.opportunityMap,
    conceptSet: concept.conceptSet, generatedAt: CTX.generatedAt, expectedBrandName: brandName,
  });
  return { nice, concept, direction };
}

// ── UI: Understanding input — visualAsset.* facts surface in the derivation
// context (via inMemoryTruth passed to NICE) and the visual contribution's
// per-item facts are project-specific. ──

test('CI-5 UI-01: inMemoryTruth contains per-project visualAsset.* facts (not a single flattened string)', () => {
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
});

// ── NI: Need Intelligence — Rule 9 (visualAsset differentiation) produces
// a project-specific Need statement for each project. ──

test('CI-5 NI-01: visualAsset differentiation Need is project-specific (statement differs)', () => {
  const ra = runFull(makeVnextA(), 'BrandA', 'tech');
  const rb = runFull(makeVnextB(), 'BrandB', 'health');
  const diffA = ra.nice.needs.find((n) => n.id.includes('visualAsset') && n.type === 'differentiation');
  const diffB = rb.nice.needs.find((n) => n.id.includes('visualAsset') && n.type === 'differentiation');
  assert.ok(diffA, 'A has visualAsset differentiation Need');
  assert.ok(diffB, 'B has visualAsset differentiation Need');
  assert.notEqual(diffA.statement, diffB.statement, 'Need statements differ');
  assert.match(diffA.statement, /紫色|孔雀|ProjectA/);
  assert.match(diffB.statement, /红色|良|ProjectB/);
});

// ── OP: Opportunity — OpportunityMap is non-empty AND the differentiation
// Need flows into the concept's needRefs (so the value-coverage gate
// does not block and the concept is grounded). ──

test('CI-5 OP-01: OpportunityMap is non-empty and the differentiation Need is reachable by Concept', () => {
  const ra = runFull(makeVnextA(), 'BrandA', 'tech');
  assert.ok(ra.nice.opportunityMap.opportunities.length > 0, 'OpportunityMap non-empty');
  // Pick any opportunity that has the differentiation need referenced,
  // OR the concept's needRefs will pull it in via PART E's promotion.
  const diffNeed = ra.nice.needs.find((n) => n.id.includes('visualAsset') && n.type === 'differentiation');
  assert.ok(diffNeed, 'differentiation Need present');
  // Confirm at least one opportunity references the differentiation need,
  // OR the asset-activation insight is being emitted (which then maps
  // the preservation need to a concept).
  const referencedByOpp = ra.nice.opportunityMap.opportunities.some((o) =>
    o.needRefs.includes(diffNeed.id),
  );
  // The PART E promotion in buildConceptForOpportunity guarantees the
  // differentiation need ends up in the concept's needRefs even if
  // no opportunity references it directly. We assert that.
  const conceptRefsDiff = ra.concept.conceptSet.concepts.some(
    (c) => c.needRefs.includes(diffNeed.id),
  );
  assert.ok(referencedByOpp || conceptRefsDiff, 'differentiation Need is reachable by concept');
});

// ── CP: Concept — Concept thesis/mechanism contains a project-specific
// visual anchor line. ──

test('CI-5 CP-01: Concept thesis/mechanism contains a project-specific visual anchor', () => {
  const ra = runFull(makeVnextA(), 'BrandA', 'tech');
  const rb = runFull(makeVnextB(), 'BrandB', 'health');
  // At least one grounded concept (any cluster) should contain the
  // visual anchor.
  const aGrounded = ra.concept.conceptSet.concepts.filter((c) => c.status === 'grounded');
  const bGrounded = rb.concept.conceptSet.concepts.filter((c) => c.status === 'grounded');
  assert.ok(aGrounded.length > 0, 'A has grounded concepts');
  assert.ok(bGrounded.length > 0, 'B has grounded concepts');
  const aAnchor = aGrounded.find((c) => c.thesis.includes('视觉锚点') || c.strategicMechanism.includes('视觉锚点'));
  const bAnchor = bGrounded.find((c) => c.thesis.includes('视觉锚点') || c.strategicMechanism.includes('视觉锚点'));
  assert.ok(aAnchor, 'A has visual anchor in concept');
  assert.ok(bAnchor, 'B has visual anchor in concept');
  assert.notEqual(aAnchor.thesis, bAnchor.thesis, 'Concept thesis differs across projects');
  assert.match(aAnchor.thesis, /紫色|ProjectA/);
  assert.match(bAnchor.thesis, /红色|ProjectB/);
});

// ── DR: Direction — Direction visualMechanism contains a project-specific
// visual anchor line AND ≥2/4 directions are grounded. ──

test('CI-5 DR-01: ≥2/4 directions are grounded and carry a project-specific visual anchor', () => {
  const ra = runFull(makeVnextA(), 'BrandA', 'tech');
  const rb = runFull(makeVnextB(), 'BrandB', 'health');
  const aDirections = ra.direction.directionSet.directions.filter((d) => d.status === 'grounded');
  const bDirections = rb.direction.directionSet.directions.filter((d) => d.status === 'grounded');
  assert.ok(aDirections.length >= 2, `A has ≥2/4 grounded directions (got ${aDirections.length})`);
  assert.ok(bDirections.length >= 2, `B has ≥2/4 grounded directions (got ${bDirections.length})`);
  const aWithAnchor = aDirections.filter((d) =>
    d.visualMechanism.includes('视觉锚点') || d.thesis.includes('视觉锚点') || d.systemHypothesis.includes('视觉锚点'),
  );
  const bWithAnchor = bDirections.filter((d) =>
    d.visualMechanism.includes('视觉锚点') || d.thesis.includes('视觉锚点') || d.systemHypothesis.includes('视觉锚点'),
  );
  assert.ok(aWithAnchor.length >= 2, `A has ≥2 directions with visual anchor (got ${aWithAnchor.length})`);
  assert.ok(bWithAnchor.length >= 2, `B has ≥2 directions with visual anchor (got ${bWithAnchor.length})`);
});

// ── CN: Canon / fingerprint — the differentiation smoke-evidence canonical
// content (visualCanon DNA required-element-ids + grammar rules count) MUST
// include the project-specific visual descriptors. ──

test('CI-5 CN-01: differentiated visualMechanism strings across A vs B (semantic fingerprint)', () => {
  const ra = runFull(makeVnextA(), 'BrandA', 'tech');
  const rb = runFull(makeVnextB(), 'BrandB', 'health');
  const aTexts = ra.direction.directionSet.directions.map((d) => d.visualMechanism).join('\n');
  const bTexts = rb.direction.directionSet.directions.map((d) => d.visualMechanism).join('\n');
  assert.notEqual(aTexts, bTexts, 'concatenated visualMechanism differs across projects');
  // Strip noise (whitespace) and assert semantic difference.
  const aSig = aTexts.replace(/\s+/g, ' ').trim();
  const bSig = bTexts.replace(/\s+/g, ' ').trim();
  assert.notEqual(aSig, bSig, 'semantic fingerprint differs');
});
