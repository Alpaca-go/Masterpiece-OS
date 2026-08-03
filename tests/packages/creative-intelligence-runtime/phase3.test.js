import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  buildCreativeDirectionGenerationRequest,
  buildDecisionTrace,
  compileCreativeDecisionV2,
  confirmUserDirectionDecision,
  createUserDirectionDecision,
  evaluateCreativeDirections,
  normalizeCreativeDirectionSet,
  validateDirectionDiversity
} from '@masterpiece/creative-intelligence-runtime';

const evidenceRefs = [
  'EV-0000000000000001', 'EV-0000000000000002', 'EV-0000000000000003',
  'EV-0000000000000004', 'EV-0000000000000005', 'EV-0000000000000006'
];

const claim = (content, subjectPath, ref) => ({ content, subjectPath, evidenceRefs: [ref], confidence: 0.9, status: 'confirmed' });

const projectTruthModel = {
  schemaVersion: '2.0', projectId: 'project-direction',
  brandFacts: [
    claim('Consumer goods', 'brandFacts.industry', evidenceRefs[0]),
    claim('Make everyday gifting feel personal', 'brandFacts.role', evidenceRefs[1])
  ],
  productFacts: [claim('Tea gift set', 'productFacts.products', evidenceRefs[2])],
  audienceFacts: [claim('Young urban professionals', 'audienceFacts.audiences', evidenceRefs[3])],
  businessGoals: [], confirmedUserIntent: [claim('Young and direct', 'confirmedUserIntent.tone', evidenceRefs[4])],
  observedVisualAssets: [claim('Wordmark (logo)', 'observedVisualAssets.logo', evidenceRefs[5])],
  currentVisualPatterns: [], constraints: [], conflicts: [], assumptions: [], openQuestions: []
};

const categoryOpportunityMap = {
  projectId: 'project-direction', evidenceRefs,
  mustKeep: [{ id: 'OP-00000000000001', content: 'Wordmark geometry', rationale: 'Identity continuity', evidenceRefs: [evidenceRefs[5]] }],
  canReconstruct: [],
  shouldAvoid: [{ id: 'OP-00000000000002', content: 'Generic luxury gold', rationale: 'Explicit prohibition', evidenceRefs: [evidenceRefs[4]] }],
  canOwn: [{ id: 'OP-00000000000003', content: 'Young and direct', rationale: 'Confirmed intent', evidenceRefs: [evidenceRefs[4]] }],
  primaryTouchpoints: [{ id: 'packaging', label: '包装', evidenceRefs: [evidenceRefs[2]], taskRoute: { deliverableFamily: 'packaging', subtype: 'single_product_display', shot: 'PKG-HERO-SINGLE' } }]
};

