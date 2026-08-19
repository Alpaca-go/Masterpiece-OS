/**
 * CI-W1C.7 — Cross-Project Counterfactual Tests (spec §10).
 *
 *   10.1 Planning-only differentiation
 *   10.2 Legacy-swap invariance
 *   10.3 Planning-swap sensitivity
 *
 * The "model" in these tests is a deterministic mock that:
 *   - Reads the planning facts / needs from the input
 *   - Returns a StrategicSynthesisArtifact whose projectUnderstanding,
 *     tensions, insights, opportunities are *derived* from the
 *     planning inputs (so planning-swap flips the output, and
 *     legacy-swap does NOT).
 *
 * All fixtures are project-agnostic. No 九州美学 / 一剂良方 tokens.
 *
 * The mock lives in this test file (not in production code) and is
 * used solely to assert the cross-project properties of the
 * gates + the planning-vs-legacy separation. The production
 * gates never call this mock.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseStrategicSynthesis,
  runStrategicGroundingGate,
  validateStrategicSynthesisStructural,
  compileStrategicReasoningContext,
  STRATEGIC_SYNTHESIS_PROMPT_VERSION,
} from '../../../../packages/creative-intelligence/src/strategic-synthesis/index.ts';
import {
  parseModelAssistedConceptSet,
  parseModelAssistedDirectionSet,
  runModelAssistedConceptGates,
  runModelAssistedDirectionGates,
  MODEL_ASSISTED_CONCEPT_PROMPT_VERSION,
  MODEL_ASSISTED_DIRECTION_PROMPT_VERSION,
} from '../../../../packages/creative-intelligence/src/model-assisted/index.ts';

// ---------------------------------------------------------------------------
// Planning fixtures: TWO projects, distinct planning only (no legacy visual).
// ---------------------------------------------------------------------------

function makeProjectPlanning(name, brandRole, industry, audience) {
  return {
    projectId: `proj-${name}`,
    truth: {
      schemaVersion: '1.0',
      projectId: `proj-${name}`,
      facts: [
        { id: `fact-${name}-brand-name`, key: 'brand.name', value: name, authority: 'USER_CONFIRMED', sourceRefs: [] },
        { id: `fact-${name}-brand-role`, key: 'brand.role', value: brandRole, authority: 'USER_CONFIRMED', sourceRefs: [] },
        { id: `fact-${name}-industry`, key: 'business.industry', value: industry, authority: 'USER_CONFIRMED', sourceRefs: [] },
        { id: `fact-${name}-audience`, key: 'audience.primary', value: audience, authority: 'USER_CONFIRMED', sourceRefs: [] },
      ],
      conflicts: [],
    },
    needs: [
      { id: `need-${name}-1`, type: 'communication', statement: `clarify ${name}'s ${brandRole} role for ${audience}`, factRefs: [`fact-${name}-brand-name`, `fact-${name}-audience`], needRefs: [] },
    ],
    evidence: {
      schemaVersion: '1.0',
      projectId: `proj-${name}`,
      items: [
        { id: `evi-${name}-1`, sourceKind: 'planning_document', summary: `${name} planning brief`, factRefs: [`fact-${name}-audience`], confidence: 0.9 },
      ],
    },
    projectFactKeys: new Set(['brand.name', 'brand.role', 'business.industry', 'audience.primary']),
  };
}

const projectA = makeProjectPlanning('Alpha', 'architecture firm', 'architecture', 'private clients building family homes');
const projectB = makeProjectPlanning('Bravo', 'culinary school', 'education', 'aspiring chefs who want hands-on training');

// ---------------------------------------------------------------------------
// Deterministic mock model: derives the artifact from planning inputs only.
// ---------------------------------------------------------------------------

function mockStrategicSynthesis(planning) {
  const name = planning.truth.facts.find((f) => f.key === 'brand.name').value;
  const role = planning.truth.facts.find((f) => f.key === 'brand.role').value;
  const industry = planning.truth.facts.find((f) => f.key === 'business.industry').value;
  const audience = planning.truth.facts.find((f) => f.key === 'audience.primary').value;
  return {
    schemaVersion: '0.1',
    projectId: planning.projectId,
    promptVersion: STRATEGIC_SYNTHESIS_PROMPT_VERSION,
    generatedAt: '2026-08-20T00:00:00.000Z',
    sourceMap: {
      planningTruth: planning.truth.facts.map((f) => f.id),
      userRequirements: [],
      lockedIdentity: [],
      prohibitedDirections: [],
      needs: planning.needs.map((n) => n.id),
      evidence: planning.evidence.items.map((e) => e.id),
      legacyVisualEvidenceExcluded: [
        'visualAsset.*', 'old_visual_style', 'old_VI', 'old_poster', 'old_packaging',
        'old_spatial', 'style_reference', 'structure_reference', 'spatial_reference',
      ],
    },
    projectUnderstanding: {
      summary: `${name} is a ${role} serving ${audience} in the ${industry} sector.`,
      coreChallenge: `Translate ${role} into a felt sense of value for ${audience}.`,
      transformationGoal: `Move ${name} from being perceived as one of many to being the obvious ${industry} partner.`,
      brandRoleInterpretation: `${name}'s value is interpretation between intention and outcome.`,
      audienceTension: `${audience} want reassurance without being talked down to.`,
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: planning.truth.facts.map((f) => f.id),
      needRefs: planning.needs.map((n) => n.id),
      evidenceRefs: planning.evidence.items.map((e) => e.id),
    },
    tensions: [
      { id: `tens-${planning.projectId}-1`, statement: `Technical rigour vs. emotional accessibility for ${audience}`, poleA: 'speak the language of the craft', poleB: 'speak the language of the audience', whyItMatters: 'imbalance loses credibility or warmth', epistemicClass: 'MODEL_INFERENCE', factRefs: [planning.truth.facts[0].id, planning.truth.facts[3].id], needRefs: [planning.needs[0].id], evidenceRefs: [planning.evidence.items[0].id] },
      { id: `tens-${planning.projectId}-2`, statement: `${name} discipline vs. ${audience} improvisation`, poleA: 'tight process', poleB: 'open collaboration', whyItMatters: 'either impose order or respond to lived context', epistemicClass: 'MODEL_INFERENCE', factRefs: [planning.truth.facts[1].id], needRefs: [planning.needs[0].id], evidenceRefs: [] },
    ],
    insights: [
      { id: `ins-${planning.projectId}-1`, statement: `${name}'s signature is translation, not output.`, implication: 'Communications should expose translation moments.', whyThisProject: `fact-brand-role frames the work as interpretation.`, epistemicClass: 'MODEL_INFERENCE', factRefs: [planning.truth.facts[1].id], needRefs: [planning.needs[0].id], evidenceRefs: [planning.evidence.items[0].id] },
      { id: `ins-${planning.projectId}-2`, statement: `${audience} reward slow unfolding.`, implication: 'Pace is the emotional handle.', whyThisProject: 'audience.primary anchors the audience.', epistemicClass: 'MODEL_INFERENCE', factRefs: [planning.truth.facts[3].id], needRefs: [planning.needs[0].id], evidenceRefs: [planning.evidence.items[0].id] },
      { id: `ins-${planning.projectId}-3`, statement: `Premium credibility is currently read as coldness by ${audience}.`, implication: 'Add warmth without losing rigour.', whyThisProject: 'brand.role is technical not relational.', epistemicClass: 'MODEL_INFERENCE', factRefs: [planning.truth.facts[0].id, planning.truth.facts[1].id], needRefs: [planning.needs[0].id], evidenceRefs: [] },
    ],
    opportunities: [
      { id: `opp-${planning.projectId}-1`, title: `${name} translation territory`, thesis: `Build ${name}'s brand around translation.`, strategicMechanism: 'Show dialogue between client and provider, not just output.', whyThisProject: 'Directly mirrors fact-brand-role.', risk: ['over-explain'], insightRefs: [`ins-${planning.projectId}-1`, `ins-${planning.projectId}-3`], factRefs: [planning.truth.facts[1].id] },
      { id: `opp-${planning.projectId}-2`, title: `${name} slow-unfurling territory`, thesis: `Make pace a brand asset for ${name}.`, strategicMechanism: 'Use long-form sequences.', whyThisProject: 'audience.primary anchors the audience.', risk: ['seeming slow'], insightRefs: [`ins-${planning.projectId}-2`], factRefs: [planning.truth.facts[3].id] },
      { id: `opp-${planning.projectId}-3`, title: `${name} warmth-without-softening territory`, thesis: 'Add relational cues without dropping register.', strategicMechanism: 'Rigorous system + human-scale gestures.', whyThisProject: 'brand.name is established.', risk: ['inconsistency'], insightRefs: [`ins-${planning.projectId}-3`], factRefs: [planning.truth.facts[0].id] },
    ],
    diagnostics: [],
    meta: { attempt: 1, provider: 'mock', model: 'mock-fixture-v0.1', modelCallCount: 1 },
  };
}

function runMockForProject(planning) {
  const rawText = JSON.stringify(mockStrategicSynthesis(planning));
  const parsed = parseStrategicSynthesis({
    rawText,
    projectId: planning.projectId,
    attempt: 1,
    provider: 'mock',
    model: 'mock-fixture-v0.1',
    modelCallCount: 1,
  });
  const structural = validateStrategicSynthesisStructural(parsed);
  const gate = runStrategicGroundingGate({ artifact: parsed, truth: planning.truth });
  return { parsed, structural, gate };
}

// ---------------------------------------------------------------------------
// 10.1 Planning-only differentiation
// ---------------------------------------------------------------------------

test('10.1 planning-only differentiation: A and B planning -> distinct synthesis', () => {
  const a = runMockForProject(projectA);
  const b = runMockForProject(projectB);
  assert.equal(a.structural.passed, true, `A structural failed: ${a.structural.blockedCodes.join(',')}`);
  assert.equal(b.structural.passed, true, `B structural failed: ${b.structural.blockedCodes.join(',')}`);
  assert.equal(a.gate.passed, true, `A gate failed: ${a.gate.blockedCodes.join(',')}`);
  assert.equal(b.gate.passed, true, `B gate failed: ${b.gate.blockedCodes.join(',')}`);

  // The summaries must be different (different brand.name + brand.role).
  assert.notEqual(a.parsed.projectUnderstanding.summary, b.parsed.projectUnderstanding.summary);
  // Tensions / insights / opportunities must reference different fact IDs.
  for (const insA of a.parsed.insights) {
    for (const insB of b.parsed.insights) {
      assert.notDeepEqual(insA.factRefs, insB.factRefs,
        `insight factRefs collapsed across projects: A=${JSON.stringify(insA.factRefs)} B=${JSON.stringify(insB.factRefs)}`);
    }
  }
  // The MD-06 cross-project semantic collapse gate (run on the
  // direction set) would block if A and B were identical. We test
  // that by feeding the synthesis to a mock direction set and
  // running the gate.
  const aDirMock = mockDirectionSetForProject(projectA, a.parsed, mockConceptSetForProject(projectA, a.parsed));
  const bDirMock = mockDirectionSetForProject(projectB, b.parsed, mockConceptSetForProject(projectB, b.parsed));
  const dirGate = runModelAssistedDirectionGates({
    set: aDirMock,
    synthesis: a.parsed,
    conceptSet: mockConceptSetForProject(projectA, a.parsed),
    projectFactKeys: projectA.projectFactKeys,
    lockedFactKeys: new Set(),
    prohibitedFactKeys: new Set(),
    foreignDirectionSet: bDirMock,
  });
  // MD-06 must NOT be in blocked codes (A and B are different).
  assert.ok(!dirGate.blockedCodes.includes('MD-06'),
    `MD-06 cross-project collapse should NOT trigger for distinct projects: blockedCodes=${dirGate.blockedCodes.join(',')}`);
});

// ---------------------------------------------------------------------------
// Mock concept + direction sets (also planning-derived only).
// ---------------------------------------------------------------------------

function mockConceptSetForProject(planning, synthesis) {
  const role = planning.truth.facts.find((f) => f.key === 'brand.role').value;
  const audience = planning.truth.facts.find((f) => f.key === 'audience.primary').value;
  return parseModelAssistedConceptSet({
    rawText: JSON.stringify({
      schemaVersion: '0.1',
      projectId: planning.projectId,
      promptVersion: MODEL_ASSISTED_CONCEPT_PROMPT_VERSION,
      generatedAt: '2026-08-20T00:00:00.000Z',
      sourceMap: { strategicSynthesisRef: synthesis.generatedAt, excludedAuthorities: ['visualAsset.*'] },
      candidates: [
        { id: `concept-${planning.projectId}-1`, title: `${role} conversation`, coreProposition: 'A grid that flexes around a dialogue.', strategicMechanism: 'Pace, not density.', whyThisProject: `Mirrors fact-brand-role (${role}).`, whyNotCategoryCliche: 'Refuses showcase trap.', translationHypothesis: { organizationLogic: 'flex grid', expressionLogic: 'typography leads', possibleVisualBehaviors: ['two-column'] }, epistemicClass: 'CREATIVE_HYPOTHESIS', opportunityRefs: [`opp-${planning.projectId}-1`], insightRefs: [`ins-${planning.projectId}-1`], factRefs: [planning.truth.facts[1].id], needRefs: [planning.needs[0].id], strengths: ['specific'], risks: ['over-explain'] },
        { id: `concept-${planning.projectId}-2`, title: `${audience} rituals`, coreProposition: 'Show the work through daily rituals.', strategicMechanism: 'Pace implies slow unfolding.', whyThisProject: `audience.primary anchors ${audience}.`, whyNotCategoryCliche: 'Sticks to daily evidence.', translationHypothesis: { organizationLogic: 'daily spread', expressionLogic: 'image-led', possibleVisualBehaviors: ['photo essay'] }, epistemicClass: 'CREATIVE_HYPOTHESIS', opportunityRefs: [`opp-${planning.projectId}-2`], insightRefs: [`ins-${planning.projectId}-2`], factRefs: [planning.truth.facts[3].id], needRefs: [planning.needs[0].id], strengths: ['relatable'], risks: ['ordinary without craft'] },
        { id: `concept-${planning.projectId}-3`, title: 'Locked signature, warm air', coreProposition: 'Keep the locked mark; soften the surrounding system.', strategicMechanism: 'Rigorous identity + human-scale gestures.', whyThisProject: 'brand.name is established.', whyNotCategoryCliche: 'Refuses to soften the identity itself.', translationHypothesis: { organizationLogic: 'identity in same place', expressionLogic: 'mark is anchor', possibleVisualBehaviors: ['centered mark plates'] }, epistemicClass: 'CREATIVE_HYPOTHESIS', opportunityRefs: [`opp-${planning.projectId}-3`], insightRefs: [`ins-${planning.projectId}-3`], factRefs: [planning.truth.facts[0].id], needRefs: [planning.needs[0].id], strengths: ['identity-preserving'], risks: ['inconsistency'] },
      ],
      diagnostics: [],
      meta: { attempt: 1, provider: 'mock', model: 'mock-fixture-v0.1', modelCallCount: 1 },
    }),
    projectId: planning.projectId,
    attempt: 1,
    provider: 'mock',
    model: 'mock-fixture-v0.1',
    modelCallCount: 1,
  });
}

function mockDirectionSetForProject(planning, synthesis, conceptSet) {
  const role = planning.truth.facts.find((f) => f.key === 'brand.role').value;
  const audience = planning.truth.facts.find((f) => f.key === 'audience.primary').value;
  return parseModelAssistedDirectionSet({
    rawText: JSON.stringify({
      schemaVersion: '0.1',
      projectId: planning.projectId,
      promptVersion: MODEL_ASSISTED_DIRECTION_PROMPT_VERSION,
      generatedAt: '2026-08-20T00:00:00.000Z',
      sourceMap: { strategicSynthesisRef: synthesis.generatedAt, conceptSetRef: conceptSet.generatedAt, excludedAuthorities: ['visualAsset.*'] },
      directions: [
        { id: `dir-${planning.projectId}-1`, title: `${role} editorial`, directionFamily: 'editorial-system', creativeThesis: `Each spread is one beat in a client-${role} dialogue; the studio's voice is the typography, not the layout.`, visualMechanism: `A two-column grid is organized by the rule of alternating voices specific to ${role}; what changes across touchpoints is the length of each voice; what remains invariant is the typographic pair and the column rhythm; this answers the strategic problem because ${audience} reads the translation skill directly from the page.`, systemHypothesis: `If a ${audience} can hold a page and hear both voices, the ${role} is the obvious partner.`, visualLanguage: { compositionLogic: `two-column dialogue grid for ${role}, alternating voices, generous white space`, colorRelationship: 'paper white, soft ink, one warm accent', typographyBehavior: 'one display family and one body family', graphicBehavior: 'thin rules only; no shapes', imageBehavior: 'photographs are moments, not showcases' }, crossMediaBehavior: { brandVI: 'mark unchanged', editorial: 'long-form slow sequences' }, whyThisProject: `fact-brand-role (${role}) frames the work as translator for ${audience}.`, differenceFromOtherDirections: `Editorial Conversation expresses translation as typography and rhythm specific to ${role}.`, epistemicClass: 'CREATIVE_HYPOTHESIS', conceptRefs: [`concept-${planning.projectId}-1`], opportunityRefs: [`opp-${planning.projectId}-1`], insightRefs: [`ins-${planning.projectId}-1`], factRefs: [planning.truth.facts[1].id], strengths: ['specific'], risks: ['over-explain'], mustNotBecome: ['generic editorial'] },
        { id: `dir-${planning.projectId}-2`, title: `${audience} rituals`, directionFamily: 'image-led', creativeThesis: `The ${audience} day is the ${role} brand; the system unfolds across the day, not the layout.`, visualMechanism: `A daily spread for ${role} is organized by the rule of one scene per moment; what changes across touchpoints is the time of day and the human action; what remains invariant is the photographic style and the typographic caption; this answers the strategic problem because pace, not density, signals trust for ${audience}.`, systemHypothesis: `If a viewer can recognise the ${role} day, they recognise the brand.`, visualLanguage: { compositionLogic: 'one scene per page, large image, tiny caption', colorRelationship: 'natural light, no color correction', typographyBehavior: 'small caption only; no display type', graphicBehavior: 'no shapes; only photograph and time-stamp', imageBehavior: 'daily photography' }, crossMediaBehavior: { brandVI: 'mark on the inside', editorial: 'photobook format' }, whyThisProject: `fact-audience-primary anchors ${audience} for ${role}.`, differenceFromOtherDirections: `${audience} rituals uses daily life as the system for ${role}.`, epistemicClass: 'CREATIVE_HYPOTHESIS', conceptRefs: [`concept-${planning.projectId}-2`], opportunityRefs: [`opp-${planning.projectId}-2`], insightRefs: [`ins-${planning.projectId}-2`], factRefs: [planning.truth.facts[3].id], strengths: ['relatable'], risks: ['ordinary without craft'], mustNotBecome: ['lifestyle render'] },
        { id: `dir-${planning.projectId}-3`, title: `${role} locked mark, warm air`, directionFamily: 'typographic-system', creativeThesis: `The locked ${role} mark is the only thing that never changes; everything around it breathes for ${audience}.`, visualMechanism: `A ${role}-anchored grid is organized by the rule that the mark sits in the same place on every page; what changes across touchpoints is the supporting material; what remains invariant is the mark and its proportion; this answers the strategic problem because adding warmth without softening the mark is exactly what ${audience} needs.`, systemHypothesis: `If a ${audience} can recognise the ${role} mark in any context, the brand is preserved AND warm.`, visualLanguage: { compositionLogic: 'mark in a fixed plate; surrounding content flexes', colorRelationship: 'monochrome mark on warm neutral grounds', typographyBehavior: 'one display family paired with the mark', graphicBehavior: 'no shapes; only the mark and the rule', imageBehavior: 'tactile material photography' }, crossMediaBehavior: { brandVI: 'mark unchanged; supporting system softens', editorial: 'warm pages inside' }, whyThisProject: `brand.name is established for ${role}.`, differenceFromOtherDirections: `Locked mark uses identity preservation as the mechanism for ${role}.`, epistemicClass: 'CREATIVE_HYPOTHESIS', conceptRefs: [`concept-${planning.projectId}-3`], opportunityRefs: [`opp-${planning.projectId}-3`], insightRefs: [`ins-${planning.projectId}-3`], factRefs: [planning.truth.facts[0].id], strengths: ['identity-preserving'], risks: ['inconsistency'], mustNotBecome: ['a redesign of the mark'] },
      ],
      diagnostics: [],
      meta: { attempt: 1, provider: 'mock', model: 'mock-fixture-v0.1', modelCallCount: 1 },
    }),
    projectId: planning.projectId,
    attempt: 1,
    provider: 'mock',
    model: 'mock-fixture-v0.1',
    modelCallCount: 1,
  });
}

// ---------------------------------------------------------------------------
// 10.2 Legacy-swap invariance
// ---------------------------------------------------------------------------

test('10.2 legacy-swap invariance: A and B planning -> same planning -> same direction (legacy visual does not drive)', () => {
  // We construct two "legacy visual" variants for project A. The
  // mock model NEVER reads legacy visual, so the synthesis +
  // concept + direction should be identical.
  const aWithLegacy1 = { ...projectA, legacy: 'warm poster with high-contrast geometry' };
  const aWithLegacy2 = { ...projectA, legacy: 'cool editorial with serif heavy typography' };
  const synth1 = runMockForProject(aWithLegacy1);
  const synth2 = runMockForProject(aWithLegacy2);
  // Same planning inputs => same synthesis output.
  assert.equal(synth1.parsed.projectUnderstanding.summary, synth2.parsed.projectUnderstanding.summary);
  assert.equal(synth1.parsed.projectUnderstanding.coreChallenge, synth2.parsed.projectUnderstanding.coreChallenge);
  assert.equal(synth1.parsed.projectUnderstanding.transformationGoal, synth2.parsed.projectUnderstanding.transformationGoal);
  assert.equal(synth1.parsed.tensions.length, synth2.parsed.tensions.length);
  for (let i = 0; i < synth1.parsed.tensions.length; i += 1) {
    assert.equal(synth1.parsed.tensions[i].statement, synth2.parsed.tensions[i].statement);
  }
  for (let i = 0; i < synth1.parsed.insights.length; i += 1) {
    assert.equal(synth1.parsed.insights[i].statement, synth2.parsed.insights[i].statement);
  }
  for (let i = 0; i < synth1.parsed.opportunities.length; i += 1) {
    assert.equal(synth1.parsed.opportunities[i].title, synth2.parsed.opportunities[i].title);
  }
});

// ---------------------------------------------------------------------------
// 10.3 Planning-swap sensitivity
// ---------------------------------------------------------------------------

test('10.3 planning-swap sensitivity: swap A and B planning -> outputs swap (planning drives creativity)', () => {
  const aPlanningOnB = { ...projectA, projectId: 'proj-temp', truth: projectB.truth, needs: projectB.needs, evidence: projectB.evidence };
  const bPlanningOnA = { ...projectB, projectId: 'proj-temp2', truth: projectA.truth, needs: projectA.needs, evidence: projectA.evidence };
  const aOnB = runMockForProject(aPlanningOnB);
  const bOnA = runMockForProject(bPlanningOnA);
  // aOnB contains the B brand name (Bravo / culinary) inside its
  // summary; bOnA contains the A brand name (Alpha / architecture).
  assert.ok(aOnB.parsed.projectUnderstanding.summary.includes('Bravo'));
  assert.ok(bOnA.parsed.projectUnderstanding.summary.includes('Alpha'));
  // The direction-set mock respects the planning inputs the same
  // way; we assert the same inversion at the direction layer.
  const dirAonB = mockDirectionSetForProject(
    aPlanningOnB,
    aOnB.parsed,
    mockConceptSetForProject(aPlanningOnB, aOnB.parsed),
  );
  const dirBonA = mockDirectionSetForProject(
    bPlanningOnA,
    bOnA.parsed,
    mockConceptSetForProject(bPlanningOnA, bOnA.parsed),
  );
  // A's direction set should mention Bravo's role; B's should mention Alpha's.
  const aTitle = dirAonB.directions[0].title.toLowerCase();
  const bTitle = dirBonA.directions[0].title.toLowerCase();
  assert.ok(aTitle.includes('culinary'), `A-on-B title should mention culinary role: ${aTitle}`);
  assert.ok(bTitle.includes('architecture'), `B-on-A title should mention architecture role: ${bTitle}`);
});

test('compileStrategicReasoningContext excludes visualAsset.* (planning-only source map)', () => {
  const ctxA = compileStrategicReasoningContext({
    projectId: projectA.projectId,
    truth: projectA.truth,
    needs: projectA.needs,
    evidence: projectA.evidence,
  });
  for (const fid of ctxA.sourceIds.facts) {
    assert.ok(!fid.startsWith('visualAsset.'), `unexpected visualAsset.* in source map: ${fid}`);
  }
  // legacyVisualEvidenceExcluded must contain the spec minimum.
  for (const ex of ['visualAsset.*', 'old_VI', 'old_poster', 'old_packaging', 'old_spatial', 'style_reference', 'structure_reference', 'spatial_reference']) {
    assert.ok(ctxA.legacyVisualEvidenceExcluded.includes(ex), `missing exclusion: ${ex}`);
  }
});
