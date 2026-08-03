import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileShortChainCorrectionPrompt,
  validateShortChainDeliverableEvidence,
} from '@masterpiece/image-generation-runtime/short-chain/index.js';
import {
  loadGlobalSpaceEvaluationProfile,
  loadProjectSpaceEvaluationProfile,
} from '@masterpiece/image-generation-runtime';

const taskContract = {
  schemaVersion: '1.0',
  taskId: 'task-space-reception',
  projectId: 'project-1',
  deliverableFamily: 'space',
  subtype: 'reception',
  shot: 'entrance_view',
  count: 1,
  aspectRatio: '16:9',
  currentInstruction: 'Create a real reception interior.',
  mustInclude: ['reception desk'],
  mustAvoid: ['VI display board'],
  referenceAssetIds: [],
  createdAt: '2026-07-29T00:00:00.000Z',
};

test('Deliverable validation classifies a VI board returned for a space task as a hard mismatch', () => {
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'project-1',
    taskContract,
    runId: 'run-1',
    imageId: 'image-1',
    evidence: {
      detectedFamily: 'vi',
      detectedSubtype: 'business_card',
      visibleEvidence: ['business card', 'letterhead', 'logo board'],
      missingRequiredItems: ['floor/wall/ceiling enclosure', 'reception desk'],
      forbiddenItemsFound: ['VI display board'],
      lockedAssetViolations: [],
      brandMatch: 'matched',
    },
  });
  assert.equal(validation.status, 'failed');
  assert.deepEqual(validation.mismatchTypes, [
    'wrong_family',
    'missing_required_structure',
    'forbidden_content',
  ]);
  assert.equal(validation.retryRecommended, true);
});

test('Deliverable validation refuses to self-certify an output without visible image evidence', () => {
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'project-1',
    taskContract,
    runId: 'run-1',
    imageId: 'image-1',
    evidence: {
      detectedFamily: 'unknown',
      visibleEvidence: [],
    },
  });
  assert.equal(validation.status, 'unverified');
  assert.equal(validation.retryRecommended, false);
});

test('post-composite mode defers absent Logo and brand text to the composition stage', () => {
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'project-1',
    taskContract: { ...taskContract, logoUsageMode: 'post_composite' },
    runId: 'run-1',
    imageId: 'image-1',
    evidence: {
      detectedFamily: 'space',
      detectedSubtype: 'reception',
      visibleEvidence: ['continuous reception scene', 'clean blank signage area'],
      missingRequiredItems: ['Brand Name', 'Original Logo asset'],
      lockedAssetViolations: ['The blank signage does not display the required logo or brand name text'],
      forbiddenItemsFound: [],
      brandMatch: 'mismatched',
      brandToneMatch: 'matched',
      sceneCompleteness: 'complete',
      logoTextStatus: 'absent',
    },
  });

  assert.equal(validation.status, 'passed');
  assert.deepEqual(validation.missingRequiredItems, []);
  assert.deepEqual(validation.lockedAssetViolations, []);
  assert.equal(validation.brandMatch, 'uncertain');
  assert.deepEqual(validation.mismatchTypes, []);
});

test('post-composite mode rejects visible text evidence that contradicts an absent status', () => {
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'project-1',
    taskContract: { ...taskContract, logoUsageMode: 'post_composite' },
    runId: 'run-1',
    imageId: 'image-1',
    evidence: {
      detectedFamily: 'space',
      detectedSubtype: 'reception',
      visibleEvidence: ['Vertical white 3D Chinese text on the right wall', 'clean blank logo panel'],
      missingRequiredItems: [],
      lockedAssetViolations: [],
      forbiddenItemsFound: [],
      brandMatch: 'matched',
      brandToneMatch: 'matched',
      sceneCompleteness: 'complete',
      logoTextStatus: 'absent',
    },
  });

  assert.equal(validation.status, 'failed');
  assert.equal(validation.logoTextStatus, 'incorrect');
  assert.equal(validation.mismatchTypes.includes('logo_text_error'), true);
  assert.equal(validation.retryRecommended, true);
});

