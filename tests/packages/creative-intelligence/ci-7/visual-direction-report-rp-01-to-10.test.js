/**
 * CI-W1C.7 — Visual Direction Exploration Report tests.
 *
 * Covers spec §16 Report test codes RP-01..RP-10.
 *
 * All fixtures are project-agnostic. No 九州美学 / 一剂良方 tokens.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  compileVisualDirectionReport,
  renderVisualDirectionReportMarkdown,
} from '../../../../packages/creative-intelligence/src/reporting/index.ts';
import {
  parseModelAssistedConceptSet,
  parseModelAssistedDirectionSet,
  runModelAssistedConceptGates,
  runModelAssistedDirectionGates,
  MODEL_ASSISTED_CONCEPT_PROMPT_VERSION,
  MODEL_ASSISTED_DIRECTION_PROMPT_VERSION,
} from '../../../../packages/creative-intelligence/src/model-assisted/index.ts';
import {
  parseStrategicSynthesis,
  runStrategicGroundingGate,
  STRATEGIC_SYNTHESIS_PROMPT_VERSION,
} from '../../../../packages/creative-intelligence/src/strategic-synthesis/index.ts';

const PROJECT_ID = 'proj-test-rp';

function buildTruth() {
  return {
    schemaVersion: '1.0',
    projectId: PROJECT_ID,
    facts: [
      { id: 'fact-brand-1', key: 'brand.name', value: 'Acme Studio', authority: 'USER_CONFIRMED', sourceRefs: [] },
      { id: 'fact-brand-2', key: 'brand.role', value: 'architecture firm', authority: 'USER_CONFIRMED', sourceRefs: [] },
      { id: 'fact-audience-1', key: 'audience.primary', value: 'private clients building family homes', authority: 'USER_CONFIRMED', sourceRefs: [] },
      { id: 'fact-locked-1', key: 'brand.locked_logo', value: 'acme-monogram', authority: 'LOCKED', sourceRefs: [] },
    ],
    conflicts: [],
  };
}

function buildSynthesis() {
  return parseStrategicSynthesis({
    rawText: JSON.stringify({
      schemaVersion: '0.1',
      projectId: PROJECT_ID,
      promptVersion: STRATEGIC_SYNTHESIS_PROMPT_VERSION,
      generatedAt: '2026-08-20T00:00:00.000Z',
      sourceMap: {
        planningTruth: ['fact-brand-1', 'fact-brand-2', 'fact-audience-1'],
        userRequirements: [],
        lockedIdentity: ['fact-locked-1'],
        prohibitedDirections: [],
        needs: ['need-1'],
        evidence: ['evi-1'],
        legacyVisualEvidenceExcluded: [
          'visualAsset.*', 'old_visual_style', 'old_VI', 'old_poster', 'old_packaging',
          'old_spatial', 'style_reference', 'structure_reference', 'spatial_reference',
        ],
      },
      projectUnderstanding: {
        summary: 'A small architecture studio helping private families commission bespoke homes.',
        coreChallenge: 'Turn technical rigour into a felt sense of trust.',
        transformationGoal: 'Move from capable to obvious partner.',
        brandRoleInterpretation: 'Translation between blueprint and lived experience.',
        audienceTension: 'Clients want reassurance without being talked down to.',
        epistemicClass: 'MODEL_INFERENCE',
        factRefs: ['fact-brand-1', 'fact-brand-2', 'fact-audience-1'],
        needRefs: ['need-1'],
        evidenceRefs: ['evi-1'],
      },
      tensions: [
        { id: 'tension-1', statement: 'Technical authority vs. emotional accessibility', poleA: 'speak construction', poleB: 'speak family life', whyItMatters: 'imbalance loses credibility or warmth', epistemicClass: 'MODEL_INFERENCE', factRefs: ['fact-brand-1', 'fact-audience-1'], needRefs: ['need-1'], evidenceRefs: [] },
        { id: 'tension-2', statement: 'Studio discipline vs. household improvisation', poleA: 'tight process', poleB: 'open collaboration', whyItMatters: 'either impose order or respond to lived context', epistemicClass: 'MODEL_INFERENCE', factRefs: ['fact-brand-2'], needRefs: ['need-1'], evidenceRefs: [] },
      ],
      insights: [
        { id: 'ins-1', statement: 'The studio signature is translation, not construction.', implication: 'Communications should expose translation moments.', whyThisProject: 'fact-brand-2 frames work as interpretation.', epistemicClass: 'MODEL_INFERENCE', factRefs: ['fact-brand-2'], needRefs: ['need-1'], evidenceRefs: ['evi-1'] },
        { id: 'ins-2', statement: 'Family projects reward slow unfolding.', implication: 'Pace is the emotional handle.', whyThisProject: 'fact-audience-1 anchors the audience.', epistemicClass: 'MODEL_INFERENCE', factRefs: ['fact-audience-1'], needRefs: ['need-1'], evidenceRefs: ['evi-1'] },
        { id: 'ins-3', statement: 'Premium credibility is currently read as coldness.', implication: 'Add warmth without losing rigour.', whyThisProject: 'fact-brand-1 established.', epistemicClass: 'MODEL_INFERENCE', factRefs: ['fact-brand-1', 'fact-brand-2'], needRefs: ['need-1'], evidenceRefs: [] },
      ],
      opportunities: [
        { id: 'opp-1', title: 'Translation territory', thesis: 'Build brand around translation.', strategicMechanism: 'Show dialogue between client and architect.', whyThisProject: 'fact-brand-2 (brand.role).', risk: ['over-explain'], insightRefs: ['ins-1', 'ins-3'], factRefs: ['fact-brand-2'] },
        { id: 'opp-2', title: 'Slow unfurling territory', thesis: 'Make pace a brand asset.', strategicMechanism: 'Use long-form sequences.', whyThisProject: 'fact-audience-1 (audience.primary).', risk: ['seeming slow'], insightRefs: ['ins-2'], factRefs: ['fact-audience-1'] },
        { id: 'opp-3', title: 'Warmth-without-softening territory', thesis: 'Add relational cues without dropping register.', strategicMechanism: 'Rigorous system + human-scale gestures.', whyThisProject: 'fact-brand-1 is locked.', risk: ['inconsistency'], insightRefs: ['ins-3'], factRefs: ['fact-brand-1'] },
      ],
      diagnostics: [],
      meta: { attempt: 1, provider: null, model: null, modelCallCount: 1 },
    }),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
}

function buildConceptSet() {
  return parseModelAssistedConceptSet({
    rawText: JSON.stringify({
      schemaVersion: '0.1',
      projectId: PROJECT_ID,
      promptVersion: MODEL_ASSISTED_CONCEPT_PROMPT_VERSION,
      generatedAt: '2026-08-20T00:00:00.000Z',
      sourceMap: { strategicSynthesisRef: 's', excludedAuthorities: ['visualAsset.*'] },
      candidates: [
        { id: 'concept-ma-1', title: 'Conversation in elevation', coreProposition: 'A grid that flexes around a dialogue.', strategicMechanism: 'Pace, not density.', whyThisProject: 'Mirrors brand.role.', whyNotCategoryCliche: 'Refuses showcase trap.', translationHypothesis: { organizationLogic: 'flex grid', expressionLogic: 'typography leads', possibleVisualBehaviors: ['two-column'] }, epistemicClass: 'CREATIVE_HYPOTHESIS', opportunityRefs: ['opp-1'], insightRefs: ['ins-1'], factRefs: ['fact-brand-2'], needRefs: ['need-1'], strengths: ['specific'], risks: ['over-explain'] },
        { id: 'concept-ma-2', title: 'Rituals of the day', coreProposition: 'Show the studio through daily rituals.', strategicMechanism: 'Pace implies slow unfolding.', whyThisProject: 'audience.primary anchors families.', whyNotCategoryCliche: 'Sticks to studio-day evidence.', translationHypothesis: { organizationLogic: '24-hour spread', expressionLogic: 'image-led', possibleVisualBehaviors: ['photo essay'] }, epistemicClass: 'CREATIVE_HYPOTHESIS', opportunityRefs: ['opp-2'], insightRefs: ['ins-2'], factRefs: ['fact-audience-1'], needRefs: ['need-1'], strengths: ['relatable'], risks: ['ordinary without craft'] },
        { id: 'concept-ma-3', title: 'Locked signature, warm air', coreProposition: 'Keep the locked monogram; soften the surrounding system.', strategicMechanism: 'Rigorous identity + human-scale gestures.', whyThisProject: 'brand.name is locked.', whyNotCategoryCliche: 'Refuses to soften the identity itself.', translationHypothesis: { organizationLogic: 'identity in same place', expressionLogic: 'mark is anchor', possibleVisualBehaviors: ['centered monogram plates'] }, epistemicClass: 'CREATIVE_HYPOTHESIS', opportunityRefs: ['opp-3'], insightRefs: ['ins-3'], factRefs: ['fact-brand-1'], needRefs: ['need-1'], strengths: ['identity-preserving'], risks: ['inconsistency'] },
      ],
      diagnostics: [],
      meta: { attempt: 1, provider: null, model: null, modelCallCount: 1 },
    }),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
}

function buildDirectionSet() {
  return parseModelAssistedDirectionSet({
    rawText: JSON.stringify({
      schemaVersion: '0.1',
      projectId: PROJECT_ID,
      promptVersion: MODEL_ASSISTED_DIRECTION_PROMPT_VERSION,
      generatedAt: '2026-08-20T00:00:00.000Z',
      sourceMap: { strategicSynthesisRef: 's', conceptSetRef: 'c', excludedAuthorities: ['visualAsset.*'] },
      directions: [
        { id: 'dir-ma-1', title: 'Editorial Conversation', directionFamily: 'editorial-system', creativeThesis: 'Each spread is one beat in a client-architect dialogue; the studio\'s voice is the typography, not the layout.', visualMechanism: 'A two-column grid is organized by the rule of alternating voices; what changes across touchpoints is the length of each voice; what remains invariant is the typographic pair and the column rhythm; this answers the strategic problem because the audience reads the studio\'s translation skill directly from the page.', systemHypothesis: 'If a private client can hold a page and hear both voices, the studio is the obvious partner.', visualLanguage: { compositionLogic: 'two-column dialogue grid, alternating voices, generous white space', colorRelationship: 'paper white, soft ink, one warm accent reserved for the client voice', typographyBehavior: 'one display family and one body family; never both serif', graphicBehavior: 'thin rules only; no shapes, no icons', imageBehavior: 'photographs are moments, not showcases; placed in the body column' }, crossMediaBehavior: { brandVI: 'monogram unchanged', editorial: 'long-form slow sequences' }, whyThisProject: 'fact-brand-2 (brand.role) frames the studio as translator.', differenceFromOtherDirections: 'Editorial Conversation expresses translation as typography and rhythm.', epistemicClass: 'CREATIVE_HYPOTHESIS', conceptRefs: ['concept-ma-1'], opportunityRefs: ['opp-1'], insightRefs: ['ins-1'], factRefs: ['fact-brand-2'], strengths: ['specific'], risks: ['over-explain'], mustNotBecome: ['generic editorial'] },
        { id: 'dir-ma-2', title: 'Rituals of the Day', directionFamily: 'image-led', creativeThesis: 'The studio\'s day is its brand; the system unfolds across the 24 hours, not the layout.', visualMechanism: 'A 24-hour spread is organized by the rule of one scene per hour; what changes across touchpoints is the time of day and the human action; what remains invariant is the photographic style and the typographic caption; this answers the strategic problem because pace, not density, signals trust.', systemHypothesis: 'If a viewer can recognise the studio\'s day, they recognise the studio.', visualLanguage: { compositionLogic: 'one scene per page, large image, tiny caption', colorRelationship: 'natural light, no color correction', typographyBehavior: 'small caption only; no display type', graphicBehavior: 'no shapes; only photograph and time-stamp', imageBehavior: 'studio-day photography' }, crossMediaBehavior: { brandVI: 'monogram on the inside', editorial: 'photobook format' }, whyThisProject: 'fact-audience-1 (audience.primary) anchors families.', differenceFromOtherDirections: 'Rituals of the Day uses daily life as the system.', epistemicClass: 'CREATIVE_HYPOTHESIS', conceptRefs: ['concept-ma-2'], opportunityRefs: ['opp-2'], insightRefs: ['ins-2'], factRefs: ['fact-audience-1'], strengths: ['relatable'], risks: ['ordinary without craft'], mustNotBecome: ['lifestyle render'] },
        { id: 'dir-ma-3', title: 'Locked Signature, Warm Air', directionFamily: 'typographic-system', creativeThesis: 'The locked monogram is the only thing that never changes; everything around it breathes.', visualMechanism: 'A monogram-anchored grid is organized by the rule that the mark sits in the same place on every page; what changes across touchpoints is the supporting material; what remains invariant is the mark and its proportion; this answers the strategic problem because adding warmth without softening the mark is exactly what the brand needs.', systemHypothesis: 'If a client can recognise the mark in any context, the brand is preserved AND warm.', visualLanguage: { compositionLogic: 'monogram in a fixed plate; surrounding content flexes', colorRelationship: 'monochrome mark on warm neutral grounds', typographyBehavior: 'one display family paired with the mark', graphicBehavior: 'no shapes; only the mark and the rule', imageBehavior: 'tactile material photography' }, crossMediaBehavior: { brandVI: 'mark unchanged; supporting system softens', editorial: 'warm pages inside' }, whyThisProject: 'fact-brand-1 (brand.name) is locked.', differenceFromOtherDirections: 'Locked Signature Warm Air uses identity preservation as the mechanism.', epistemicClass: 'CREATIVE_HYPOTHESIS', conceptRefs: ['concept-ma-3'], opportunityRefs: ['opp-3'], insightRefs: ['ins-3'], factRefs: ['fact-brand-1'], strengths: ['identity-preserving'], risks: ['inconsistency'], mustNotBecome: ['a redesign of the mark'] },
      ],
      diagnostics: [],
      meta: { attempt: 1, provider: null, model: null, modelCallCount: 1 },
    }),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
}

test('RP-01: report contains Project Understanding', () => {
  const report = compileVisualDirectionReport({
    projectId: PROJECT_ID,
    synthesis: buildSynthesis(),
    conceptSet: buildConceptSet(),
    directionSet: buildDirectionSet(),
  });
  assert.ok(report.projectUnderstanding);
  assert.ok(report.projectUnderstanding.summary.length > 0);
  assert.equal(report.projectUnderstanding.epistemicClass, 'MODEL_INFERENCE');
});

test('RP-02: report contains >=3 Insights', () => {
  const report = compileVisualDirectionReport({
    projectId: PROJECT_ID,
    synthesis: buildSynthesis(),
    conceptSet: buildConceptSet(),
    directionSet: buildDirectionSet(),
  });
  assert.ok(report.insights.length >= 3, `expected >=3 insights, got ${report.insights.length}`);
});

test('RP-03: report contains >=3 Opportunities', () => {
  const report = compileVisualDirectionReport({
    projectId: PROJECT_ID,
    synthesis: buildSynthesis(),
    conceptSet: buildConceptSet(),
    directionSet: buildDirectionSet(),
  });
  assert.ok(report.opportunities.length >= 3, `expected >=3 opportunities, got ${report.opportunities.length}`);
});

test('RP-04: report contains 3-5 Concepts', () => {
  const report = compileVisualDirectionReport({
    projectId: PROJECT_ID,
    synthesis: buildSynthesis(),
    conceptSet: buildConceptSet(),
    directionSet: buildDirectionSet(),
  });
  assert.ok(report.concepts.length >= 3 && report.concepts.length <= 5,
    `expected 3-5 concepts, got ${report.concepts.length}`);
});

test('RP-05: report contains 3-4 Directions', () => {
  const report = compileVisualDirectionReport({
    projectId: PROJECT_ID,
    synthesis: buildSynthesis(),
    conceptSet: buildConceptSet(),
    directionSet: buildDirectionSet(),
  });
  assert.ok(report.directions.length >= 3 && report.directions.length <= 4,
    `expected 3-4 directions, got ${report.directions.length}`);
});

test('RP-06: every Direction has whyThisProject', () => {
  const report = compileVisualDirectionReport({
    projectId: PROJECT_ID,
    synthesis: buildSynthesis(),
    conceptSet: buildConceptSet(),
    directionSet: buildDirectionSet(),
  });
  for (const d of report.directions) {
    assert.ok(d.whyThisProject.length > 0, `direction ${d.id} missing whyThisProject`);
  }
});

test('RP-07: every Direction has differenceFromOtherDirections', () => {
  const report = compileVisualDirectionReport({
    projectId: PROJECT_ID,
    synthesis: buildSynthesis(),
    conceptSet: buildConceptSet(),
    directionSet: buildDirectionSet(),
  });
  for (const d of report.directions) {
    assert.ok(d.differenceFromOtherDirections.length > 0,
      `direction ${d.id} missing differenceFromOtherDirections`);
  }
});

test('RP-08: recommendation is NOT auto-selection (isAutoSelected === false)', () => {
  const report = compileVisualDirectionReport({
    projectId: PROJECT_ID,
    synthesis: buildSynthesis(),
    conceptSet: buildConceptSet(),
    directionSet: buildDirectionSet(),
  });
  assert.equal(report.recommendation.isAutoSelected, false);
  assert.equal(report.selectionFrozenNotice, 'selection is unchanged by this report');
});

test('RP-09: report contains source trace IDs', () => {
  const report = compileVisualDirectionReport({
    projectId: PROJECT_ID,
    synthesis: buildSynthesis(),
    conceptSet: buildConceptSet(),
    directionSet: buildDirectionSet(),
  });
  assert.ok(report.sourceMap.strategicSynthesisRef);
  assert.ok(report.sourceMap.conceptSetRef);
  assert.ok(report.sourceMap.directionSetRef);
  // Every direction must have a conceptRef and an opportunityRef / insightRef
  for (const d of report.directions) {
    assert.ok(d.conceptRefs.length > 0, `direction ${d.id} missing conceptRefs`);
    assert.ok(d.opportunityRefs.length > 0 || d.insightRefs.length > 0,
      `direction ${d.id} missing strategic refs`);
  }
});

test('RP-10: no legacy visual descriptors injected (imageProviderCallCount === 0; report never references visualAsset.* in positive text)', () => {
  const report = compileVisualDirectionReport({
    projectId: PROJECT_ID,
    synthesis: buildSynthesis(),
    conceptSet: buildConceptSet(),
    directionSet: buildDirectionSet(),
  });
  assert.equal(report.imageProviderCallCount, 0);
  // The fixture is project-agnostic; we assert that no concept or
  // direction text mentions a forbidden positive-authority token.
  const allTexts = [
    ...report.concepts.flatMap((c) => [c.title, c.coreProposition, c.strategicMechanism, c.whyThisProject]),
    ...report.directions.flatMap((d) => [d.creativeThesis, d.visualMechanism, d.systemHypothesis, d.whyThisProject]),
  ];
  for (const t of allTexts) {
    assert.ok(!/based on (?:the |our )?(?:old |existing |current )?(vi|visual identity|poster|packaging|spatial|brand visual)/i.test(t),
      `legacy visual positive-authority text: "${t}"`);
  }
});

test('markdown report renderer produces all 6 sections + selection-frozen notice', () => {
  const report = compileVisualDirectionReport({
    projectId: PROJECT_ID,
    synthesis: buildSynthesis(),
    conceptSet: buildConceptSet(),
    directionSet: buildDirectionSet(),
  });
  const md = renderVisualDirectionReportMarkdown(report);
  assert.ok(md.includes('## 01 项目理解'));
  assert.ok(md.includes('## 02 关键洞察'));
  assert.ok(md.includes('## 03 Opportunity Territories'));
  assert.ok(md.includes('## 04 Creative Concepts'));
  assert.ok(md.includes('## 05 Visual Direction Explorations'));
  assert.ok(md.includes('## 06 System Recommendation'));
  assert.ok(md.includes('selection is unchanged by this report'));
  assert.ok(md.includes('Image provider call count: **0**'));
});

test('all gates pass on the valid baseline fixture (synthesis / concept / direction)', () => {
  const synthesis = buildSynthesis();
  const truth = buildTruth();
  const synthGate = runStrategicGroundingGate({ artifact: synthesis, truth });
  assert.equal(synthGate.passed, true, `synth gate failed: ${JSON.stringify(synthGate.blockedCodes)}`);

  const conceptSet = buildConceptSet();
  const conceptGate = runModelAssistedConceptGates({
    set: conceptSet,
    synthesis,
    projectFactKeys: new Set(['brand.name', 'brand.role', 'audience.primary', 'brand.locked_logo']),
    lockedFactKeys: new Set(['brand.locked_logo']),
  });
  assert.equal(conceptGate.passed, true, `concept gate failed: ${JSON.stringify(conceptGate.blockedCodes)}`);

  const directionSet = buildDirectionSet();
  const directionGate = runModelAssistedDirectionGates({
    set: directionSet,
    synthesis,
    conceptSet,
    projectFactKeys: new Set(['brand.name', 'brand.role', 'audience.primary', 'brand.locked_logo']),
    lockedFactKeys: new Set(['brand.locked_logo']),
    prohibitedFactKeys: new Set(['prohibited.style']),
  });
  assert.equal(directionGate.passed, true, `direction gate failed: ${JSON.stringify(directionGate.blockedCodes)}`);
});
