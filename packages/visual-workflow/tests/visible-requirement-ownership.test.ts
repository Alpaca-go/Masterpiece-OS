import test from 'node:test';
import assert from 'node:assert/strict';
import {structuredAnalysisPacketFixture} from '../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import {compileSpacePrompt} from '../src/generation-runtime/space/compiler.js';
import {compileShortChainGeneration} from '../src/generation-runtime/generation/compile.js';
import {classifyPhrase} from '../src/generation-runtime/space/semantic/separate-space-semantics.js';
import {createMultiModelImageAdapter} from '../src/image-adapter/multi-model.js';
import {createSpaceContinuationContract} from '../src/generation-runtime/space/continuation/create-continuation-contract.js';

const operational = ['chef preparing food', 'steam above dishes', 'customers dining at tables'];
const count = (prompt: string, value: string) => prompt.split(value).length - 1;
function input(values = operational, subtype = 'dining', overrides: any = {}) {
  const packet = structuredAnalysisPacketFixture();
  packet.projectFacts.industry.value = 'Independent service';
  packet.mediaTranslations.spatial.mustBeVisible = values;
  const task = {projectId: packet.projectId, deliverableFamily: 'space', subtype, shot: 'entrance_view',
    count: 1, aspectRatio: '16:9', generationBasis: 'standard', referenceAssetIds: [],
    logoUsageMode: 'post_composite', currentInstruction: 'Show the supplied current scene with credible operations.', ...overrides};
  return {packet, taskContract: task, projectContext: {visualDecisionPacket: packet}};
}
const trace = (result: any) => result.trace.decisionTrace.visibleRequirements;

for (const subtype of ['lobby', 'dining']) for (const camera of [undefined, 'entrance_view', 'three_quarter_wide']) {
  test(`visible operations have one actual execution owner: ${subtype}/${camera ?? 'default'}`, t => {
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async () => {calls++; throw new Error('NETWORK_FORBIDDEN');});
    const source = input(operational, subtype, camera ? {shot: camera, shotSource: 'user_explicit'} : {});
    const before = JSON.stringify(source.packet);
    const result = compileSpacePrompt(source);
    const compiled = compileShortChainGeneration({projectContext: source.projectContext, task: source.taskContract,
      model: 'doubao-seedream-5-0-pro-260628', now: '2026-10-24T00:00:00.000Z'});
    const provider = createMultiModelImageAdapter({adapterId:'seedream-5.0-pro',modelId:compiled.payload.model,
      baseUrl:'https://example.invalid/v3',apiKey:'OFFLINE_PLACEHOLDER'}).compileRequest({
      prompt:compiled.compiledPrompt.finalPrompt,negativeRules:[],aspectRatio:'16:9',imageSize:'2K',outputCount:1,references:[]});
    operational.forEach((text, index) => {
      const retained = subtype === 'dining' || index < 2;
      assert.equal(count(result.finalPrompt, text), retained ? 1 : 0, `execution owner lost or duplicated: ${text}`);
      const entry = trace(result).find((entry: any) => entry.sourcePath === `mediaTranslations.spatial.mustBeVisible[${index}]`);
      assert.equal(entry.classification, 'functional');
      assert.equal(entry.finalPromptRetained, retained);
      assert.equal(entry.owner, retained ? 'composition' : null);
      assert.equal(entry.disposition, retained ? 'retained' : 'off_frame_dependency');
      assert.equal(entry.text, text);
      assert.equal(compiled.payload.prompt.includes(text), retained);
      assert.equal(count(provider.body.prompt, text), retained ? 1 : 0);
    });
    assert.equal(compiled.payload.model, 'doubao-seedream-5-0-pro-260628');
    assert.deepEqual(compiled.payload.referenceAssetIds, []);
    assert.equal('image' in provider.body, false);
    assert.equal(compiled.payload.prompt, compiled.compiledPrompt.finalPrompt);
    assert.equal(JSON.stringify(source.packet), before);
    assert.equal(calls, 0);
  });
}

