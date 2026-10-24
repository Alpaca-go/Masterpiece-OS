import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {structuredAnalysisPacketFixture} from '../../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import {createShortChainTaskContract} from '../../src/generation-runtime/generation/task-contract.js';
import {compileShortChainGeneration} from '../../src/generation-runtime/generation/compile.js';
import {adaptSpaceSource} from '../../src/generation-runtime/space/source-adapter.js';
import {scopeSourceEntries} from '../../src/generation-runtime/space/scene-projection/target-scene-projection.js';
import {classifyPhrase} from '../../src/generation-runtime/space/semantic/separate-space-semantics.js';
import {sanitizeBrandManifestation} from '../../src/generation-runtime/space/semantic/sanitize-brand-expression.js';

const values = ['chef preparing food', 'steam above dishes', 'customers dining at tables'];
const sourceContainer = 'mediaTranslations.spatial.mustBeVisible';
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

test('RKS-01E synthetic field lineage distinguishes routing from scene filtering without transport', t => {
  let networkAttempts = 0;
  t.mock.method(globalThis, 'fetch', async () => { networkAttempts++; throw new Error('NETWORK_FORBIDDEN'); });
  const packet = structuredAnalysisPacketFixture();
  packet.projectFacts.industry.value = 'Restaurant';
  packet.mediaTranslations.spatial.spatialConcept = 'Warm neighborhood dining with visible cooking';
  packet.mediaTranslations.spatial.mustBeVisible = values;
  const before = JSON.stringify(packet);
  const controls = {projectId: packet.projectId, taskId: 'rks-field-lineage-synthetic', deliverableFamily: 'space',
    count: 1, aspectRatio: '16:9', generationBasis: 'standard', referenceAssetIds: [], logoUsageMode: 'post_composite',
    currentInstruction: 'Show a credible operating restaurant with a clear entrance and dining depth.'};
  // operational_dining_view is the subtype-owned output strategy, not a
  // registered input shot. Cross registered explicit cameras with both subtypes.
  const variants = [
    {id: 'rks01d-replay', subtype: 'lobby', shot: 'entrance_view'},
    {id: 'lobby-explicit-entrance', subtype: 'lobby', shot: 'entrance_view', shotSource: 'user_explicit'},
    {id: 'lobby-explicit-wide', subtype: 'lobby', shot: 'three_quarter_wide', shotSource: 'user_explicit'},
    {id: 'dining-explicit-entrance', subtype: 'dining', shot: 'entrance_view', shotSource: 'user_explicit'},
    {id: 'dining-explicit-wide', subtype: 'dining', shot: 'three_quarter_wide', shotSource: 'user_explicit'},
    {id: 'dining-default', subtype: 'dining', shot: 'entrance_view'}
  ];
  const results = variants.map(({id, ...variant}) => {
    const task = {...controls, ...variant};
    const contract = createShortChainTaskContract(task, {now: '2026-10-24T00:00:00.000Z'});
    const layers = adaptSpaceSource({packet, taskContract: contract, projectContext: {visualDecisionPacket: packet}});
    const compiled = compileShortChainGeneration({projectContext: {visualDecisionPacket: packet}, task,
      model: 'doubao-seedream-5-0-pro-260628', now: '2026-10-24T00:00:00.000Z'});
    // Independently exercise the exported pure scope function on original
    // entries. This is a counterfactual probe, NOT the actual composition path:
    // splitMustBeVisible may have removed an entry before scope is invoked.
    const scopeProbe = scopeSourceEntries(values.map((text, index) => ({text,
      sourcePath: `${sourceContainer}[${index}]`, sourceContainer})), variant.subtype);
    const brandBeforeScope = sanitizeBrandManifestation(values);
    const brandScope = scopeSourceEntries(brandBeforeScope.lines.map((text, index) => ({text,
      sourcePath: `brandSanitization.lines[${index}]`})), variant.subtype);
    const fields = values.map((value, index) => {
      const classification = classifyPhrase(value, 'mustBeVisible');
      const compositionEntries = layers.decisionTrace.sceneScope.filter((entry: any) => entry.sourceContainer === sourceContainer && entry.text === value);
      const brandEntries = layers.decisionTrace.sceneScope.filter((entry: any) => entry.sourceContainer === 'brandSanitization.lines' && entry.text === value);
      const brandProjection = brandScope.find(entry => entry.text === value);
      const losses = [];
      if (!layers.composition.mustBeVisible.includes(value) && classification.classification === 'brand_motif') losses.push({
        stage: 'source-adapter.splitMustBeVisible', reason: 'mustBeVisible is brand provenance; no architectural/motif/color hit defaults to brand_motif; excluded from composition before scene projection'});
      if (brandProjection?.sceneScope === 'off_frame_dependency') losses.push({
        stage: 'source-adapter.projectList -> scopeSourceEntries', reason: 'foreign_scene_entity; target subtype does not allow the dining scene'});
      else if (brandProjection && !layers._raw.brandRoleManifestation.includes(value)) losses.push({
        stage: 'source-adapter.projectedBrandManifestation.filter', reason: 'text is in rawMustBeVisible functionalItems but is not artisticFocus; removed without a retained functional owner'});
      return {sourcePath: `${sourceContainer}[${index}]`, value, classification,
        rawPassThrough: layers._raw.mustBeVisible.filter((text: string) => text === value),
        beforeProjection: {brandSanitizer: brandBeforeScope.records.filter(entry => entry.raw === value),
          compositionEligible: !['decorative_identity', 'brand_motif', 'color_geometry', 'color_accent', 'ambiguous'].includes(classification.classification) && classification.motifHits.length === 0},
        projection: {compositionEntries, brandEntries, originalEntryScopeProbe: scopeProbe[index],
          brandScopeProbe: brandProjection},
        promptSource: {composition: layers.composition.mustBeVisible.filter((text: string) => text === value),
          brand: layers._raw.brandRoleManifestation.filter((text: string) => text === value),
          canonicalOwners: layers.decisionTrace.canonicalOwners.filter((entry: any) => entry.text === value)},
        sourceMap: {composition: compiled.compiledPrompt.sourceMap.composition,
          functional_requirement: compiled.compiledPrompt.sourceMap.functional_requirement,
          brand_translation: compiled.compiledPrompt.sourceMap.brand_translation},
        losses, finalPromptRetained: compiled.compiledPrompt.finalPrompt.includes(value),
        providerPromptRetained: compiled.payload.prompt.includes(value)};
    });
    assert.deepEqual(layers._raw.mustBeVisible, values);
    assert.equal(compiled.compiledPrompt.userConfirmedVisualDecision, null);
    assert.deepEqual(compiled.payload.referenceAssetIds, []);
    assert.equal(compiled.compiledPrompt.finalPrompt, compiled.payload.prompt);
    assert(compiled.compiledPrompt.finalPrompt.includes(packet.mediaTranslations.spatial.spatialConcept));
    for (const field of fields) {
      // Verify trace consistency, without making present field loss an accepted
      // Golden or forcing future compiler repairs to preserve that defect.
      assert.equal(field.finalPromptRetained, field.providerPromptRetained);
    }
    return {id, task, resolvedView: layers.viewStrategy, resolvedShotSource: layers.shotSource,
      targetSceneProjection: layers.targetSceneProjection, fields,
      finalPrompt: compiled.compiledPrompt.finalPrompt, promptSha256: hash(compiled.compiledPrompt.finalPrompt),
      semanticStatus: fields.every(field => field.finalPromptRetained) ? 'preserved' : 'blocked_field_loss'};
  });
  assert.equal(JSON.stringify(packet), before);
  const old = JSON.parse(fs.readFileSync(new URL('../../reports/restaurant-knowledge/offline-compile-comparison.json', import.meta.url), 'utf8'));
  const rks01dReplayPromptMatches = results[0].finalPrompt === old.proposedPrompt;
  // Supported explicit camera changes must resolve; a legacy default request
  // is intentionally normalized to the subtype-owned existing scene strategy.
  assert.equal(results[1].resolvedView, 'entrance_view');
  assert.equal(results[4].resolvedView, 'three_quarter_wide');
  assert.equal(results[5].resolvedView, 'operational_dining_view');
  const shotInputProbes = ['dining_view', 'operational_dining_view'].map(shot => {
    try {
      compileShortChainGeneration({projectContext: {visualDecisionPacket: packet},
        task: {...controls, subtype: 'dining', shot}, model: 'doubao-seedream-5-0-pro-260628'});
      return {shot, accepted: true, error: null};
    } catch (error) {
      return {shot, accepted: false, error: error instanceof Error ? error.message : String(error)};
    }
  });
  assert.equal(networkAttempts, 0);
  if (process.env.RKS_LINEAGE_EVIDENCE === '1') fs.writeFileSync(new URL('../../reports/restaurant-knowledge/RKS-01E-field-lineage.json', import.meta.url), JSON.stringify({
    scope: 'synthetic only; no live project record, no image 1 attribution, no knowledge promotion',
    baselineCommit: '224dc525845521e10f7a710e64120308a2f06054',
    counters: {realAnalysis: 0, realGeneration: 0, realValidation: 0, automaticRetries: 0, networkAttempts},
    packetSha256: hash(before), rks01dReplayPromptMatches, controls, shotInputProbes, results
  }, null, 2) + '\n');
});
