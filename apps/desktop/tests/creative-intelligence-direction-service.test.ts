import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createCreativeIntelligenceDirectionService } from '../src/main/creative-intelligence-direction-service.ts';

test('direction service persists three hypotheses and waits for user confirmation before compiling V2 decision', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-direction-v2-'));
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  const projectId = 'project-direction-service';
  const refs = Array.from({ length: 6 }, (_, index) => `EV-100000000000000${index}`);
  const claim = (content: string, subjectPath: string, ref: string) => ({ content, subjectPath, evidenceRefs: [ref], confidence: 0.9, status: 'confirmed' });
  const truth = {
    projectId,
    brandFacts: [claim('Consumer goods', 'brandFacts.industry', refs[0]!), claim('Daily gifting', 'brandFacts.role', refs[1]!)],
    productFacts: [], audienceFacts: [], businessGoals: [], confirmedUserIntent: [],
    observedVisualAssets: [], currentVisualPatterns: [], constraints: [], conflicts: [], assumptions: [], openQuestions: []
  };
  const map = {
    projectId, evidenceRefs: refs,
    mustKeep: [{ id: 'OP-10000000000001', content: 'Wordmark', evidenceRefs: [refs[0]] }],
    canReconstruct: [], shouldAvoid: [{ id: 'OP-10000000000002', content: 'Generic decoration', evidenceRefs: [refs[1]] }], canOwn: [],
    primaryTouchpoints: [{ id: 'packaging', label: 'Packaging', evidenceRefs: [refs[2]] }]
  };
  const sourceTypes = [
    ['brand_name', 'user_action'], ['core_function', 'service_process'], ['packaging_structure', 'ingredient_or_material']
  ];
  const strategic = ['Personal notes create an everyday gifting ritual.', 'Shared serving turns tea into social participation.', 'Visible construction establishes precise material trust.'];
  const metaphors = ['A changing field notebook.', 'A table growing with every guest.', 'A calibrated reveal instrument.'];
  const mechanisms = ['Annotation frames respond to reading order.', 'Connected zones expand by participant count.', 'Stepped edges derive from structural depth.'];
  const raw = {
    directionMode: 'greenfield',
    directions: sourceTypes.map((types, index) => ({
      name: `Direction ${index + 1}`, strategicProposition: strategic[index], coreMetaphor: metaphors[index],
      sourceMechanisms: types.map((type, mechanismIndex) => ({ type, mechanism: `${type} mechanism ${index}`, evidenceRefs: [refs[index * 2 + mechanismIndex]] })),
      languageNail: `Language ${index}`, visualHammer: `Hammer ${index}`, visualGenerationMechanism: mechanisms[index],
      compositionLogic: ['Editorial asymmetric reading path.', 'Radial participatory center.', 'Axial layered reveal.'][index],
      colorLogic: `Evidence-bound color behavior ${index}`, typographyLogic: `Distinct information hierarchy ${index}`,
      imageMaterialLogic: ['Tactile paper and candid hands.', 'Ceramic surfaces and social gestures.', 'Macro substrate edges and directional light.'][index],
      perceptionOutcome: ['Personal and direct.', 'Social and generous.', 'Credible and crafted.'][index],
      crossTouchpointLogic: `Mechanism ${index} scales across registered touchpoints.`, touchpointPotential: ['packaging'],
      advantages: [`Advantage ${index}`], risks: [`Risk ${index}`], evidenceRefs: [refs[index * 2], refs[index * 2 + 1]]
    })),
    conceptScores: sourceTypes.map((_, index) => ({
      directionId: `D0${index + 1}`, strategyFit: 8, differentiation: 8, memoryPotential: 8,
      categoryTrust: 8, extensionPotential: 8, evidenceRefs: [refs[index * 2]]
    }))
  };
  const analysis = {
    artifacts: {
      projectTruthModel: truth,
      categoryOpportunityMap: map,
      evidenceLedger: { evidence: refs.map((id) => ({ id })) }
    }
  };
  const shadow = {
    outputDirectory: async () => root,
    get: async () => analysis,
    build: async () => analysis
  };
  const service = createCreativeIntelligenceDirectionService({
    projects: { get: async () => ({ id: projectId, apiProfileId: 'profile-1' }) } as never,
    shadow: shadow as never,
    readCredentials: async () => ({ provider: 'qwen', model: 'mock-direction-model', apiKey: 'test-key', baseUrl: 'https://example.invalid' }) as never,
    reasonerFactory: (() => async () => ({ reportMarkdown: JSON.stringify(raw) })) as never
  });

  const generated = await service.generate(projectId);
  assert.equal(generated.directionSet.directions.length, 3);
  assert.equal(generated.directionValidation.status, 'passed');
  assert.equal(generated.modelCallCount, 1);
  assert.equal((await service.getDecision(projectId)).creativeDecision, null);

  const confirmed = await service.confirm(projectId, {
    selectedDirectionId: 'D01', userRationale: 'This mechanism best fits everyday gifting.'
  });
  assert.equal(confirmed.userDecision.status, 'confirmed');
  assert.equal(confirmed.creativeDecision.decisionStatus, 'confirmed');
  assert.equal(confirmed.decisionTrace.complete, true);
});