for (const text of ['厨师正在备餐', '菜品上方升起热气', '顾客在餐桌用餐', '店员为顾客打包商品',
  'customers browsing products', 'staff handing parcels to visitors', 'guests checking in at reception',
  'receptionist greeting visitors', 'water flowing into the basin']) {
  test(`bilingual activity/effect has functional evidence and ownership: ${text}`, () => {
    const source = input([text], text.includes('用餐') ? 'dining' : 'reception');
    const result = compileSpacePrompt(source);
    assert.equal(classifyPhrase(text, 'mustBeVisible').classification, 'functional');
    assert.equal(count(result.finalPrompt, text), 1);
    assert.ok(trace(result)[0].classificationReason);
    assert.equal(trace(result)[0].owner, 'composition');
  });
}

test('de-duplication retains an actual rendered owner, not mere raw membership; original indices survive', () => {
  const text = 'staff handing parcels to visitors';
  const source = input([text, text]);
  source.packet.mediaTranslations.spatial.functionalNetwork.push(text);
  source.packet.mediaTranslations.spatial.peopleBehavior.push(text);
  const result = compileSpacePrompt(source);
  assert.equal(count(result.finalPrompt, text), 1);
  for (const [index, entry] of trace(result).entries()) {
    assert.equal(entry.sourcePath, `mediaTranslations.spatial.mustBeVisible[${index}]`);
    assert.equal(entry.owner, 'functional_requirement');
    assert.ok(entry.deduplication.removedFrom.includes('composition.mustBeVisible'));
    assert.ok(entry.renderedBlocks.includes(entry.owner));
  }
});

test('foreign operations cannot re-enter through the brand branch after scope rejection', () => {
  const text = operational[2];
  const source = input([text], 'lobby');
  source.packet.mediaTranslations.spatial.functionalNetwork.push(text);
  source.packet.mediaTranslations.spatial.brandRoleManifestation.push(text);
  const result = compileSpacePrompt(source);
  assert.equal(count(result.finalPrompt, text), 0);
  assert.equal(trace(result)[0].reason, 'foreign_scene_entity');
  assert.equal(trace(result)[0].owner, null);
});

test('an activity also supplied in a signature source has one rendered visible owner', () => {
  const text = 'receptionist greeting visitors';
  const source = input([text], 'reception');
  source.packet.mediaTranslations.spatial.signatureSpatialMechanism.push(text);
  const result = compileSpacePrompt(source);
  assert.equal(count(result.finalPrompt,text),1);
  assert.equal(trace(result)[0].owner,'composition');
  assert.ok(!result.blocksById.architecture_language.text.includes(text));
});

test('brand duplicate is removed only after the current visible owner exists', () => {
  const text = operational[0];
  const source = input([text]);
  source.packet.mediaTranslations.spatial.brandRoleManifestation.push(text);
  const result = compileSpacePrompt(source);
  assert.equal(count(result.finalPrompt,text),1);
  assert.equal(trace(result)[0].owner,'composition');
  assert.ok(trace(result)[0].deduplication.removedFrom.includes('_raw.brandRoleManifestation'));
});

test('a prohibitive list never receives credit as the positive visible execution owner', () => {
  const text = operational[0];
  const source = input([text]);
  source.packet.creativeDecision.strategicNegatives.push(text);
  const result = compileSpacePrompt(source);
  assert.ok(result.layers.composition.mustBeVisible.includes(text));
  assert.equal(trace(result)[0].owner,'composition');
  assert.equal(trace(result)[0].ownerPath,'composition.mustBeVisible');
});

test('unknown or wishful fragments stay reviewable without becoming a hard operating requirement', () => {
  const values = ['unresolved rendezvous', '高端灵魂', 'customers enjoying the cosmic essence', 'maybe staff serving food'];
  const source = input(values);
  source.packet.mediaTranslations.spatial.brandRoleManifestation.push(...values);
  const result = compileSpacePrompt(source);
  for (const entry of trace(result)) {
    assert.equal(entry.disposition, 'review_required');
    assert.equal(entry.owner, null);
    assert.equal(entry.finalPromptRetained, false);
    assert.equal(count(result.finalPrompt, entry.text), 0);
  }
});