test('post-composite mode defers the exact brand icon system to deterministic composition', () => {
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'project-1',
    taskContract: { ...taskContract, logoUsageMode: 'post_composite' },
    runId: 'run-1',
    imageId: 'image-1',
    evidence: {
      detectedFamily: 'space',
      detectedSubtype: taskContract.subtype,
      visibleEvidence: ['complete enterable brand retail space with clean identity areas'],
      missingRequiredItems: ['four brand icon system is absent'],
      lockedAssetViolations: ['exact brand icons are not visible'],
      forbiddenItemsFound: [],
      brandMatch: 'matched',
      brandToneMatch: 'matched',
      sceneCompleteness: 'complete',
      logoTextStatus: 'absent',
      qualityIssues: [],
    },
  });
  assert.equal(validation.status, 'passed');
  assert.deepEqual(validation.missingRequiredItems, []);
  assert.deepEqual(validation.lockedAssetViolations, []);
});

test('Correction prompt preserves original prompt and adds one explicit repair block', () => {
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'project-1',
    taskContract,
    runId: 'run-1',
    imageId: 'image-1',
    evidence: {
      detectedFamily: 'vi',
      detectedSubtype: 'business_card',
      visibleEvidence: ['business card'],
      missingRequiredItems: ['reception desk'],
      forbiddenItemsFound: ['VI display board'],
      lockedAssetViolations: [],
      brandMatch: 'matched',
    },
  });
  const correction = compileShortChainCorrectionPrompt({
    originalPrompt: 'ORIGINAL PROMPT',
    taskContract,
    validation,
  });
  assert.match(correction, /^ORIGINAL PROMPT/u);
  assert.match(correction, /must be space/u);
  assert.match(correction, /reception desk/u);
  assert.match(correction, /Do not show: VI display board/u);
  assert.equal((correction.match(/一次性对题纠偏/gu) ?? []).length, 1);
});

test('Locked Asset QA applies contour, aspect, OCR, occurrence and legibility thresholds', () => {
  const selectedTask = {
    ...taskContract,
    referenceAssetIds: ['logo-primary'],
    brandMarkRenderMode: 'locked_asset_render',
    logoUsageMode: 'reference',
  };
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'project-1',
    taskContract: selectedTask,
    runId: 'run-logo-qa',
    imageId: 'image-1',
    evidence: {
      detectedFamily: 'space',
      detectedSubtype: 'reception',
      visibleEvidence: ['one large brand wall with a distorted mark'],
      brandMatch: 'matched',
      brandToneMatch: 'matched',
      sceneCompleteness: 'complete',
      logoTextStatus: 'incorrect',
      lockedAssetQa: [{
        assetId: 'logo-primary',
        assetType: 'logo',
        occurrenceCount: 2,
        contourSimilarity: 0.81,
        aspectRatioDeviation: 0.08,
        textExactMatch: false,
        ocrConfidence: 0.62,
        materialMatch: false,
        materialConfidence: 0.3,
        visibleWidthPx: 180,
        placementMatch: false,
        unexpectedLogoCount: 1,
      }],
    },
  });
  assert.equal(validation.status, 'failed');
  assert.deepEqual(validation.lockedAssetQaResults[0].errors, [
    'duplicate_asset',
    'contour_deformation',
    'aspect_ratio_error',
    'wrong_text',
    'material_failure',
    'wrong_placement',
    'unexpected_logo',
  ]);
  assert.equal(validation.lockedAssetQaResults[0].repairRecommended, true);
  assert.equal(validation.lockedAssetQaResults[0].fallbackRecommended, true);
  assert.equal(validation.lockedAssetViolations.includes('logo-primary:wrong_text'), true);
});

