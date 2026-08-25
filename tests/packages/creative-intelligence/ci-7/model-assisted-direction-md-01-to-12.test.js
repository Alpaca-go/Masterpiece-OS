/**
 * CI-W1C.7 — Model-Assisted Direction (CI-6B) tests.
 *
 * Covers spec §16 Direction test codes MD-01..MD-12.
 * All fixtures are project-agnostic. No 九州美学 / 一剂良方 tokens.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseModelAssistedConceptSet,
  parseModelAssistedDirectionSet,
  runModelAssistedDirectionGates,
  MODEL_ASSISTED_CONCEPT_PROMPT_VERSION,
  MODEL_ASSISTED_DIRECTION_PROMPT_VERSION,
} from '@masterpiece/creative-intelligence/model-assisted';
import {
  parseStrategicSynthesis,
  STRATEGIC_SYNTHESIS_PROMPT_VERSION,
} from '@masterpiece/creative-intelligence/strategic-synthesis';

const PROJECT_ID = 'proj-test-md';

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
        prohibitedDirections: ['fact-prohibited-1'],
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
        { id: 'ins-3', statement: 'Premium credibility is currently read as coldness.', implication: 'Add warmth without losing rigour.', whyThisProject: 'fact-brand-1 established, role is technical.', epistemicClass: 'MODEL_INFERENCE', factRefs: ['fact-brand-1', 'fact-brand-2'], needRefs: ['need-1'], evidenceRefs: [] },
      ],
      opportunities: [
        { id: 'opp-1', title: 'Translation territory', thesis: 'Build brand around translation.', strategicMechanism: 'Show dialogue between client and architect.', whyThisProject: 'fact-brand-2 (brand.role).', risk: ['risk of over-explaining'], insightRefs: ['ins-1', 'ins-3'], factRefs: ['fact-brand-2'] },
        { id: 'opp-2', title: 'Slow unfurling territory', thesis: 'Make pace a brand asset.', strategicMechanism: 'Use long-form sequences.', whyThisProject: 'fact-audience-1 (audience.primary).', risk: ['risk of seeming slow'], insightRefs: ['ins-2'], factRefs: ['fact-audience-1'] },
        { id: 'opp-3', title: 'Warmth-without-softening territory', thesis: 'Add relational cues without dropping register.', strategicMechanism: 'Rigorous system + human-scale gestures.', whyThisProject: 'fact-brand-1 is locked.', risk: ['risk of inconsistency'], insightRefs: ['ins-3'], factRefs: ['fact-brand-1'] },
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
      sourceMap: {
        strategicSynthesisRef: 's',
        excludedAuthorities: ['visualAsset.*', 'old_visual_style', 'old_VI', 'old_poster', 'old_packaging', 'old_spatial', 'style_reference', 'structure_reference', 'spatial_reference'],
      },
      candidates: [
        { id: 'concept-ma-1', title: 'Conversation in elevation', coreProposition: 'A grid that flexes around a dialogue.', strategicMechanism: 'Pace, not density.', whyThisProject: 'Mirrors brand.role.', whyNotCategoryCliche: 'Refuses showcase trap.', translationHypothesis: { organizationLogic: 'flex grid', expressionLogic: 'typography leads', possibleVisualBehaviors: ['two-column'] }, epistemicClass: 'CREATIVE_HYPOTHESIS', opportunityRefs: ['opp-1', 'opp-2'], insightRefs: ['ins-1', 'ins-2'], factRefs: ['fact-brand-2', 'fact-audience-1'], needRefs: ['need-1'], strengths: ['specific'], risks: ['over-explain'] },
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

function buildValidDirectionSetFixture() {
  return {
    schemaVersion: '0.1',
    projectId: PROJECT_ID,
    promptVersion: MODEL_ASSISTED_DIRECTION_PROMPT_VERSION,
    generatedAt: '2026-08-20T00:00:00.000Z',
    sourceMap: {
      strategicSynthesisRef: 's',
      conceptSetRef: 'c',
      excludedAuthorities: ['visualAsset.*', 'old_visual_style', 'old_VI', 'old_poster', 'old_packaging', 'old_spatial', 'style_reference', 'structure_reference', 'spatial_reference'],
    },
    directions: [
      {
        id: 'dir-ma-1',
        title: 'Editorial Conversation',
        directionFamily: 'editorial-system',
        creativeThesis: 'Each spread is one beat in a client-architect dialogue; the studio\'s voice is the typography, not the layout.',
        visualMechanism: 'A two-column grid is organized by the rule of alternating voices; what changes across touchpoints is the length of each voice; what remains invariant is the typographic pair (display + body) and the column rhythm. This answers the strategic problem because the audience reads the studio\'s translation skill directly from the page.',
        systemHypothesis: 'If a private client can hold a page and hear both voices, the studio is the obvious partner.',
        visualLanguage: {
          compositionLogic: 'two-column dialogue grid, alternating voices, generous white space',
          colorRelationship: 'paper white, soft ink, one warm accent reserved for the client voice',
          typographyBehavior: 'one display family and one body family; never both serif',
          graphicBehavior: 'thin rules only; no shapes, no icons',
          imageBehavior: 'photographs are moments, not showcases; placed in the body column',
          materialRelationship: 'matte uncoated paper; tactile over glossy',
        },
        crossMediaBehavior: {
          brandVI: 'monogram unchanged; only the page-rhythm applied to stationery',
          editorial: 'long-form, slow unfurling sequences',
          campaignPoster: 'single-page summary, one voice only',
          packaging: 'one side carries client voice, the other architect voice',
        },
        whyThisProject: 'fact-brand-2 (brand.role) frames the studio as translator, not fabricator.',
        differenceFromOtherDirections: 'Editorial Conversation expresses translation as typography and rhythm; Rituals of the Day expresses it as daily life; Locked Signature Warm Air expresses it as identity preservation.',
        epistemicClass: 'CREATIVE_HYPOTHESIS',
        conceptRefs: ['concept-ma-1'],
        opportunityRefs: ['opp-1'],
        insightRefs: ['ins-1'],
        factRefs: ['fact-brand-2'],
        strengths: ['high process specificity'],
        risks: ['risk of over-explaining process'],
        mustNotBecome: ['generic editorial template', 'lifestyle render'],
      },
      {
        id: 'dir-ma-2',
        title: 'Rituals of the Day',
        directionFamily: 'image-led',
        creativeThesis: 'The studio\'s day is its brand; the system unfolds across the 24 hours, not the layout.',
        visualMechanism: 'A 24-hour spread is organized by the rule of one scene per hour; what changes across touchpoints is the time of day and the human action; what remains invariant is the photographic style and the typographic caption. This answers the strategic problem because pace, not density, signals trust for a family audience.',
        systemHypothesis: 'If a viewer can recognise the studio\'s day, they recognise the studio.',
        visualLanguage: {
          compositionLogic: 'one scene per page, large image, tiny caption',
          colorRelationship: 'natural light, no color correction, occasional warm interior lamp',
          typographyBehavior: 'small caption only; no display type',
          graphicBehavior: 'no shapes; only photograph and time-stamp',
          imageBehavior: 'studio-day photography, not portfolio hero shots',
          materialRelationship: 'soft warm surfaces; no gloss',
          motionBehavior: 'slow pans across the day, no cuts',
        },
        crossMediaBehavior: {
          brandVI: 'monogram on the inside of a folio, not the cover',
          editorial: 'photobook format; one image per page',
          campaignPoster: 'single moment, large, with hour caption',
          packaging: 'small daily objects inside the package, not brand on outside',
          digitalUI: 'one image, one caption, no chrome',
        },
        whyThisProject: 'fact-audience-1 (audience.primary) anchors the audience as families commissioning homes.',
        differenceFromOtherDirections: 'Rituals of the Day uses daily life as the system; Editorial Conversation uses typography; Locked Signature Warm Air uses identity preservation as the system.',
        epistemicClass: 'CREATIVE_HYPOTHESIS',
        conceptRefs: ['concept-ma-2'],
        opportunityRefs: ['opp-2'],
        insightRefs: ['ins-2'],
        factRefs: ['fact-audience-1'],
        strengths: ['highly relatable'],
        risks: ['risk of looking ordinary without craft'],
        mustNotBecome: ['lifestyle render', 'agency reel'],
      },
      {
        id: 'dir-ma-3',
        title: 'Locked Signature, Warm Air',
        directionFamily: 'typographic-system',
        creativeThesis: 'The locked monogram is the only thing that never changes; everything around it breathes.',
        visualMechanism: 'A monogram-anchored grid is organized by the rule that the mark sits in the same place on every page; what changes across touchpoints is the supporting material — from hard stock to soft paper; what remains invariant is the mark and its proportion. This answers the strategic problem because adding warmth without softening the mark is exactly what the brand needs.',
        systemHypothesis: 'If a client can recognise the mark in any context, the brand is preserved AND warm.',
        visualLanguage: {
          compositionLogic: 'monogram in a fixed plate; surrounding content flexes',
          colorRelationship: 'monochrome mark on warm neutral grounds; occasional warm paper',
          typographyBehavior: 'one display family paired with the mark; never competing',
          graphicBehavior: 'no shapes; only the mark and the rule',
          imageBehavior: 'tactile material photography; no people, no architecture',
          materialRelationship: 'paper weight and finish carry the warmth; no gloss',
        },
        crossMediaBehavior: {
          brandVI: 'mark unchanged; supporting system softens',
          editorial: 'monogram plate on the cover; warm pages inside',
          campaignPoster: 'mark large; supporting type quiet',
          packaging: 'mark embossed; substrate carries the warmth',
          space: 'mark fixed; surrounding materials vary with the room',
        },
        whyThisProject: 'fact-brand-1 (brand.name) is locked, so identity must remain intact.',
        differenceFromOtherDirections: 'Locked Signature Warm Air uses identity preservation as the mechanism; Editorial Conversation uses typography; Rituals of the Day uses daily life.',
        epistemicClass: 'CREATIVE_HYPOTHESIS',
        conceptRefs: ['concept-ma-3'],
        opportunityRefs: ['opp-3'],
        insightRefs: ['ins-3'],
        factRefs: ['fact-brand-1'],
        strengths: ['identity-preserving'],
        risks: ['risk of inconsistency if warmth goes too soft'],
        mustNotBecome: ['a redesign of the mark', 'a new wordmark'],
      },
    ],
    diagnostics: [],
    meta: { attempt: 1, provider: null, model: null, modelCallCount: 1 },
  };
}

function buildGateInput() {
  return {
    synthesis: buildSynthesis(),
    conceptSet: buildConceptSet(),
    projectFactKeys: new Set(['brand.name', 'brand.role', 'audience.primary', 'brand.locked_logo']),
    lockedFactKeys: new Set(['brand.locked_logo']),
    prohibitedFactKeys: new Set(['prohibited.style', 'visualAsset.logo', 'visualAsset.color']),
  };
}

test('MD-01: ALL_TRACE_REFS_RESOLVE — all opportunityRefs / insightRefs / factRefs / conceptRefs resolve', () => {
  const parsed = parseModelAssistedDirectionSet({
    rawText: JSON.stringify(buildValidDirectionSetFixture()),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedDirectionGates({ set: parsed, ...buildGateInput() });
  const md01 = gate.issues.filter((i) => i.code === 'MD-01');
  assert.equal(md01.length, 0, `MD-01 unresolved: ${JSON.stringify(md01)}`);
});

test('MD-02: STRATEGIC_GROUNDING_PRESENT — direction with no opportunity/insight refs is blocked', () => {
  const fixture = buildValidDirectionSetFixture();
  fixture.directions[0].opportunityRefs = [];
  fixture.directions[0].insightRefs = [];
  const parsed = parseModelAssistedDirectionSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedDirectionGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.blockedCodes.includes('MD-02'));
});

test('MD-03: PROJECT_SPECIFICITY_PRESENT — direction text without any project fact key produces a warning', () => {
  const fixture = buildValidDirectionSetFixture();
  fixture.directions[0].creativeThesis = 'A generic creative thesis that does not mention any project key.';
  fixture.directions[0].visualMechanism = 'A generic visual mechanism that does not mention any project key either; what is organized is unclear and by what rule is not specified; what changes across touchpoints and what remains invariant are also not stated; why does this answer the strategic problem is also not stated.';
  fixture.directions[0].systemHypothesis = 'A generic system hypothesis.';
  fixture.directions[0].whyThisProject = 'A generic why-this-project.';
  const parsed = parseModelAssistedDirectionSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedDirectionGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.warningCodes.includes('MD-03') || gate.blockedCodes.includes('MD-03'),
    `expected MD-03 (warn or block), got blockedCodes=${gate.blockedCodes.join(',')} warningCodes=${gate.warningCodes.join(',')}`);
});

test('MD-04: TEMPLATE_ECHO_HIGH — direction that copies a template bank text is blocked', () => {
  // The corpus is in template-echo.ts; we use the family template
  // for `editorial-system` to build a near-exact echo.
  const fixture = buildValidDirectionSetFixture();
  fixture.directions[0].creativeThesis = 'Editorial system: typographic hierarchy and rhythm carry meaning; layout serves reading order rather than decoration.';
  const parsed = parseModelAssistedDirectionSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedDirectionGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.blockedCodes.includes('MD-04'),
    `expected MD-04 block, got: ${gate.blockedCodes.join(',')}`);
});

test('MD-05: CROSS_DIRECTION_COLLAPSE — two directions with identical creativeThesis are blocked', () => {
  const fixture = buildValidDirectionSetFixture();
  fixture.directions[1].creativeThesis = fixture.directions[0].creativeThesis;
  const parsed = parseModelAssistedDirectionSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedDirectionGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.blockedCodes.includes('MD-05'));
});

test('MD-07: LEGACY_VISUAL_CONTAMINATION — direction text "based on the old poster" is blocked', () => {
  const fixture = buildValidDirectionSetFixture();
  fixture.directions[0].creativeThesis = 'A direction based on the old poster that the studio once published.';
  const parsed = parseModelAssistedDirectionSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedDirectionGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.blockedCodes.includes('MD-07'));
});

test('MD-08: LOCKED_IDENTITY_VIOLATION — "replace the brand identity" is blocked', () => {
  const fixture = buildValidDirectionSetFixture();
  fixture.directions[0].creativeThesis = 'Replace the brand identity with a new mark.';
  const parsed = parseModelAssistedDirectionSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedDirectionGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.blockedCodes.includes('MD-08'));
});

test('MD-09: PROHIBITED_DIRECTION_VIOLATION — prohibited fact key in direction text is blocked', () => {
  const fixture = buildValidDirectionSetFixture();
  fixture.directions[0].creativeThesis = 'A direction that adopts the prohibited.style key as a positive reference.';
  const parsed = parseModelAssistedDirectionSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedDirectionGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.blockedCodes.includes('MD-09'));
});

test('MD-10: FACT_HALLUCINATION — unsupported "as a public company" claim is blocked', () => {
  const fixture = buildValidDirectionSetFixture();
  fixture.directions[0].creativeThesis = 'As a public company the studio must...';
  const parsed = parseModelAssistedDirectionSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedDirectionGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.blockedCodes.includes('MD-10'));
});

test('MD-11: VISUAL_MECHANISM_TOO_GENERIC — direction whose visualMechanism is only cliche is blocked', () => {
  const fixture = buildValidDirectionSetFixture();
  fixture.directions[0].visualMechanism = '使用简洁现代的视觉语言，通过统一的设计系统建立识别度。';
  fixture.directions[0].visualLanguage.compositionLogic = '使用模块化布局。';
  fixture.directions[0].visualLanguage.colorRelationship = '采用高级感配色。';
  fixture.directions[0].visualLanguage.typographyBehavior = '使用简洁现代的字体。';
  fixture.directions[0].visualLanguage.graphicBehavior = '通过统一的设计系统建立识别度。';
  fixture.directions[0].visualLanguage.imageBehavior = '高级感照片风格。';
  const parsed = parseModelAssistedDirectionSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedDirectionGates({ set: parsed, ...buildGateInput(), projectFactKeys: new Set() });
  assert.ok(gate.blockedCodes.includes('MD-11'));
});

test('MD-12: VISUAL_LANGUAGE_NOT_ACTIONABLE — visualLanguage fields are too short is blocked', () => {
  const fixture = buildValidDirectionSetFixture();
  fixture.directions[0].visualLanguage.compositionLogic = 'short';
  fixture.directions[0].visualLanguage.colorRelationship = 'short';
  fixture.directions[0].visualLanguage.typographyBehavior = 'short';
  fixture.directions[0].visualLanguage.graphicBehavior = 'short';
  fixture.directions[0].visualLanguage.imageBehavior = 'short';
  const parsed = parseModelAssistedDirectionSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedDirectionGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.blockedCodes.includes('MD-12'));
});

test('MD-06: CROSS_PROJECT_SEMANTIC_COLLAPSE — identical creativeThesis across projects is blocked', () => {
  // Build a foreign direction set that has the same creativeThesis
  // as our direction[0]. The cross-project gate should block.
  const fixture = buildValidDirectionSetFixture();
  const parsed = parseModelAssistedDirectionSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  // foreign direction set: same creativeThesis on dir[0]
  const foreignFixture = buildValidDirectionSetFixture();
  foreignFixture.projectId = 'proj-foreign';
  foreignFixture.directions[0].id = 'dir-foreign-1';
  const foreignParsed = parseModelAssistedDirectionSet({
    rawText: JSON.stringify(foreignFixture),
    projectId: 'proj-foreign',
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedDirectionGates({
    set: parsed,
    ...buildGateInput(),
    foreignDirectionSet: foreignParsed,
  });
  assert.ok(gate.blockedCodes.includes('MD-06'),
    `expected MD-06 block, got: ${gate.blockedCodes.join(',')}`);
});

test('valid baseline fixture passes all direction gates', () => {
  const parsed = parseModelAssistedDirectionSet({
    rawText: JSON.stringify(buildValidDirectionSetFixture()),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedDirectionGates({ set: parsed, ...buildGateInput() });
  // We expect no blocked codes; warnings are allowed (e.g. MD-03 if
  // a project fact key is not literally in the text, but we did
  // include brand.role and brand.name in the project fact keys set).
  const blockingIssues = gate.issues.filter((i) => i.severity === 'block');
  assert.equal(blockingIssues.length, 0,
    `expected no blocking issues, got: ${JSON.stringify(blockingIssues)}`);
});