const rawDirections = {
  directionMode: 'existing_system_upgrade',
  directions: [
    {
      name: 'Daily Ritual',
      strategicProposition: 'Turn gifting from ceremony into an approachable daily ritual.',
      coreMetaphor: 'A sequence of small personal notes.',
      sourceMechanisms: [
        { type: 'user_action', mechanism: 'Opening and sharing becomes a paced sequence.', evidenceRefs: [evidenceRefs[3]] },
        { type: 'brand_name', mechanism: 'Field Notes becomes a modular annotation language.', evidenceRefs: [evidenceRefs[0]] }
      ],
      languageNail: 'A note for today.', visualHammer: 'One shifting annotation frame.',
      visualGenerationMechanism: 'Generate frames from changing note length and reading order.',
      compositionLogic: 'Asymmetric editorial sequence with one active focal note.',
      colorLogic: 'Use the confirmed green as an orientation signal, not a full-field decoration.',
      typographyLogic: 'Direct headline and compact annotation hierarchy.',
      imageMaterialLogic: 'Tactile paper, candid gestures, and close everyday light.',
      perceptionOutcome: 'Personal, direct, and easy to enter.',
      crossTouchpointLogic: 'The annotation frame changes scale while preserving its reading sequence.',
      touchpointPotential: ['packaging'], advantages: ['Strong verbal-to-visual continuity'], risks: ['May become editorially busy'],
      evidenceRefs: [evidenceRefs[0], evidenceRefs[3], evidenceRefs[4]]
    },
    {
      name: 'Shared Table',
      strategicProposition: 'Make the product a social connector organized around sharing.',
      coreMetaphor: 'A table that grows as people join.',
      sourceMechanisms: [
        { type: 'core_function', mechanism: 'Tea connects participants through a shared serving center.', evidenceRefs: [evidenceRefs[2]] },
        { type: 'service_process', mechanism: 'Selection, brewing, and sharing define three visual zones.', evidenceRefs: [evidenceRefs[2]] }
      ],
      languageNail: 'Bring one more.', visualHammer: 'An expanding radial place system.',
      visualGenerationMechanism: 'Generate connected zones from participant count and serving relationships.',
      compositionLogic: 'Radial shared center with balanced peripheral participants.',
      colorLogic: 'Green anchors the shared center while product variants occupy measured outer bands.',
      typographyLogic: 'Circular labels and short invitations follow participation zones.',
      imageMaterialLogic: 'Top-lit shared surfaces, ceramic tactility, and human interaction.',
      perceptionOutcome: 'Social, generous, and participatory.',
      crossTouchpointLogic: 'The shared center becomes package grouping, shelf blocks, and campaign staging.',
      touchpointPotential: ['包装'], advantages: ['Explains product role immediately'], risks: ['Requires disciplined density control'],
      evidenceRefs: [evidenceRefs[2], evidenceRefs[3]]
    },
    {
      name: 'Measured Reveal',
      strategicProposition: 'Build premium trust by making construction and reveal logic visible.',
      coreMetaphor: 'A calibrated instrument that reveals value layer by layer.',
      sourceMechanisms: [
        { type: 'packaging_structure', mechanism: 'Lid and base depth controls the reveal sequence.', evidenceRefs: [evidenceRefs[5]] },
        { type: 'ingredient_or_material', mechanism: 'Material layers expose origin and craft without ornament.', evidenceRefs: [evidenceRefs[2]] }
      ],
      languageNail: 'Made clear, layer by layer.', visualHammer: 'A precise stepped reveal edge.',
      visualGenerationMechanism: 'Generate a stepped system from structural depth and material transitions.',
      compositionLogic: 'Axial structure with controlled reveals and stable negative space.',
      colorLogic: 'Green marks structural transitions against quiet substrate tones.',
      typographyLogic: 'Measured technical hierarchy aligned to construction edges.',
      imageMaterialLogic: 'Macro construction detail, honest substrate, and directional reveal light.',
      perceptionOutcome: 'Credible, crafted, and quietly premium.',
      crossTouchpointLogic: 'Reveal edges translate into packaging openings, shelf rhythm, and detail imagery.',
      touchpointPotential: ['packaging'], advantages: ['High category trust'], risks: ['Can feel too technical without warmth'],
      evidenceRefs: [evidenceRefs[1], evidenceRefs[2], evidenceRefs[5]]
    }
  ]
};

function normalize() {
  const request = buildCreativeDirectionGenerationRequest({ projectTruthModel, categoryOpportunityMap });
  return normalizeCreativeDirectionSet(rawDirections, { projectTruthModel, categoryOpportunityMap, inputFingerprint: request.inputFingerprint });
}

async function loadSchema(name) {
  return JSON.parse(await readFile(new URL(`../../../schemas/creative-intelligence-v2/${name}`, import.meta.url), 'utf8'));
}

test('Direction Generator requests exactly three unselected, evidence-backed hypotheses', () => {
  const request = buildCreativeDirectionGenerationRequest({ projectTruthModel, categoryOpportunityMap });
  assert.equal(request.directionMode, 'existing_system_upgrade');
  assert.equal(request.responseContract.directions.length, 3);
  assert.match(request.systemPrompt, /do not recommend or select one/i);
  assert.equal(request.systemPrompt.includes('Changing only color'), true);
});

test('Direction Set normalizer enforces three directions and a five-type creative source scan', () => {
  const set = normalize();
  assert.deepEqual(set.directions.map((item) => item.id), ['D01', 'D02', 'D03']);
  assert.equal(set.hypothesisStatus, 'awaiting_user_decision');
  assert.throws(
    () => normalizeCreativeDirectionSet({ ...rawDirections, directions: rawDirections.directions.slice(0, 2) }, { projectTruthModel, categoryOpportunityMap }),
    (error) => error.code === 'DIRECTION_COUNT_INVALID'
  );
});

test('Direction Diversity Validator blocks color/font-only variants', () => {
  const valid = normalize();
  assert.equal(validateDirectionDiversity(valid).status, 'passed');
  const base = valid.directions[0];
  const surfaceVariants = {
    ...valid,
    directions: [base, { ...base, id: 'D02', name: 'Blue version', colorLogic: 'Blue field' }, { ...base, id: 'D03', name: 'Serif version', typographyLogic: 'Serif hierarchy' }]
  };
  const validation = validateDirectionDiversity(surfaceVariants);
  assert.equal(validation.status, 'failed');
  assert.ok(validation.errors.every((error) => error.code === 'DIRECTION_VARIATION_ONLY'));
});

