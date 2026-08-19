/**
 * CI-W1C.7 — Model-Assisted Concept (CI-5B) tests.
 *
 * Covers spec §16 Concept test codes MC-01..MC-10.
 *
 * All fixtures are project-agnostic. No 九州美学 / 一剂良方 tokens.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseModelAssistedConceptSet,
  runModelAssistedConceptGates,
  computeTemplateEcho,
  getTemplateEchoCorpus,
  MODEL_ASSISTED_CONCEPT_PROMPT_VERSION,
  ModelAssistedParseError,
} from '../../../../packages/creative-intelligence/src/model-assisted/index.ts';
import {
  parseStrategicSynthesis,
  runStrategicGroundingGate,
  STRATEGIC_SYNTHESIS_PROMPT_VERSION,
} from '../../../../packages/creative-intelligence/src/strategic-synthesis/index.ts';

const PROJECT_ID = 'proj-test-mc';

function buildTruthFixture() {
  return {
    schemaVersion: '1.0',
    projectId: PROJECT_ID,
    facts: [
      { id: 'fact-brand-1', key: 'brand.name', value: 'Acme Studio', authority: 'USER_CONFIRMED', sourceRefs: [] },
      { id: 'fact-brand-2', key: 'brand.role', value: 'architecture firm', authority: 'USER_CONFIRMED', sourceRefs: [] },
      { id: 'fact-industry-1', key: 'business.industry', value: 'architecture', authority: 'USER_CONFIRMED', sourceRefs: [] },
      { id: 'fact-audience-1', key: 'audience.primary', value: 'private clients building family homes', authority: 'USER_CONFIRMED', sourceRefs: [] },
      { id: 'fact-locked-1', key: 'brand.locked_logo', value: 'acme-monogram', authority: 'LOCKED', sourceRefs: [] },
    ],
    conflicts: [],
  };
}
function buildNeedsFixture() {
  return [
    { id: 'need-1', type: 'communication', statement: 'clarify the studio handles premium family projects', factRefs: ['fact-brand-1', 'fact-audience-1'], needRefs: [] },
  ];
}
function buildEvidenceFixture() {
  return {
    schemaVersion: '1.0',
    projectId: PROJECT_ID,
    items: [
      { id: 'evi-1', sourceKind: 'planning_document', summary: 'planning brief', factRefs: ['fact-audience-1'], confidence: 0.9 },
    ],
  };
}
function buildSynthesisFixture() {
  return parseStrategicSynthesis({
    rawText: JSON.stringify({
      schemaVersion: '0.1',
      projectId: PROJECT_ID,
      promptVersion: STRATEGIC_SYNTHESIS_PROMPT_VERSION,
      generatedAt: '2026-08-20T00:00:00.000Z',
      sourceMap: {
        planningTruth: ['fact-brand-1', 'fact-brand-2', 'fact-industry-1', 'fact-audience-1'],
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
        { id: 'tension-1', statement: 'Technical authority vs. emotional accessibility', poleA: 'speak construction', poleB: 'speak family life', whyItMatters: 'loses credibility or warmth if imbalanced', epistemicClass: 'MODEL_INFERENCE', factRefs: ['fact-brand-1', 'fact-audience-1'], needRefs: ['need-1'], evidenceRefs: [] },
        { id: 'tension-2', statement: 'Studio discipline vs. household improvisation', poleA: 'tight process', poleB: 'open collaboration', whyItMatters: 'either impose order or respond to lived context', epistemicClass: 'MODEL_INFERENCE', factRefs: ['fact-brand-2'], needRefs: ['need-1'], evidenceRefs: [] },
      ],
      insights: [
        { id: 'ins-1', statement: 'The studio signature is translation, not construction.', implication: 'Communications should expose translation moments.', whyThisProject: 'fact-brand-2 (brand.role) frames work as interpretation.', epistemicClass: 'MODEL_INFERENCE', factRefs: ['fact-brand-2'], needRefs: ['need-1'], evidenceRefs: ['evi-1'] },
        { id: 'ins-2', statement: 'Family projects reward slow unfolding.', implication: 'Pace is the emotional handle.', whyThisProject: 'fact-audience-1 anchors the audience as private families.', epistemicClass: 'MODEL_INFERENCE', factRefs: ['fact-audience-1'], needRefs: ['need-1'], evidenceRefs: ['evi-1'] },
        { id: 'ins-3', statement: 'Premium credibility is currently read as coldness.', implication: 'Add warmth without losing rigour.', whyThisProject: 'fact-brand-1 established, brand.role is technical not relational.', epistemicClass: 'MODEL_INFERENCE', factRefs: ['fact-brand-1', 'fact-brand-2'], needRefs: ['need-1'], evidenceRefs: [] },
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

function buildValidConceptSetFixture() {
  return {
    schemaVersion: '0.1',
    projectId: PROJECT_ID,
    promptVersion: MODEL_ASSISTED_CONCEPT_PROMPT_VERSION,
    generatedAt: '2026-08-20T00:00:00.000Z',
    sourceMap: {
      strategicSynthesisRef: 'synthesis-ref',
      excludedAuthorities: ['visualAsset.*', 'old_visual_style', 'old_VI', 'old_poster', 'old_packaging', 'old_spatial', 'style_reference', 'structure_reference', 'spatial_reference'],
    },
    candidates: [
      {
        id: 'concept-ma-1',
        title: 'Conversation in elevation',
        coreProposition: 'Each touchpoint reads as one beat in a client-architect conversation.',
        strategicMechanism: 'Pace, not density, is the emotional handle for this audience.',
        whyThisProject: 'Mirrors fact-brand-2 (brand.role) as translation, not construction.',
        whyNotCategoryCliche: 'Avoids the "showcase portfolio" trap by foregrounding process over output.',
        centralMetaphor: 'studio as interpreter',
        translationHypothesis: {
          organizationLogic: 'A grid that flexes around a dialogue, not a fixed layout.',
          expressionLogic: 'Typography carries the spoken voice; image carries the lived moment.',
          possibleVisualBehaviors: ['two-column dialogue layouts', 'long-form sequence pages', 'quiet typography on neutral grounds'],
        },
        epistemicClass: 'CREATIVE_HYPOTHESIS',
        opportunityRefs: ['opp-1', 'opp-2'],
        insightRefs: ['ins-1', 'ins-2'],
        factRefs: ['fact-brand-2', 'fact-audience-1'],
        needRefs: ['need-1'],
        strengths: ['high specificity', 'process-led'],
        risks: ['risk of over-explaining'],
      },
      {
        id: 'concept-ma-2',
        title: 'Rituals of the day',
        coreProposition: 'Show the studio through daily rituals — sketch, model, walk-through, lunch.',
        strategicMechanism: 'Use pace to imply the slow unfolding of a family project.',
        whyThisProject: 'fact-audience-1 anchors the audience as families commissioning homes.',
        whyNotCategoryCliche: 'Avoids the "lifestyle render" trap by sticking to studio-day evidence.',
        translationHypothesis: {
          organizationLogic: 'A 24-hour spread as a brand spine.',
          expressionLogic: 'Image-led; typography plays a quiet supporting role.',
          possibleVisualBehaviors: ['photo essay pages', 'time-stamped captions', 'soft morning light'],
        },
        epistemicClass: 'CREATIVE_HYPOTHESIS',
        opportunityRefs: ['opp-2'],
        insightRefs: ['ins-2'],
        factRefs: ['fact-audience-1'],
        needRefs: ['need-1'],
        strengths: ['relatable', 'image-led'],
        risks: ['risk of looking ordinary without craft'],
      },
      {
        id: 'concept-ma-3',
        title: 'Locked signature, warm air',
        coreProposition: 'Keep the locked monogram; let the surrounding system soften.',
        strategicMechanism: 'Rigorous identity + human-scale gestures that signal warmth without dilution.',
        whyThisProject: 'fact-brand-1 (brand.name) is locked, so identity must remain intact.',
        whyNotCategoryCliche: 'Refuses to soften the identity itself; only the surrounding system softens.',
        translationHypothesis: {
          organizationLogic: 'Identity always lives in the same place on a page; everything else is variable.',
          expressionLogic: 'The mark is the anchor; warm, tactile materials surround it.',
          possibleVisualBehaviors: ['centered monogram plates', 'soft-material photography', 'editorial white space'],
        },
        epistemicClass: 'CREATIVE_HYPOTHESIS',
        opportunityRefs: ['opp-3'],
        insightRefs: ['ins-3'],
        factRefs: ['fact-brand-1'],
        needRefs: ['need-1'],
        strengths: ['identity-preserving'],
        risks: ['risk of inconsistency if warmth goes too soft'],
      },
    ],
    diagnostics: [],
    meta: { attempt: 1, provider: null, model: null, modelCallCount: 1 },
  };
}

function buildGateInput() {
  return {
    synthesis: buildSynthesisFixture(),
    projectFactKeys: new Set(['brand.name', 'brand.role', 'business.industry', 'audience.primary', 'brand.locked_logo']),
    lockedFactKeys: new Set(['brand.locked_logo']),
  };
}

test('template-echo corpus is project-agnostic and free of forbidden tokens', () => {
  const corpus = getTemplateEchoCorpus();
  assert.ok(corpus.length >= 8);
  for (const entry of corpus) {
    assert.ok(!entry.text.includes('九州'), `${entry.label} contains 九州`);
    assert.ok(!entry.text.includes('良方'), `${entry.label} contains 良方`);
  }
});

test('MC-01: MODEL_CONCEPT_REFS_VALID — all opportunityRefs / insightRefs / factRefs / needRefs resolve', () => {
  const parsed = parseModelAssistedConceptSet({
    rawText: JSON.stringify(buildValidConceptSetFixture()),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedConceptGates({
    set: parsed,
    ...buildGateInput(),
  });
  const mc01 = gate.issues.filter((i) => i.code === 'MC-01');
  assert.equal(mc01.length, 0, `MC-01 unresolved refs: ${JSON.stringify(mc01)}`);
});

test('MC-02: PROJECT_SPECIFICITY_LOW — concept with no project signal and no refs is blocked', () => {
  const fixture = buildValidConceptSetFixture();
  fixture.candidates[0].title = 'Generic theme';
  fixture.candidates[0].coreProposition = 'Generic idea';
  fixture.candidates[0].strategicMechanism = 'Generic mechanism';
  fixture.candidates[0].whyThisProject = 'Generic reason';
  fixture.candidates[0].opportunityRefs = [];
  fixture.candidates[0].insightRefs = [];
  fixture.candidates[0].factRefs = [];
  fixture.candidates[0].needRefs = [];
  const parsed = parseModelAssistedConceptSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedConceptGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.blockedCodes.includes('MC-02'));
});

test('MC-03: TEMPLATE_ECHO_HIGH — concept that copies a template bank text is blocked', () => {
  const corpus = getTemplateEchoCorpus();
  const donor = corpus[0].text; // identity-preservation
  const fixture = buildValidConceptSetFixture();
  fixture.candidates[0].title = donor;
  const parsed = parseModelAssistedConceptSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedConceptGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.blockedCodes.includes('MC-03'),
    `expected MC-03 block, got: ${gate.blockedCodes.join(',')}`);
});

test('MC-04: CONCEPT_SEMANTIC_DUPLICATION — two candidates with identical strategicMechanism are blocked', () => {
  const fixture = buildValidConceptSetFixture();
  fixture.candidates[1].strategicMechanism = fixture.candidates[0].strategicMechanism;
  const parsed = parseModelAssistedConceptSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedConceptGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.blockedCodes.includes('MC-04'));
});

test('MC-05: UNSUPPORTED_PROJECT_CLAIM — phrasing "as a public company" is blocked', () => {
  const fixture = buildValidConceptSetFixture();
  fixture.candidates[0].coreProposition = 'As a public company, the studio must...';
  const parsed = parseModelAssistedConceptSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedConceptGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.blockedCodes.includes('MC-05'));
});

test('MC-06: LEGACY_VISUAL_CONTAMINATION — "based on the old VI" is blocked', () => {
  const fixture = buildValidConceptSetFixture();
  fixture.candidates[0].coreProposition = 'The system should be based on the old VI to maintain consistency.';
  const parsed = parseModelAssistedConceptSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedConceptGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.blockedCodes.includes('MC-06'));
});

test('MC-07: LOCKED_CONFLICT — "replace the brand identity" is blocked', () => {
  const fixture = buildValidConceptSetFixture();
  fixture.candidates[0].coreProposition = 'Replace the brand identity with a totally new mark.';
  const parsed = parseModelAssistedConceptSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedConceptGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.blockedCodes.includes('MC-07'));
});

test('MC-08: CATEGORY_CLICHE_ONLY — concept composed only of generic phrases is blocked', () => {
  const fixture = buildValidConceptSetFixture();
  fixture.candidates[0].title = '使用简洁现代的视觉语言';
  fixture.candidates[0].coreProposition = '通过统一的设计系统建立识别度。';
  fixture.candidates[0].strategicMechanism = '采用高级感配色。';
  fixture.candidates[0].whyThisProject = '使用模块化布局。';
  fixture.candidates[0].opportunityRefs = [];
  fixture.candidates[0].insightRefs = [];
  const parsed = parseModelAssistedConceptSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedConceptGates({ set: parsed, ...buildGateInput(), projectFactKeys: new Set() });
  assert.ok(gate.blockedCodes.includes('MC-08'));
});

test('MC-09: NO_STRATEGIC_MECHANISM — empty strategicMechanism is blocked', () => {
  const fixture = buildValidConceptSetFixture();
  fixture.candidates[0].strategicMechanism = '';
  const parsed = parseModelAssistedConceptSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedConceptGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.blockedCodes.includes('MC-09'));
});

test('MC-10: NO_WHY_THIS_PROJECT — empty whyThisProject is blocked', () => {
  const fixture = buildValidConceptSetFixture();
  fixture.candidates[0].whyThisProject = '';
  const parsed = parseModelAssistedConceptSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runModelAssistedConceptGates({ set: parsed, ...buildGateInput() });
  assert.ok(gate.blockedCodes.includes('MC-10'));
});

test('epistemic class is strictly CREATIVE_HYPOTHESIS (model inference not allowed at CI-5B)', () => {
  const fixture = buildValidConceptSetFixture();
  fixture.candidates[0].epistemicClass = 'MODEL_INFERENCE';
  assert.throws(
    () => parseModelAssistedConceptSet({
      rawText: JSON.stringify(fixture),
      projectId: PROJECT_ID,
      attempt: 1,
      provider: null,
      model: null,
      modelCallCount: 1,
    }),
    (err) => err instanceof ModelAssistedParseError && /epistemicClass/i.test(err.code),
  );
});

test('computeTemplateEcho band logic: pass / warn / block thresholds', () => {
  const corpus = getTemplateEchoCorpus();
  // exact text from corpus → block
  const exact = corpus[0].text;
  const r1 = computeTemplateEcho(exact);
  assert.equal(r1.band, 'block', `exact should block: ${JSON.stringify(r1)}`);
  // completely novel text → pass
  const novel = 'A small studio rehearses the day by rehearsing the night before.';
  const r2 = computeTemplateEcho(novel);
  assert.equal(r2.band, 'pass', `novel should pass: ${JSON.stringify(r2)}`);
});

test('one-repair maximum: gate can be re-run after repair (attempt 2)', () => {
  const fixture = buildValidConceptSetFixture();
  fixture.candidates[0].strategicMechanism = '';
  const parsed1 = parseModelAssistedConceptSet({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate1 = runModelAssistedConceptGates({ set: parsed1, ...buildGateInput() });
  assert.equal(gate1.passed, false);
  assert.ok(gate1.blockedCodes.includes('MC-09'));

  // Single repair: restore strategicMechanism
  const repaired = buildValidConceptSetFixture();
  const parsed2 = parseModelAssistedConceptSet({
    rawText: JSON.stringify(repaired),
    projectId: PROJECT_ID,
    attempt: 2,
    provider: null,
    model: null,
    modelCallCount: 2,
    repairReason: 'candidates[0].strategicMechanism was empty',
  });
  const gate2 = runModelAssistedConceptGates({ set: parsed2, ...buildGateInput() });
  assert.equal(gate2.passed, true);
  assert.equal(parsed2.meta.attempt, 2);
  assert.equal(parsed2.meta.modelCallCount, 2);
});
