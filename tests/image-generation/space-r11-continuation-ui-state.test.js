// R11.2 Continuation UI state tests.
//
// Pure-logic coverage of the continuation panel rules:
//   - same-scene target card disabled
//   - custom scene requires a description
//   - submit CTA gating (confirmed source, target selected, target != source,
//     custom valid)
//   - lineage label (Reception → Consultation)
//   - scene card list is user-facing (no engineering terms)
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const stateUrl = pathToFileURL(path.join(
  repoRoot,
  'apps/desktop/src/renderer/src/continuation/ui-state.js',
)).href;

const {
  CONTINUATION_SCENE_CARDS,
  isTargetSceneDisabled,
  isCustomSceneValid,
  canSubmitContinuation,
  continuationLineageLabel,
  CROSS_SCENE_ADVISORY_CODE,
  generationModeLabel,
  referenceFirstCrossSceneAdvisory,
  findCrossSceneReference,
} = await import(stateUrl);

test('R11.2 scene cards are user-facing (no engineering terms)', () => {
  assert.equal(CONTINUATION_SCENE_CARDS.length, 10);
  const ids = CONTINUATION_SCENE_CARDS.map((c) => c.id);
  for (const id of ['entrance', 'lobby', 'reception', 'consultation', 'treatment_room', 'private_room', 'display', 'retail', 'dining', 'custom']) {
    assert.ok(ids.includes(id), `scene ${id}`);
  }
  const text = CONTINUATION_SCENE_CARDS.map((c) => `${c.label}${c.hint}`).join(' ');
  assert.doesNotMatch(text, /world_consistency|referenceRole|r8_6_golden|functional program|IR|Gate/iu, 'no engineering terms');
});

test('R11.2 same-scene target card is disabled', () => {
  assert.equal(isTargetSceneDisabled('consultation', 'consultation'), true);
  assert.equal(isTargetSceneDisabled('consultation', 'reception'), false);
  assert.equal(isTargetSceneDisabled('reception', 'reception'), true);
  assert.equal(isTargetSceneDisabled('reception', 'RECEPTION'), true, 'case-insensitive');
});

test('R11.2 custom scene requires a non-empty description', () => {
  assert.equal(isCustomSceneValid('custom', ''), false);
  assert.equal(isCustomSceneValid('custom', '   '), false);
  assert.equal(isCustomSceneValid('custom', '更私密的小型 VIP 咨询室'), true);
  assert.equal(isCustomSceneValid('consultation', ''), true, 'non-custom ignores description');
});

test('R11.2 submit CTA gating', () => {
  // Needs confirmed source + target + target != source + custom valid.
  assert.equal(canSubmitContinuation({ sourceConfirmed: false, sourceScene: 'reception', targetScene: 'consultation', customDescription: '' }), false);
  assert.equal(canSubmitContinuation({ sourceConfirmed: true, sourceScene: 'reception', targetScene: 'consultation', customDescription: '' }), true);
  assert.equal(canSubmitContinuation({ sourceConfirmed: true, sourceScene: 'reception', targetScene: 'reception', customDescription: '' }), false, 'same scene');
  assert.equal(canSubmitContinuation({ sourceConfirmed: true, sourceScene: 'reception', targetScene: 'custom', customDescription: '' }), false, 'custom empty');
  assert.equal(canSubmitContinuation({ sourceConfirmed: true, sourceScene: 'reception', targetScene: 'custom', customDescription: 'VIP 咨询室' }), true);
  assert.equal(canSubmitContinuation({ sourceConfirmed: true, sourceScene: 'reception', targetScene: null, customDescription: '' }), false, 'no target');
});

test('R11.2 lineage label renders source → target', () => {
  assert.equal(continuationLineageLabel('reception', 'consultation'), 'reception → consultation');
  assert.equal(continuationLineageLabel('dining', 'entrance'), 'dining → entrance');
  assert.equal(continuationLineageLabel('', 'consultation'), '');
});

// ---- R11.2.2 mode boundary UI rules ---------------------------------------

test('R11.2.2 mode badges are user-facing labels', () => {
  assert.equal(generationModeLabel('standard'), '标准生成');
  assert.equal(generationModeLabel('reference_first'), '参考优先');
  assert.equal(generationModeLabel('continuation'), '空间延展');
  assert.equal(generationModeLabel('unknown'), '');
});

test('R11.2.2 cross-scene advisory requires provable generated-output provenance', () => {
  assert.equal(
    referenceFirstCrossSceneAdvisory({ sourceAssetOrigin: 'generated_output', sourceScene: 'reception', targetScene: 'consultation' })?.code,
    CROSS_SCENE_ADVISORY_CODE,
  );
  // Same scene: no advisory.
  assert.equal(referenceFirstCrossSceneAdvisory({ sourceAssetOrigin: 'generated_output', sourceScene: 'reception', targetScene: 'reception' }), null);
  // user_upload copy: provenance unknown -> never advise.
  assert.equal(referenceFirstCrossSceneAdvisory({ sourceAssetOrigin: 'user_upload', sourceScene: undefined, targetScene: 'consultation' }), null);
  // project asset: no scene identity -> never advise.
  assert.equal(referenceFirstCrossSceneAdvisory({ sourceAssetOrigin: 'project_visual_asset', sourceScene: undefined, targetScene: 'consultation' }), null);
});

test('R11.2.2 findCrossSceneReference only matches confirmed generated outputs', () => {
  const confirmedOutputs = {
    'a1': { assetId: 'a1', assetOrigin: 'generated_output', deliverableFamily: 'space', sourceScene: 'reception', confirmationState: 'confirmed' },
    'a2': { assetId: 'a2', assetOrigin: 'generated_output', deliverableFamily: 'space', sourceScene: 'reception', confirmationState: 'revoked' },
    'b1': { assetId: 'b1', assetOrigin: 'user_upload', sourceScene: undefined, confirmationState: 'confirmed' },
  };
  // Cross-scene confirmed generated output found.
  const hit = findCrossSceneReference({ referenceAssetIds: ['a1'], confirmedOutputs, targetScene: 'consultation' });
  assert.equal(hit?.assetId, 'a1');
  assert.equal(hit?.advisory?.code, CROSS_SCENE_ADVISORY_CODE);
  // Revoked output never matches.
  assert.equal(findCrossSceneReference({ referenceAssetIds: ['a2'], confirmedOutputs, targetScene: 'consultation' }), null);
  // user_upload copy never matches.
  assert.equal(findCrossSceneReference({ referenceAssetIds: ['b1'], confirmedOutputs, targetScene: 'consultation' }), null);
  // Same scene never matches.
  assert.equal(findCrossSceneReference({ referenceAssetIds: ['a1'], confirmedOutputs, targetScene: 'reception' }), null);
  // Multiple refs: first cross-scene match wins.
  const mixed = findCrossSceneReference({ referenceAssetIds: ['b1', 'a1'], confirmedOutputs, targetScene: 'consultation' });
  assert.equal(mixed?.assetId, 'a1');
});
