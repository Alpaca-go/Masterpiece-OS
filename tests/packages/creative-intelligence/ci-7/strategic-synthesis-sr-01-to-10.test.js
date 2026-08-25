/**
 * CI-W1C.7 — Strategic Synthesis (CI-4B) tests.
 *
 * Covers spec §16 "Strategic Synthesis" test codes SR-01..SR-10
 * (with extra structural coverage for STR-01..08 and the cross-
 * project contamination gate SG-10).
 *
 * All fixtures are project-agnostic. No 九州美学 / 一剂良方 tokens.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseStrategicSynthesis,
  validateStrategicSynthesisStructural,
  runStrategicGroundingGate,
  compileStrategicReasoningContext,
  StrategicSynthesisParseError,
  STRATEGIC_SYNTHESIS_PROMPT_VERSION,
  STRATEGIC_GROUNDING_GATE_CODES,
} from '@masterpiece/creative-intelligence/strategic-synthesis';

const PROJECT_ID = 'proj-test-sr';

function buildTruthFixture() {
  return {
    schemaVersion: '1.0',
    projectId: PROJECT_ID,
    facts: [
      {
        id: 'fact-brand-1',
        key: 'brand.name',
        value: 'Acme Studio',
        authority: 'USER_CONFIRMED',
        sourceRefs: [],
      },
      {
        id: 'fact-brand-2',
        key: 'brand.role',
        value: 'architecture firm',
        authority: 'USER_CONFIRMED',
        sourceRefs: [],
      },
      {
        id: 'fact-industry-1',
        key: 'business.industry',
        value: 'architecture',
        authority: 'USER_CONFIRMED',
        sourceRefs: [],
      },
      {
        id: 'fact-audience-1',
        key: 'audience.primary',
        value: 'private clients building family homes',
        authority: 'USER_CONFIRMED',
        sourceRefs: [],
      },
      {
        id: 'fact-locked-1',
        key: 'brand.locked_logo',
        value: 'acme-monogram',
        authority: 'LOCKED',
        sourceRefs: [],
      },
      {
        id: 'fact-prohibited-1',
        key: 'prohibited.style',
        value: 'minimalist-luxury',
        authority: 'USER_CONFIRMED',
        sourceRefs: [],
      },
    ],
    conflicts: [],
  };
}

function buildNeedsFixture() {
  return [
    {
      id: 'need-1',
      type: 'communication',
      statement: 'clarify how the studio handles premium family projects',
      factRefs: ['fact-brand-1', 'fact-audience-1'],
      needRefs: [],
    },
  ];
}

function buildEvidenceFixture() {
  return {
    schemaVersion: '0.1',
    projectId: PROJECT_ID,
    generatedAt: '2026-08-20T00:00:00.000Z',
    entries: [
      {
        id: 'evi-1',
        sourceKind: 'planning_document',
        summary: 'planning brief mentions the studio serves discerning families',
        factRefs: ['fact-audience-1'],
        confidence: 0.9,
      },
    ],
  };
}

function buildValidArtifact() {
  return {
    schemaVersion: '0.1',
    projectId: PROJECT_ID,
    promptVersion: STRATEGIC_SYNTHESIS_PROMPT_VERSION,
    generatedAt: '2026-08-20T00:00:00.000Z',
    sourceMap: {
      planningTruth: ['fact-brand-1', 'fact-brand-2', 'fact-industry-1', 'fact-audience-1', 'fact-locked-1', 'fact-prohibited-1'],
      userRequirements: [],
      lockedIdentity: ['fact-locked-1'],
      prohibitedDirections: ['fact-prohibited-1'],
      needs: ['need-1'],
      evidence: ['evi-1'],
      planningClaims: [],
      legacyVisualEvidenceExcluded: [
        'visualAsset.*',
        'old_visual_style',
        'old_VI',
        'old_poster',
        'old_packaging',
        'old_spatial',
        'style_reference',
        'structure_reference',
        'spatial_reference',
      ],
    },
    projectUnderstanding: {
      summary: 'A small architecture studio that helps private families commission bespoke homes.',
      coreChallenge: 'The studio must turn technical rigour into a felt sense of trust for non-architect clients.',
      transformationGoal: 'Move from being perceived as capable to being perceived as the obvious partner.',
      brandRoleInterpretation: 'Their value sits in the translation from blueprint to lived experience.',
      audienceTension: 'Clients want reassurance without being talked down to.',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ['fact-brand-1', 'fact-brand-2', 'fact-audience-1'],
      needRefs: ['need-1'],
      evidenceRefs: ['evi-1'],
      planningClaimRefs: [],
    },
    tensions: [
      {
        id: 'tension-1',
        statement: 'Technical authority vs. emotional accessibility',
        poleA: 'Speak the language of construction',
        poleB: 'Speak the language of family life',
        whyItMatters: 'Leaning too far either way loses either credibility or warmth.',
        epistemicClass: 'MODEL_INFERENCE',
        factRefs: ['fact-brand-1', 'fact-audience-1'],
        needRefs: ['need-1'],
        evidenceRefs: ['evi-1'],
        planningClaimRefs: [],
      },
      {
        id: 'tension-2',
        statement: 'Studio discipline vs. household improvisation',
        poleA: 'Tight process, fixed phases',
        poleB: 'Open collaboration, evolving briefs',
        whyItMatters: 'The studio can either impose order or respond to lived context.',
        epistemicClass: 'MODEL_INFERENCE',
        factRefs: ['fact-brand-2'],
        needRefs: ['need-1'],
        evidenceRefs: [],
        planningClaimRefs: [],
      },
    ],
    insights: [
      {
        id: 'ins-1',
        statement: 'The studio\'s signature is translation, not construction.',
        implication: 'Communications should expose translation moments rather than only outputs.',
        whyThisProject: 'fact-brand-2 (brand.role) frames the work as interpretation, not fabrication.',
        epistemicClass: 'MODEL_INFERENCE',
        factRefs: ['fact-brand-2'],
        needRefs: ['need-1'],
        evidenceRefs: ['evi-1'],
        planningClaimRefs: [],
      },
      {
        id: 'ins-2',
        statement: 'Family projects reward a sense of slow unfolding.',
        implication: 'Pace, not density, is the emotional handle for this audience.',
        whyThisProject: 'fact-audience-1 (audience.primary) anchors the audience as private families commissioning homes.',
        epistemicClass: 'MODEL_INFERENCE',
        factRefs: ['fact-audience-1'],
        needRefs: ['need-1'],
        evidenceRefs: ['evi-1'],
        planningClaimRefs: [],
      },
      {
        id: 'ins-3',
        statement: 'Premium credibility is currently read as coldness.',
        implication: 'The brand must add warmth back without losing rigour.',
        whyThisProject: 'fact-brand-1 (brand.name) is established but the brand.role is technical, not relational.',
        epistemicClass: 'MODEL_INFERENCE',
        factRefs: ['fact-brand-1', 'fact-brand-2'],
        needRefs: ['need-1'],
        evidenceRefs: [],
        planningClaimRefs: [],
      },
    ],
    opportunities: [
      {
        id: 'opp-1',
        title: 'Translation territory',
        thesis: 'Build the brand around how the studio turns intent into space.',
        strategicMechanism: 'Show the dialogue between client and architect, not the final plan.',
        whyThisProject: 'Directly mirrors fact-brand-2 (brand.role).',
        risk: ['risk of over-explaining process'],
        insightRefs: ['ins-1', 'ins-3'],
        factRefs: ['fact-brand-2'],
        planningClaimRefs: [],
      },
      {
        id: 'opp-2',
        title: 'Slow unfurling territory',
        thesis: 'Make pace a brand asset, not a liability.',
        strategicMechanism: 'Use long-form sequences instead of dense one-shots.',
        whyThisProject: 'fact-audience-1 explicitly anchors the audience as families commissioning homes.',
        risk: ['risk of seeming slow in a fast market'],
        insightRefs: ['ins-2'],
        factRefs: ['fact-audience-1'],
        planningClaimRefs: [],
      },
      {
        id: 'opp-3',
        title: 'Warmth-without-softening territory',
        thesis: 'Add relational cues without dropping technical register.',
        strategicMechanism: 'Pair a rigorous system with human-scale gestures.',
        whyThisProject: 'fact-brand-1 (brand.name) is locked, so identity must remain intact.',
        risk: ['risk of feeling inconsistent if warmth goes too soft'],
        insightRefs: ['ins-3', 'ins-1'],
        factRefs: ['fact-brand-1'],
        planningClaimRefs: [],
      },
    ],
    diagnostics: [],
    meta: {
      attempt: 1,
      provider: null,
      model: null,
      modelCallCount: 1,
    },
  };
}

function runGate(artifact, options = {}) {
  const truth = options.truth ?? buildTruthFixture();
  const needs = options.needs ?? buildNeedsFixture();
  const evidence = options.evidence ?? buildEvidenceFixture();
  const ctx = compileStrategicReasoningContext({ projectId: PROJECT_ID, truth, needs, evidence });
  return runStrategicGroundingGate({
    artifact,
    truth,
    needs,
    evidence,
    allowedSourceIds: ctx.sourceIds,
    ...(options.foreignIds ? { foreignIds: options.foreignIds } : {}),
  });
}

test('SR-01: source map excludes legacy visual positive authority', () => {
  const ctx = compileStrategicReasoningContext({
    projectId: PROJECT_ID,
    truth: buildTruthFixture(),
    needs: buildNeedsFixture(),
    evidence: buildEvidenceFixture(),
  });
  assert.ok(ctx.legacyVisualEvidenceExcluded.length > 0);
  assert.ok(ctx.legacyVisualEvidenceExcluded.includes('visualAsset.*'));
  // assert visualAsset.* is NOT in the authoritative source map
  for (const fid of ctx.sourceIds.facts) {
    assert.ok(!fid.startsWith('visualAsset.'), `unexpected visualAsset.* in source map: ${fid}`);
  }
});

test('SR-02: all refs resolve to Project Truth / Need / Evidence', () => {
  const parsed = parseStrategicSynthesis({
    rawText: JSON.stringify(buildValidArtifact()),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runGate(parsed, {
    foreignIds: { factIds: new Set(), needIds: new Set(), evidenceIds: new Set() },
  });
  const sg01 = gate.issues.filter((i) => i.code === 'SG-01');
  assert.equal(sg01.length, 0, `SG-01 unresolved refs: ${JSON.stringify(sg01)}`);
});

test('SR-03: unsupported FACT claim is blocked by SG-02', () => {
  const fixture = buildValidArtifact();
  fixture.projectUnderstanding.coreChallenge = 'As a public company they must...';
  const parsed = parseStrategicSynthesis({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runGate(parsed);
  assert.ok(gate.blockedCodes.includes('SG-02'),
    `expected SG-02 to block, got blockedCodes: ${gate.blockedCodes.join(',')}`);
});

test('SR-04: MODEL_INFERENCE cannot escalate to FACT authority (epistemic class is fixed)', () => {
  const fixture = buildValidArtifact();
  fixture.insights[0].epistemicClass = 'FACT';
  assert.throws(
    () => parseStrategicSynthesis({
      rawText: JSON.stringify(fixture),
      projectId: PROJECT_ID,
      attempt: 1,
      provider: null,
      model: null,
      modelCallCount: 1,
    }),
    (err) => err instanceof StrategicSynthesisParseError && err.code === 'PARSE_INSIGHT_EPISTEMIC',
  );
});

test('SR-05: CREATIVE_HYPOTHESIS is allowed in downstream Concept / Direction (separate stage)', () => {
  // This gate only governs the StrategicSynthesis artifact. We assert
  // that a parsed strategic artifact's `insights[*].epistemicClass`
  // is exactly 'MODEL_INFERENCE' — creative proposals live in
  // CI-5B / CI-6B which have their own gate set.
  const parsed = parseStrategicSynthesis({
    rawText: JSON.stringify(buildValidArtifact()),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  for (const i of parsed.insights) {
    assert.equal(i.epistemicClass, 'MODEL_INFERENCE');
  }
  // Sanity: the CI-5B / CI-6B epistemic class names are exported from
  // their own modules (covered in PART F / G).
  assert.equal(STRATEGIC_GROUNDING_GATE_CODES.length, 15);
});

test('SR-06: locked conflict is blocked (SG-05)', () => {
  const fixture = buildValidArtifact();
  fixture.opportunities[0].thesis = 'Replace the brand identity with a totally new look.';
  const parsed = parseStrategicSynthesis({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runGate(parsed);
  assert.ok(gate.blockedCodes.includes('SG-05'),
    `expected SG-05 to block, got blockedCodes: ${gate.blockedCodes.join(',')}`);
});

test('SR-07: prohibited direction is blocked (positive authority leakage)', () => {
  const fixture = buildValidArtifact();
  fixture.tensions.push({
    id: 'tension-3',
    statement: 'The system should be based on the old VI to maintain consistency.',
    poleA: 'minimalist-luxury',
    poleB: 'rich-warm',
    whyItMatters: 'consistency',
    epistemicClass: 'MODEL_INFERENCE',
    factRefs: ['fact-brand-1'],
    needRefs: ['need-1'],
    evidenceRefs: [],
    planningClaimRefs: [],
  });
  const parsed = parseStrategicSynthesis({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runGate(parsed);
  assert.ok(gate.blockedCodes.includes('SG-04'),
    `expected SG-04 to block, got blockedCodes: ${gate.blockedCodes.join(',')}`);
});

test('SR-08: cross-project source contamination is blocked (SG-10)', () => {
  const fixture = buildValidArtifact();
  fixture.insights[0].factRefs = ['fact-foreign-A', 'fact-brand-2'];
  const parsed = parseStrategicSynthesis({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runGate(parsed, {
    foreignIds: { factIds: new Set(['fact-foreign-A']), needIds: new Set(), evidenceIds: new Set() },
  });
  assert.ok(gate.blockedCodes.includes('SG-10'),
    `expected SG-10 to block, got blockedCodes: ${gate.blockedCodes.join(',')}`);
});

test('SR-09: generic-only insight set is blocked by SG-09', () => {
  const fixture = buildValidArtifact();
  // All 3 insights now contain a generic phrase and no project key signal
  for (const i of fixture.insights) {
    i.statement = '使用简洁现代的视觉语言 ' + i.statement;
  }
  const parsed = parseStrategicSynthesis({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const gate = runGate(parsed);
  assert.ok(gate.blockedCodes.includes('SG-09'),
    `expected SG-09 to block, got blockedCodes: ${gate.blockedCodes.join(',')}`);
});

test('SR-10: structural validator rejects out-of-range quotas', () => {
  const fixture = buildValidArtifact();
  fixture.tensions = [fixture.tensions[0]]; // 1 < min 2
  const parsed = parseStrategicSynthesis({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const report = validateStrategicSynthesisStructural(parsed);
  assert.equal(report.passed, false);
  assert.ok(report.blockedCodes.includes('STR-03'));
});

test('one-repair maximum: structural validator + grounding gate can be re-run after repair (attempt 2)', () => {
  // First call: invalid (missing factRef on insight).
  const fixture = buildValidArtifact();
  fixture.insights[0].factRefs = [];
  const parsed1 = parseStrategicSynthesis({
    rawText: JSON.stringify(fixture),
    projectId: PROJECT_ID,
    attempt: 1,
    provider: null,
    model: null,
    modelCallCount: 1,
  });
  const truth = buildTruthFixture();
  const report1 = validateStrategicSynthesisStructural(parsed1);
  const gate1 = runGate(parsed1, { truth });
  assert.equal(report1.passed, false);
  assert.ok(report1.blockedCodes.includes('STR-06'));
  assert.ok(gate1.blockedCodes.includes('SG-07'));

  // Single repair (attempt 2): restore factRefs.
  const repaired = buildValidArtifact();
  const parsed2 = parseStrategicSynthesis({
    rawText: JSON.stringify(repaired),
    projectId: PROJECT_ID,
    attempt: 2,
    provider: null,
    model: null,
    modelCallCount: 2,
    repairReason: 'insights[0].factRefs was empty',
  });
  const report2 = validateStrategicSynthesisStructural(parsed2);
  const gate2 = runGate(parsed2, { truth });
  assert.equal(report2.passed, true);
  assert.equal(gate2.passed, true);
  assert.equal(parsed2.meta.attempt, 2);
  assert.equal(parsed2.meta.modelCallCount, 2);
  assert.equal(parsed2.meta.repairReason, 'insights[0].factRefs was empty');
});
