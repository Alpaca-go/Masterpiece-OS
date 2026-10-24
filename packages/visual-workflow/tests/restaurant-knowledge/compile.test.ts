import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {structuredAnalysisPacketFixture} from '../../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import {compileShortChainGeneration} from '../../src/generation-runtime/generation/compile.js';

test('synthetic Packet comparison uses existing pure compiler, with no confirmation or transport', t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('NETWORK_FORBIDDEN'); });
  const baseline = structuredAnalysisPacketFixture();
  baseline.projectFacts.industry.value = 'Restaurant';
  baseline.mediaTranslations.spatial.spatialConcept = 'Modern efficient casual dining';
  const proposed = structuredClone(baseline);
  proposed.mediaTranslations.spatial.spatialConcept = 'Warm neighborhood dining with visible cooking';
  proposed.mediaTranslations.spatial.mustBeVisible = ['chef preparing food', 'steam above dishes', 'customers dining at tables'];
  const snapshots = JSON.stringify({baseline, proposed});
  const task = {projectId: baseline.projectId, deliverableFamily: 'space', subtype: 'lobby', shot: 'entrance_view',
    count: 1, aspectRatio: '16:9', generationBasis: 'standard', referenceAssetIds: [], logoUsageMode: 'post_composite',
    currentInstruction: 'Show a credible operating restaurant with a clear entrance and dining depth.'};
  const compile = (packet: any) => compileShortChainGeneration({projectContext: {visualDecisionPacket: packet},
    model: 'doubao-seedream-5-0-pro-260628', task, now: '2026-10-24T00:00:00.000Z'});
  const a = compile(baseline), b = compile(proposed);
  assert.equal(JSON.stringify({baseline, proposed}), snapshots);
  assert.notEqual(a.compiledPrompt.finalPrompt, b.compiledPrompt.finalPrompt);
  assert(b.compiledPrompt.finalPrompt.includes(proposed.mediaTranslations.spatial.spatialConcept));
  const fieldChecks = proposed.mediaTranslations.spatial.mustBeVisible.map(text => ({
    source: 'mediaTranslations.spatial.mustBeVisible', text, retained: b.compiledPrompt.finalPrompt.includes(text)
  }));
  // This is a diagnostic experiment, not a new Golden expectation. A field loss
  // blocks semantic acceptance and is reported without changing the compiler.
  const semanticStatus = fieldChecks.every(item => item.retained) ? 'pass' : 'blocked_field_loss';
  assert.deepEqual(a.compiledPrompt.referenceAssetIds, []); assert.deepEqual(b.compiledPrompt.referenceAssetIds, []);
  assert.equal(a.compiledPrompt.userConfirmedVisualDecision, null); assert.equal(b.compiledPrompt.userConfirmedVisualDecision, null);
  assert.deepEqual(Object.keys(a.payload).sort(), Object.keys(b.payload).sort());
  const controls = (payload: any) => ({...payload, prompt: null,
    referenceBoundary: {...payload.referenceBoundary, promptCharacters: null}});
  assert.deepEqual(controls(a.payload), controls(b.payload));
  for (const output of [a, b]) assert.equal(output.payload.referenceBoundary.promptCharacters, [...output.payload.prompt].length);
  assert.equal('image' in b.payload, false);
  assert.equal(calls, 0);
  // Evidence output is opt-in, contains only this synthetic Packet, never live project inputs.
  if (process.env.RKS_COMPILE_EVIDENCE === '1') fs.writeFileSync(new URL('../../reports/restaurant-knowledge/offline-compile-comparison.json', import.meta.url), JSON.stringify({
    scope: 'synthetic semantic experiment only; not image 1 reconstruction or visual acceptance',
    task, model: b.payload.model, realProviderCalls: calls, confirmation: null, semanticStatus, fieldChecks,
    baselinePrompt: a.compiledPrompt.finalPrompt, proposedPrompt: b.compiledPrompt.finalPrompt,
    sourceMap: b.compiledPrompt.sourceMap, payloadKeys: Object.keys(b.payload),
    referenceAssetIds: b.compiledPrompt.referenceAssetIds
  }, null, 2) + '\n');
});