test('IP QA locks character identity but does not apply Logo OCR rules', () => {
  const ipTask = {
    ...taskContract,
    referenceAssetIds: ['ip-main'],
    brandMarkRenderMode: 'locked_asset_render',
  };
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'project-1',
    taskContract: ipTask,
    runId: 'run-ip-qa',
    imageId: 'image-1',
    evidence: {
      detectedFamily: 'space',
      detectedSubtype: 'reception',
      visibleEvidence: ['one mascot sculpture in a supporting zone'],
      brandMatch: 'matched',
      brandToneMatch: 'matched',
      sceneCompleteness: 'complete',
      logoTextStatus: 'not_required',
      lockedAssetQa: [{
        assetId: 'ip-main',
        assetType: 'ip_character',
        occurrenceCount: 1,
        identitySimilarity: 0.86,
        proportionMatch: false,
        signatureFeaturesMatch: true,
        primaryColorMatch: false,
        textExactMatch: false,
        visibleWidthPx: 220,
        placementMatch: true,
      }],
    },
  });
  assert.deepEqual(validation.lockedAssetQaResults[0].errors, [
    'identity_deformation',
    'character_proportion_error',
    'primary_color_error',
  ]);
  assert.equal(validation.lockedAssetQaResults[0].errors.includes('wrong_text'), false);
});

test('Correction prompt restores selected visual assets instead of removing them under blank-area mode', () => {
  const selectedTask = {
    ...taskContract,
    logoUsageMode: 'blank_area',
    referenceAssetIds: ['selected-logo-ip-sheet'],
  };
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'project-1',
    taskContract: selectedTask,
    runId: 'run-1',
    imageId: 'image-1',
    evidence: {
      detectedFamily: 'space',
      detectedSubtype: 'reception',
      visibleEvidence: ['complete reception without the selected identity'],
      lockedAssetViolations: ['selected Logo and IP character are absent'],
      brandMatch: 'mismatched',
      logoTextStatus: 'incorrect',
    },
  });
  const correction = compileShortChainCorrectionPrompt({
    originalPrompt: 'ORIGINAL PROMPT',
    taskContract: selectedTask,
    validation,
  });

  assert.match(correction, /restore every supplied selected visual asset/u);
  assert.doesNotMatch(correction, /Remove every logo, letter, word/u);
});

test('Correction prompt compacts duplicate negative guidance to the active adapter budget', () => {
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'project-1',
    taskContract,
    runId: 'run-1',
    imageId: 'image-1',
    evidence: {
      detectedFamily: 'space',
      detectedSubtype: 'reception',
      visibleEvidence: ['incomplete room'],
      missingRequiredItems: ['continuous circulation'],
      sceneCompleteness: 'incomplete',
    },
  });
  const originalPrompt = [
    '【02 Current Task — Highest Priority】',
    `- ESSENTIAL TASK ${'x'.repeat(5_800)}`,
    '【05 Positive Spatial Mechanism — Must Drive the Image】',
    '- reception connects entrance, waiting and service',
    ...Array.from({ length: 20 }, (_, index) => `- Strict negative: duplicate guidance ${index} ${'y'.repeat(80)}`),
  ].join('\n');
  const correction = compileShortChainCorrectionPrompt({
    originalPrompt,
    taskContract,
    validation,
    maxPromptCharacters: 7_500,
  });

  assert.equal([...correction].length <= 7_500, true);
  assert.match(correction, /ESSENTIAL TASK/u);
  assert.match(correction, /continuous circulation/u);
  assert.equal((correction.match(/一次性对题纠偏/gu) ?? []).length, 1);
});

test('Foundation Preservation hard-fails a visually compressed large-space result', () => {
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'project-1',
    taskContract,
    runId: 'run-foundation',
    imageId: 'image-foundation',
    spatialCompiledContext: {
      foundationSnapshot: {
        spaceType: 'large_lobby',
        spatialScale: { class: 'large', preservation: 'lock' },
      },
    },
    evidence: {
      detectedFamily: 'space',
      detectedSubtype: 'reception',
      visibleEvidence: ['compact low-ceiling reception room'],
      brandMatch: 'matched',
      brandToneMatch: 'matched',
      sceneCompleteness: 'complete',
      logoTextStatus: 'correct',
      foundationPreservation: {
        architectureAestheticPreserved: true,
        spatialScalePreserved: false,
        largeSpaceIntentPreserved: false,
        functionalZoningPreserved: true,
        cameraRolePreserved: true,
      },
    },
  });
  assert.equal(validation.status, 'failed');
  assert.ok(validation.mismatchTypes.includes('spatial_foundation_overridden'));
  const correction = compileShortChainCorrectionPrompt({
    originalPrompt: 'ORIGINAL PROMPT',
    taskContract,
    validation,
  });
  assert.match(correction, /Restore the locked architecture, large-space scale/u);
});