test('identity, motif, color, decoration and architecture retain distinct semantic routes', () => {
  const values = ['Logo wordmark', '文字招牌与标语', 'graphic motif', 'purple wall geometry',
    'Optional sculpture at reception', 'Complex curved ceiling surfaces'];
  const result = compileSpacePrompt(input(values, 'reception'));
  for (const text of values.slice(0, 4)) {
    assert.notEqual(classifyPhrase(text, 'mustBeVisible').classification, 'functional');
    assert.ok(!result.layers.composition.mustBeVisible.includes(text));
  }
  assert.equal(trace(result)[0].disposition, 'post_composite_only');
  assert.equal(trace(result)[1].disposition, 'post_composite_only');
  assert.equal(count(result.finalPrompt, values[3]), 0);
  assert.equal(count(result.finalPrompt, values[4]), 1);
  assert.equal(count(result.finalPrompt, values[5]), 1);
});

test('mixed clauses retain only the local activity and boundary, with foreign interiors rejected in trace', () => {
  const text = 'staff serving food; treatment room contains procedure beds; reception access to treatment protects privacy';
  const result = compileSpacePrompt(input([text], 'reception'));
  assert.equal(count(result.finalPrompt, 'staff serving food'), 1);
  assert.equal(count(result.finalPrompt, 'procedure beds'), 0);
  const entry = trace(result)[0];
  assert.equal(entry.owner, 'composition');
  assert.equal(entry.outputText, 'staff serving food');
  assert.equal(entry.sceneProjection.offFrameEntities.length, 1);
  assert.equal(entry.sceneProjection.boundaryConstraints.length, 1);
  assert.equal(entry.sceneProjection.boundaryConstraints[0].visibilityAuthority, 'current_boundary_only');
});

test('sourceMap reflects actual renderer ownership, not a broad promise of preservation', () => {
  const result = compileShortChainGeneration({projectContext: input().projectContext, task: input().taskContract});
  assert.ok(result.compiledPrompt.sourceMap.composition.includes('composition.mustBeVisible (spatial items only)'));
  assert.ok(!result.compiledPrompt.sourceMap.functional_requirement.some((path: string) => path.includes('mustBeVisible')));
  assert.ok(!result.compiledPrompt.sourceMap.brand_translation.some((path: string) => path.includes('_raw.mustBeVisible')));
});

test('reference-first target program still replaces source operations instead of inheriting standard fallback', () => {
  const source = input(operational, 'consultation', {generationBasis: 'reference_first', referenceAssetIds: ['explicit-reference']});
  const result = compileSpacePrompt(source);
  assert.equal(result.layers.targetSceneProjection.functionalBlockSource, 'target_scene_projection');
  for (const entry of trace(result)) {
    assert.equal(entry.owner, null);
    assert.equal(entry.disposition, 'target_program_replaced');
    assert.equal(entry.finalPromptRetained, false);
  }
  assert.doesNotMatch(result.blocksById.composition.text, /chef preparing food|steam above dishes|customers dining at tables/);
});

test('continuation keeps the target program authoritative and does not expose source dining operations', () => {
  const source = input(operational, 'consultation', {generationBasis: 'continuation', referenceAssetIds: ['generated-fixture']});
  source.taskContract.continuation = createSpaceContinuationContract({projectId:source.packet.projectId,
    confirmedSourceAssetId:'generated-fixture',sourceRunId:'synthetic-source',sourceScene:'dining',targetScene:'consultation',
    userRequirement:'A private consultation space in the same visual world',confirmedAt:'2026-10-24T00:00:00.000Z'});
  const result = compileShortChainGeneration({projectContext:source.projectContext,task:source.taskContract,
    model:'doubao-seedream-5-0-pro-260628'});
  assert.equal(result.compiledPrompt.trace.spaceGeneration.continuation.referenceRole, 'world_consistency');
  for (const entry of result.compiledPrompt.trace.decisionTrace.visibleRequirements) {
    assert.equal(entry.owner,null);
    assert.equal(entry.disposition,'target_program_replaced');
    assert.equal(result.payload.prompt.includes(entry.text),false);
  }
});
