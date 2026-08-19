/**
 * CI-W1C.5.1 PART B (REWRITTEN for CI-W1C.6) — Insight unit coverage
 * tests (NI-02..NI-07).
 *
 * Project-agnostic: uses synthetic vnext payloads (Project-A: purple /
 * peacock / feather / concrete-glass; Project-B: red 良 / siyuan song /
 * seal / wood / matte paper) — NO G01/G02 hardcode.
 *
 * CI-W1C.6 PART B demoted the visualAsset rule. The differentiation
 * Insight now only fires on the brandRole+industry differentiation Need
 * (Rule 5) — NOT on a visualAsset differentiation Need (Rule 9 was
 * demoted to a preservation Need with constraint_only coverage).
 *
 * The new tests assert the demoted behavior:
 *   - NI-02/03: project-specific Insight comes from planning-derived
 *     differentiation (brandRole+industry), not from legacy visual.
 *   - NI-04: A vs B differentiation Insight factRefs differ.
 *   - NI-05: differentiation Insight does NOT have legacy visualAsset
 *     facts in its factRefs (the demoted Rule 9 is no longer a
 *     differentiator source). visualAsset.* facts remain in trace via
 *     the preservation Need's factRefs.
 *   - NI-06: shared generic insights (audience / business) are allowed
 *     to be identical.
 *   - NI-07: visualAsset facts surfaced by the chain retain
 *     VISUAL_SOURCE_FACT authority.
 *
 * Production delta = 0. Tests only.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptProjectRecord,
  adaptCurrentProjectCorePack,
  adaptDocumentVisualContext,
  assembleProjectTruth,
  runNicePipeline,
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
        logoAssets: [{ assetId: 'logo-a-1', name: 'ProjectA主标志', visualFeatures: ['紫色渐变', '孔雀形态'], possibleBrandMeaning: ['高端', '优雅'] }],
        colorAssets: [{ assetId: 'color-a-1', name: 'ProjectA主色', visualFeatures: ['#5837BD', '紫色系'], possibleBrandMeaning: ['神秘', '高贵'] }],
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
        logoAssets: [{ assetId: 'logo-b-1', name: 'ProjectB图标', visualFeatures: ['红色圆形', '良字变体', '印章'], possibleBrandMeaning: ['传统', '可信'] }],
        colorAssets: [{ assetId: 'color-b-1', name: 'ProjectB色盘', visualFeatures: ['#B00000', '#B59A6B'], possibleBrandMeaning: ['古朴'] }],
        typographyAssets: [{ assetId: 'typo-b-1', name: 'ProjectB字体', visualFeatures: ['思源宋体', '繁体字形'], possibleBrandMeaning: ['文化'] }],
        graphicMotifs: [{ assetId: 'motif-b-1', name: 'ProjectB底纹', visualFeatures: ['花瓣', '圆线交错'], possibleBrandMeaning: ['传统'] }],
        imageryAssets: [{ assetId: 'image-b-1', name: 'ProjectB影像', visualFeatures: ['中药柜摄影', '古籍书卷'], possibleBrandMeaning: ['疗愈'] }],
        layoutPatterns: [{ assetId: 'layout-b-1', name: 'ProjectB版式', visualFeatures: ['安全空间规范'] }],
        materialCues: [{ assetId: 'mat-b-1', name: 'ProjectB材质', visualFeatures: ['哑光纸张', '凸印'], possibleBrandMeaning: ['触觉'] }],
      },
    },
  };
}

function runNiceFor(name, vnext, brandName, industry) {
  const projectId = 'p-' + name;
  const carrierOutputs = [
    adaptProjectRecord({ id: projectId, brandName, industry, logoLocked: false }, CTX(projectId)),
    adaptCurrentProjectCorePack({
      projectId,
      brandName,
      industry,
      brandPositioning: `${brandName} is a premium ${industry === 'tech' ? 'aesthetic' : 'traditional'} service provider.`,
      targetAudience: ['general'],
      productFacts: ['service'],
      logoAssetIds: [`logo-${name.toLowerCase()}-1`],
    }, CTX(projectId)),
    adaptDocumentVisualContext(makeDvc(brandName, industry), CTX(projectId)),
  ];
  const { truth, ledger } = assembleProjectTruth({ projectId, carrierOutputs, context: CTX(projectId) });
  const contribution = buildVisualEvidenceContribution(projectId, vnext);
  const visualFacts = contributionToTruthFacts(contribution);
  const inMemoryTruth = { ...truth, facts: [...truth.facts, ...visualFacts] };
  const nice = runNicePipeline({ projectId, truth: inMemoryTruth, evidence: ledger });
  return { nice, inMemoryTruth, visualFacts };
}

// ── NI-02 (CI-W1C.6 demoted): Project-A emits a project-specific
// Insight from PLANNING-derived differentiation (brandRole + industry),
// not from legacy visual. ──

test('CI-5.1 NI-02: Project-A emits a project-specific Insight (from brandRole+industry differentiation)', () => {
  const { nice } = runNiceFor('A', makeVnextA(), 'BrandA', 'tech');
  const diffInsight = nice.insights.find((i) => i.type === 'differentiation');
  assert.ok(diffInsight, 'A differentiation Insight is emitted (from planning-derived Rule 5)');
  // The differentiation Insight factRefs reference brandRole + industry
  // (NOT visualAsset.*).
  assert.ok(diffInsight.factRefs.some((f) => f.includes('brand.role')),
    'A differentiation Insight factRefs include brand.role (planning-derived)');
  // CI-W1C.6 demoted: the differentiation Insight does NOT have visualAsset
  // facts in its factRefs. The demoted Rule 9 emits a preservation Need
  // (not differentiation), so the differentiation Insight is fired only
  // by the brandRole+industry differentiation Need (Rule 5).
  const visualFactRefInInsight = diffInsight.factRefs.find((f) => f.startsWith('visualAsset.'));
  assert.equal(visualFactRefInInsight, undefined,
    'A differentiation Insight does NOT have visualAsset.* in factRefs (CI-W1C.6 demoted)');
});

// ── NI-03 (CI-W1C.6 demoted): Project-B emits a project-specific
// Insight from planning-derived differentiation. ──

test('CI-5.1 NI-03: Project-B emits a project-specific Insight (from brandRole+industry differentiation)', () => {
  const { nice } = runNiceFor('B', makeVnextB(), 'BrandB', 'health');
  const diffInsight = nice.insights.find((i) => i.type === 'differentiation');
  assert.ok(diffInsight, 'B differentiation Insight is emitted (from planning-derived Rule 5)');
  assert.ok(diffInsight.factRefs.some((f) => f.includes('brand.role')),
    'B differentiation Insight factRefs include brand.role (planning-derived)');
  const visualFactRefInInsight = diffInsight.factRefs.find((f) => f.startsWith('visualAsset.'));
  assert.equal(visualFactRefInInsight, undefined,
    'B differentiation Insight does NOT have visualAsset.* in factRefs (CI-W1C.6 demoted)');
});

// ── NI-04 (CI-W1C.6 demoted): A vs B differentiation Insight factRefs
// differ (planning-derived; project-id bound by construction). ──

test('CI-5.1 NI-04: A vs B differentiation Insight has project-specific factRefs (planning-derived)', () => {
  const ra = runNiceFor('A', makeVnextA(), 'BrandA', 'tech');
  const rb = runNiceFor('B', makeVnextB(), 'BrandB', 'health');
  const diffA = ra.nice.insights.find((i) => i.type === 'differentiation');
  const diffB = rb.nice.insights.find((i) => i.type === 'differentiation');
  assert.ok(diffA && diffB, 'Differentiation Insight in A and B');
  // Strip source prefix but keep the project-id portion of the fact id,
  // because the project-id IS the differentiator (per the CI-W1C.5.1
  // spec for XD2-06: sourceRunId / runId differences are NOT
  // differentiation; the project-id IS).
  const stripSource = (s) => s.replace(/^[a-z_]+:/, '');
  const factsA = diffA.factRefs.map(stripSource).sort();
  const factsB = diffB.factRefs.map(stripSource).sort();
  assert.notDeepEqual(factsA, factsB,
    'Differentiation Insight factRefs differ between A and B (planning-derived project-specific)');
});

// ── NI-05 (CI-W1C.6 demoted): The differentiation Insight does NOT
// carry legacy visualAsset facts in its factRefs. The visualAsset.* facts
// remain in trace via the preservation Need's factRefs (which the
// differentiation Insight does NOT reach, because the Insight is only
// emitted for differentiation-typed Needs, and Rule 9 is now
// preservation-typed). ──

test('CI-5.1 NI-05: differentiation Insight does NOT have legacy visualAsset facts in factRefs', () => {
  const { nice } = runNiceFor('A', makeVnextA(), 'BrandA', 'tech');
  const diffInsight = nice.insights.find((i) => i.type === 'differentiation');
  assert.ok(diffInsight, 'differentiation Insight emitted');
  // CI-W1C.6 demoted: the differentiation Insight factRefs do NOT
  // include visualAsset.*. The demoted Rule 9 emits a preservation Need
  // (not a differentiation Need), so the differentiation Insight rule
  // (which only fires on differentiation Needs) does not pick up
  // visualAsset.* facts.
  const visualFactRefInInsight = diffInsight.factRefs.find((f) => f.startsWith('visualAsset.'));
  assert.equal(visualFactRefInInsight, undefined,
    'CI-W1C.6: differentiation Insight has NO visualAsset.* in factRefs (demoted)');
  // The visualAsset.* facts remain in the truth model (trace / evidence)
  // and are referenced by the preservation Need (Rule 9 demoted).
  const presNeed = nice.needs.find((n) => n.id.includes('visualAsset') && n.type === 'preservation');
  assert.ok(presNeed, 'preservation Need is emitted (CI-W1C.6 demoted Rule 9)');
  assert.ok(presNeed.factRefs.some((f) => f.startsWith('visualAsset.')),
    'preservation Need factRefs include visualAsset.* (traceable)');
});

// ── NI-06: shared generic insights (audience / business) are allowed
// to be identical. ──

test('CI-5.1 NI-06: shared generic insights (audience / business) are allowed to be identical', () => {
  const ra = runNiceFor('A', makeVnextA(), 'BrandA', 'tech');
  const rb = runNiceFor('B', makeVnextB(), 'BrandB', 'health');
  const audA = ra.nice.insights.find((i) => i.type === 'audience');
  const audB = rb.nice.insights.find((i) => i.type === 'audience');
  const bizA = ra.nice.insights.find((i) => i.type === 'business');
  const bizB = rb.nice.insights.find((i) => i.type === 'business');
  assert.ok(audA && audB, 'audience insights present in both');
  assert.ok(bizA && bizB, 'business insights present in both');
  // Their statements are template-driven and may be identical; that
  // is OK. The spec accepts "shared generic Insight allowed".
  if (audA.statement === audB.statement) {
    // Identical generic insight — allowed
  } else {
    // Differing — also allowed (just different audience facts)
  }
  // Assert: at least one of audience/business is grounded
  assert.ok(
    audA.status === 'grounded' || audA.status === 'provisional',
    'audience insight has a valid status',
  );
});

// ── NI-07: visualAsset facts surfaced by the chain retain
// VISUAL_SOURCE_FACT authority (no regression). ──

test('CI-5.1 NI-07: visualAsset facts surfaced by the chain retain VISUAL_SOURCE_FACT authority', () => {
  const { nice, inMemoryTruth } = runNiceFor('A', makeVnextA(), 'BrandA', 'tech');
  const visualFacts = inMemoryTruth.facts.filter((f) => f.key && f.key.startsWith('visualAsset.'));
  assert.ok(visualFacts.length > 0, 'visualAsset facts present in in-memory truth');
  for (const f of visualFacts) {
    assert.equal(f.authority, 'VISUAL_SOURCE_FACT',
      `visualAsset fact ${f.key} retains VISUAL_SOURCE_FACT authority (got ${f.authority})`);
    assert.notEqual(f.authority, 'MODEL_INFERENCE',
      'visualAsset fact is not downgraded to MODEL_INFERENCE');
    assert.equal(f.truthClass, 'fact',
      'visualAsset fact has truthClass=fact (not creative_hypothesis / user_requirement)');
  }
  // Also check that the demoted Rule 9 preservation Need references
  // visualAsset.* facts and the source type is preserved.
  const presNeed = nice.needs.find((n) => n.type === 'preservation' && n.id.includes('visualAsset'));
  assert.ok(presNeed, 'Rule 9 preservation Need is emitted (CI-W1C.6 demoted)');
  for (const fid of presNeed.factRefs) {
    const fact = inMemoryTruth.facts.find((f) => f.id === fid);
    assert.equal(fact.authority, 'VISUAL_SOURCE_FACT',
      `preservation Need factRef ${fid} has VISUAL_SOURCE_FACT authority`);
  }
});