test('split spatial evaluators merge global quality and project Golden failures', () => {
  const global = loadGlobalSpaceEvaluationProfile();
  const project = loadProjectSpaceEvaluationProfile('jiuzhou-aesthetics');
  const score = (profile, value) => Object.fromEntries(
    profile.dimensions.map((dimension) => [dimension.id, value]),
  );
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'jiuzhou-aesthetics',
    taskContract: { ...taskContract, projectId: 'jiuzhou-aesthetics' },
    runId: 'run-split-evaluation',
    imageId: 'image-split-evaluation',
    spatialCompiledContext: {
      foundationSnapshot: { spaceType: 'reception', spatialScale: { preservation: 'lock' } },
    },
    spatialEvaluationProfiles: { global, project },
    evidence: {
      detectedFamily: 'space',
      detectedSubtype: 'reception',
      visibleEvidence: ['real reception interior with project identity'],
      brandMatch: 'matched', brandToneMatch: 'matched',
      sceneCompleteness: 'complete', logoTextStatus: 'correct',
      foundationPreservation: {
        architectureAestheticPreserved: true, spatialScalePreserved: true,
        largeSpaceIntentPreserved: true, functionalZoningPreserved: true,
        cameraRolePreserved: true,
      },
      globalSpaceScores: score(global, 94),
      projectGoldenScores: score(project, 94),
      projectFailureTags: ['logo_drift'],
    },
  });
  assert.equal(validation.status, 'failed');
  assert.ok(validation.mismatchTypes.includes('spatial_golden_failure'));
  assert.equal(validation.spatialEvaluation.finalDecision, 'fail');
  assert.ok(validation.spatialEvaluation.failureTags.includes('logo_drift'));
});

test('Logo ratio contract hard-fails an otherwise high-scoring project result', () => {
  const global = loadGlobalSpaceEvaluationProfile();
  const project = loadProjectSpaceEvaluationProfile('jiuzhou-aesthetics');
  const score = (profile, value) => Object.fromEntries(
    profile.dimensions.map((dimension) => [dimension.id, value]),
  );
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'jiuzhou-aesthetics',
    taskContract: { ...taskContract, projectId: 'jiuzhou-aesthetics' },
    runId: 'run-logo-scale-contract',
    imageId: 'image-logo-scale-contract',
    spatialCompiledContext: {
      foundationSnapshot: { spaceType: 'reception', spatialScale: { preservation: 'lock' } },
      projectCanon: {
        brandSignageContract: {
          logoSymbol: { wallHeightRatio: { max: 0.15 } },
          fullLockup: { wallWidthRatio: { max: 0.28 } },
        },
      },
    },
    spatialEvaluationProfiles: { global, project },
    evidence: {
      detectedFamily: 'space', detectedSubtype: 'reception',
      visibleEvidence: ['complete reception with an oversized wall mark'],
      brandMatch: 'matched', brandToneMatch: 'matched', sceneCompleteness: 'complete',
      logoTextStatus: 'correct',
      foundationPreservation: {
        architectureAestheticPreserved: true, spatialScalePreserved: true,
        largeSpaceIntentPreserved: true, functionalZoningPreserved: true,
        cameraRolePreserved: true,
      },
      globalSpaceScores: score(global, 96), projectGoldenScores: score(project, 96),
      logoScale: {
        symbolWallHeightRatio: 0.32,
        fullLockupWallWidthRatio: 0.41,
        signageDominatesFirstRead: true,
      },
    },
  });
  assert.equal(validation.status, 'failed');
  assert.equal(validation.spatialEvaluation.finalDecision, 'fail');
  assert.ok(validation.spatialEvaluation.failureTags.includes('logo_oversized'));
  assert.match(validation.spatialEvaluation.revisionActions.join('\n'), /below 15%/u);
});