test('Concept Pre-Evaluation remains non-binding and requires later Anchor validation', () => {
  const set = normalize();
  const evaluation = evaluateCreativeDirections(set, set.directions.map((direction, index) => ({
    directionId: direction.id, strategyFit: 8 + index, differentiation: 8, memoryPotential: 7,
    categoryTrust: 8, extensionPotential: 7, evidenceRefs: direction.evidenceRefs
  })));
  assert.equal(evaluation.evaluationType, 'concept_pre_evaluation');
  assert.equal(evaluation.anchorValidationRequired, true);
  assert.equal(evaluation.recommendation, 'D03');
});

test('Formal Creative Decision is impossible before explicit user confirmation', () => {
  const set = normalize();
  const validation = validateDirectionDiversity(set);
  const draft = createUserDirectionDecision(set, {
    selectedDirectionId: 'D01', acceptedElements: ['Preserve the annotation sequence'],
    rejectedElements: ['Dense ornamental borders'], userRationale: 'The direction best expresses everyday personal use.'
  });
  assert.throws(
    () => compileCreativeDecisionV2({ directionSet: set, directionValidation: validation, userDecision: draft, projectTruthModel, categoryOpportunityMap }),
    (error) => error.code === 'USER_DIRECTION_CONFIRMATION_REQUIRED'
  );
});

test('Confirmed user choice compiles one traceable Creative Decision V2 with hypotheses still Anchor-pending', () => {
  const set = normalize();
  const validation = validateDirectionDiversity(set);
  const draft = createUserDirectionDecision(set, {
    selectedDirectionId: 'D01', acceptedElements: ['Preserve the annotation sequence'],
    rejectedElements: ['Dense ornamental borders'],
    mergedElements: [{ fromDirectionId: 'D03', elementType: 'imageMaterialLogic', content: 'Honest substrate with close directional light.' }],
    userRationale: 'The direction best expresses everyday personal use.'
  });
  const decision = confirmUserDirectionDecision(set, draft, '2026-08-03T10:00:00.000Z');
  const creativeDecision = compileCreativeDecisionV2({ directionSet: set, directionValidation: validation, userDecision: decision, projectTruthModel, categoryOpportunityMap });
  assert.equal(creativeDecision.decisionStatus, 'confirmed');
  assert.equal(creativeDecision.decisionSource.selectedDirectionId, 'D01');
  assert.equal(creativeDecision.coreVisualMechanism.validationStatus, 'direction_confirmed_anchor_pending');
  assert.equal(creativeDecision.visualPriorities.includes('Honest substrate with close directional light.'), true);
  const trace = buildDecisionTrace({
    evidenceLedger: { evidence: evidenceRefs.map((id) => ({ id })) }, categoryOpportunityMap,
    directionSet: set, userDecision: decision, creativeDecision
  });
  assert.equal(trace.complete, true);
});

test('Phase 3 artifacts satisfy their JSON Schemas', async () => {
  const schemaNames = [
    'creative-direction-set.schema.json', 'direction-validation.schema.json', 'direction-evaluation.schema.json',
    'user-direction-decision.schema.json', 'creative-decision-v2.schema.json', 'decision-trace.schema.json'
  ];
  const schemas = await Promise.all(schemaNames.map(loadSchema));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validators = Object.fromEntries(schemas.map((schema, index) => [schemaNames[index], ajv.compile(schema)]));
  const set = normalize();
  const validation = validateDirectionDiversity(set);
  const evaluation = evaluateCreativeDirections(set, set.directions.map((direction) => ({
    directionId: direction.id, strategyFit: 8, differentiation: 8, memoryPotential: 8,
    categoryTrust: 8, extensionPotential: 8, evidenceRefs: direction.evidenceRefs
  })));
  const decision = confirmUserDirectionDecision(set, createUserDirectionDecision(set, {
    selectedDirectionId: 'D01', userRationale: 'Best fit for direct daily use.'
  }), '2026-08-03T10:00:00.000Z');
  const creativeDecision = compileCreativeDecisionV2({ directionSet: set, directionValidation: validation, userDecision: decision, projectTruthModel, categoryOpportunityMap });
  const trace = buildDecisionTrace({ evidenceLedger: { evidence: evidenceRefs.map((id) => ({ id })) }, categoryOpportunityMap, directionSet: set, userDecision: decision, creativeDecision });
  const artifacts = [set, validation, evaluation, decision, creativeDecision, trace];
  schemaNames.forEach((name, index) => assert.equal(validators[name](artifacts[index]), true, `${name}: ${JSON.stringify(validators[name].errors)}`));
});
