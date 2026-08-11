import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildTargetSceneProjection,
  compilePhase9bSpacePrompt,
  projectBrandManifestationToTargetScene,
  resolveTargetFunctionalProgram,
  validateTargetSceneAuthority,
} from '@masterpiece/image-generation-runtime/space/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function loadPacket() {
  return JSON.parse(fs.readFileSync(path.join(
    repoRoot,
    'space-generator/quality-baselines/phase9b-recovered/_packets/jiuzhou-aesthetics/visual-decision-packet.json',
  ), 'utf8'));
}

function consultationTask(generationBasis = 'reference_first') {
  return {
    schemaVersion: '1.0',
    taskId: `r1124-${generationBasis}`,
    projectId: 'project-r1124',
    deliverableFamily: 'space',
    subtype: 'consultation',
    shot: 'entrance_view',
    shotSource: 'target_scene_default',
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: '生成一个明确的半私密咨询空间',
    generationBasis,
    referenceAssetIds: generationBasis === 'standard' ? [] : ['same-jzmx-reception-reference'],
    logoUsageMode: 'post_composite',
    mustInclude: [],
    mustAvoid: [],
  };
}

test('R11.2.4 consultation operation constraints come only from target projection', () => {
  const projection = buildTargetSceneProjection({
    targetProgram: resolveTargetFunctionalProgram('consultation'),
    projectConstraints: [
      'large public reception desk is the visual core',
      'public waiting, treatment and post-treatment rest must be visible',
      'whole-clinic circulation must be shown',
    ],
  });
  const operation = projection.architectureFunctionBridge.operationConstraints.join('\n');
  assert.equal(projection.provenance.operationConstraintsSource, 'target_scene_projection');
  assert.match(operation, /consultation|1-to-1 \/ 1-to-2|advisor-client|lightweight/iu);
  assert.doesNotMatch(operation, /large public reception|public waiting|treatment|post-treatment|whole-clinic/iu);
});

test('R11.2.4 brand mechanisms survive while reception scene objects are replaced', () => {
  const projection = projectBrandManifestationToTargetScene({
    targetScene: 'consultation',
    brandManifestation: [
      'large curved front desk with purple underglow as visual core',
      '\u524d\u53f0\u4f5c\u4e3a\u201c\u5b54\u96c0\u5f00\u5c4f\u201d\u7684\u5149\u5f69\u6838\u5fc3\uff0c\u5438\u5f15\u5e76\u63a5\u5f85\u5ba2\u6237\u3002',
      'public waiting lobby and reception arrival hierarchy',
      'radiating layered motif on semi-transparent glass',
    ],
    mechanismEvidence: ['membrane language', 'warm wood and microcement'],
  });
  assert.deepEqual(projection.preservedMechanisms, [
    'curved_language',
    'semi_transparent_boundary',
    'localized_purple_glow',
    'radiating_rhythm',
    'membrane_language',
    'warm_wood_microcement',
  ]);
  assert.ok(projection.replacedSceneObjects.includes('large_front_desk'));
  assert.ok(projection.replacedSceneObjects.includes('front_desk_visual_core'));
  assert.ok(projection.replacedSceneObjects.includes('public_waiting_lobby'));
  assert.ok(projection.replacedSceneObjects.includes('reception_arrival_hierarchy'));
  const result = projection.sceneManifestations.join('\n');
  assert.match(result, /curved.*translucent.*consultation/iu);
  assert.match(result, /localized purple.*radiating rhythm.*glass or partition/iu);
  assert.doesNotMatch(result, /front desk|public waiting|arrival hierarchy/iu);
});

test('R11.2.4 authority gate covers operation, must-visible and brand manifestation', () => {
  const base = {
    targetScene: 'consultation',
    targetProgram: { sceneId: 'consultation' },
    blocksById: {
      functional_requirement: { text: 'consultation table and 2–3 seats' },
      architecture_function_bridge: { text: 'consultation interaction primary' },
      lighting: { text: 'calm localized light' },
      composition: { text: 'human-scale consultation view' },
      brand_translation: { text: '' },
    },
  };
  assert.throws(() => validateTargetSceneAuthority({
    ...base,
    operationConstraints: ['whole-clinic circulation must be shown'],
  }), { code: 'SPACE_TARGET_SCENE_AUTHORITY_VIOLATION' });
  assert.throws(() => validateTargetSceneAuthority({
    ...base,
    mustBeVisible: ['public waiting lobby'],
  }), { code: 'SPACE_TARGET_SCENE_AUTHORITY_VIOLATION' });
  assert.throws(() => validateTargetSceneAuthority({
    ...base,
    brandRoleManifestation: ['front desk as visual core'],
  }), { code: 'SPACE_TARGET_SCENE_AUTHORITY_VIOLATION' });
  assert.doesNotThrow(() => validateTargetSceneAuthority({
    ...base,
    brandRoleManifestation: ['small consultation support desk'],
    userRequirement: 'consultation room needs a small consultation support desk',
  }));
});

test('R11.2.4 JZMX reference-first final prompt is consultation-clean and traceable', () => {
  const packet = loadPacket();
  const result = compilePhase9bSpacePrompt({
    packet,
    taskContract: consultationTask(),
    projectContext: { projectId: 'project-r1124', visualDecisionPacket: packet },
    brandKey: 'jiuzhou-aesthetics',
  });
  const hardBlocks = [
    result.blocksById.architecture_function_bridge.text,
    result.blocksById.brand_translation.text,
    result.blocksById.functional_requirement.text,
    result.blocksById.composition.text,
  ].join('\n');
  assert.match(hardBlocks, /consultation|咨询桌|2–3|半私密|information|translucent|localized purple|radiating rhythm/iu);
  assert.doesNotMatch(hardBlocks, /large public reception|front desk as (?:the )?visual core|public waiting lobby|reception arrival hierarchy|whole-clinic program/iu);
  assert.equal(result.trace.targetSceneAuthority.operationConstraintsSource, 'target_scene_projection');
  assert.equal(result.trace.targetSceneAuthority.brandManifestationSource, 'target_scene_projection');
  assert.equal(result.trace.targetSceneAuthority.authorityGate.status, 'pass');
  assert.deepEqual(result.trace.targetSceneAuthority.authorityGate.checkedBlocks, [
    'functional_requirement',
    'architecture_function_bridge',
    'operation_constraints',
    'must_be_visible',
    'lighting',
    'composition',
    'brand_role_manifestation',
  ]);
});

test('R11.2.4 standard stays text-only while brand manifestation remains target-aware', () => {
  const packet = loadPacket();
  const result = compilePhase9bSpacePrompt({
    packet,
    taskContract: consultationTask('standard'),
    projectContext: { projectId: 'project-r1124', visualDecisionPacket: packet },
    brandKey: 'jiuzhou-aesthetics',
  });
  assert.equal(result.layers.targetSceneProjection.functionalBlockSource, 'project_wide');
  assert.equal(result.layers.targetSceneProjection.brandManifestationSource, 'target_scene_projection');
  assert.equal(result.referenceImages.length > 0, true, 'architecture context anchors remain unchanged');
  assert.doesNotMatch(result.blocksById.brand_translation.text, /large public reception|front desk as (?:the )?visual core/iu);
});
