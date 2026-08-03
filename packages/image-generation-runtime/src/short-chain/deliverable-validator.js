import { evaluatePackagingEvidence } from '../task-families/packaging/evaluation.js';

export const SHORT_CHAIN_DELIVERABLE_VALIDATOR_ID = 'short-chain-deliverable-validator';
export const SHORT_CHAIN_DELIVERABLE_VALIDATOR_VERSION = '3.1.0';

const FAMILIES = new Set(['space', 'packaging', 'vi', 'poster']);

function list(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))];
}

function isDeferredIdentityTextIssue(value) {
  return /logo|brand\s*name|brand\s*text|brand\s*icon|icon\s*system|icons?|word|letter|signage|slogan|品牌名|品牌名称|标志|标识|文字|字样|标语|招牌|标牌|图标系统|图标/iu
    .test(String(value ?? ''));
}

function isVisibleIdentityTextEvidence(value) {
  const text = String(value ?? '');
  const mentionsText = /logo|brand\s*name|brand\s*text|word|letter|signage|slogan|Chinese text|品牌名|品牌名称|标志|标识|文字|字样|标语|招牌|标牌/iu
    .test(text);
  const explicitlyAbsent = /blank|absent|clean (?:placement )?area|reserved|留白|空白|未显示|无文字/iu
    .test(text);
  return mentionsText && !explicitlyAbsent;
}

function characters(value) {
  return [...String(value ?? '')].length;
}

function boundedNumber(value, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : undefined;
}

function lockedAssetQaResults(evidence, taskContract) {
  const selected = new Set(taskContract.referenceAssetIds || []);
  const results = (Array.isArray(evidence?.lockedAssetQa) ? evidence.lockedAssetQa : [])
    .filter((item) => item && typeof item === 'object' && selected.has(item.assetId))
    .map((item) => {
      const occurrenceCount = Math.max(0, Math.round(Number(item.occurrenceCount) || 0));
      const contourSimilarity = boundedNumber(item.contourSimilarity, 0, 1);
      const aspectRatioDeviation = boundedNumber(item.aspectRatioDeviation, 0, 1);
      const ocrConfidence = boundedNumber(item.ocrConfidence, 0, 1);
      const materialConfidence = boundedNumber(item.materialConfidence, 0, 1);
      const visibleWidthPx = boundedNumber(item.visibleWidthPx, 0, 100_000);
      const identitySimilarity = boundedNumber(item.identitySimilarity, 0, 1);
      const assetType = typeof item.assetType === 'string' ? item.assetType : 'other';
      const errors = [];
      if (occurrenceCount === 0) errors.push('missing_asset');
      if (occurrenceCount > 1) errors.push('duplicate_asset');
      if (assetType === 'ip_character') {
        if (identitySimilarity !== undefined && identitySimilarity < 0.9) errors.push('identity_deformation');
        if (item.proportionMatch === false) errors.push('character_proportion_error');
        if (item.signatureFeaturesMatch === false) errors.push('identity_deformation');
        if (item.primaryColorMatch === false) errors.push('primary_color_error');
      } else {
        const contourMinimum = assetType === 'icon' ? 0.9 : 0.92;
        const aspectMaximum = assetType === 'icon' ? 0.05 : 0.03;
        if (contourSimilarity !== undefined && contourSimilarity < contourMinimum) errors.push('contour_deformation');
        if (aspectRatioDeviation !== undefined && aspectRatioDeviation > aspectMaximum) errors.push('aspect_ratio_error');
      }
      if (visibleWidthPx !== undefined && visibleWidthPx < 96) errors.push('low_legibility');
      if (assetType === 'logo' && item.textExactMatch === false
        && (visibleWidthPx === undefined || visibleWidthPx >= 96)) errors.push('wrong_text');
      if (item.materialMatch === false) errors.push('material_failure');
      if (item.placementMatch === false) errors.push('wrong_placement');
      if (item.surfaceMatch === false) errors.push('surface_integration_error');
      if (item.occlusionMatch === false) errors.push('occlusion_error');
      if (item.seriesConsistencyMatch === false) errors.push('series_consistency_error');
      const unexpectedLogoCount = Math.max(0, Math.round(Number(item.unexpectedLogoCount) || 0));
      if (unexpectedLogoCount > 0) errors.push('unexpected_logo');
      const uniqueErrors = [...new Set(errors)];
      return {
        assetId: item.assetId,
        assetType,
        passed: uniqueErrors.length === 0,
        occurrenceCount,
        scores: {
          ...(contourSimilarity !== undefined ? { contourSimilarity } : {}),
          ...(aspectRatioDeviation !== undefined ? { aspectRatioDeviation } : {}),
          ...(ocrConfidence !== undefined ? { ocrConfidence } : {}),
          ...(materialConfidence !== undefined ? { materialConfidence } : {}),
          ...(visibleWidthPx !== undefined ? { visibleWidthPx } : {}),
          ...(identitySimilarity !== undefined ? { identitySimilarity } : {}),
        },
        errors: uniqueErrors,
        repairRecommended: uniqueErrors.some((error) => [
          'wrong_text', 'contour_deformation', 'aspect_ratio_error', 'duplicate_asset',
          'unexpected_logo', 'material_failure', 'low_legibility', 'wrong_placement',
          'identity_deformation', 'character_proportion_error', 'primary_color_error',
          'surface_integration_error', 'occlusion_error', 'series_consistency_error',
        ].includes(error)),
        fallbackRecommended: uniqueErrors.some((error) => [
          'wrong_text', 'contour_deformation', 'aspect_ratio_error', 'missing_asset',
          'identity_deformation', 'character_proportion_error',
        ].includes(error)),
      };
    });
  const reported = new Set(results.map((item) => item.assetId));
  for (const assetId of selected) {
    if (reported.has(assetId)) continue;
    results.push({
      assetId,
      assetType: 'other',
      passed: false,
      occurrenceCount: 0,
      scores: {},
      errors: ['missing_asset'],
      repairRecommended: false,
      fallbackRecommended: true,
    });
  }
  return results;
}

export function validateShortChainDeliverableEvidence({
  projectId,
  taskContract,
  runId,
  imageId,
  evidence,
  validatedAt = new Date().toISOString(),
}) {
  const detectedFamily = FAMILIES.has(evidence?.detectedFamily)
    ? evidence.detectedFamily
    : 'unknown';
  const detectedSubtype = typeof evidence?.detectedSubtype === 'string'
    && evidence.detectedSubtype.trim()
    ? evidence.detectedSubtype.trim()
    : 'unknown';
  const visibleEvidence = list(evidence?.visibleEvidence);
  const reportedMissingRequiredItems = list(evidence?.missingRequiredItems);
  const forbiddenItemsFound = list(evidence?.forbiddenItemsFound);
  const reportedLockedAssetViolations = list(evidence?.lockedAssetViolations);
  const deferredIdentityText = taskContract.logoUsageMode === 'post_composite';
  const missingRequiredItems = deferredIdentityText
    ? reportedMissingRequiredItems.filter((item) => !isDeferredIdentityTextIssue(item))
    : reportedMissingRequiredItems;
  const lockedAssetViolations = deferredIdentityText
    ? reportedLockedAssetViolations.filter((item) => !isDeferredIdentityTextIssue(item))
    : reportedLockedAssetViolations;
  let brandMatch = ['matched', 'mismatched', 'uncertain'].includes(evidence?.brandMatch)
    ? evidence.brandMatch
    : 'uncertain';
  const brandToneMatch = ['matched', 'mismatched', 'uncertain'].includes(evidence?.brandToneMatch)
    ? evidence.brandToneMatch
    : 'uncertain';
  const sceneCompleteness = ['complete', 'incomplete', 'uncertain'].includes(evidence?.sceneCompleteness)
    ? evidence.sceneCompleteness
    : 'uncertain';
  let logoTextStatus = ['correct', 'incorrect', 'absent', 'uncertain', 'not_required']
    .includes(evidence?.logoTextStatus)
    ? evidence.logoTextStatus
    : 'uncertain';
  const qualityIssues = list(evidence?.qualityIssues);
  const packagingEvaluation = taskContract.deliverableFamily === 'packaging'
    ? evaluatePackagingEvidence({ shotId: taskContract.shot, evidence })
    : null;
  const assetQa = lockedAssetQaResults(evidence, taskContract);
  for (const result of assetQa) {
    for (const error of result.errors) {
      lockedAssetViolations.push(`${result.assetId}:${error}`);
    }
  }
  const uniqueLockedAssetViolations = [...new Set(lockedAssetViolations)];
  const visibleIdentityText = deferredIdentityText
    && visibleEvidence.some(isVisibleIdentityTextEvidence);
  if (visibleIdentityText && ['absent', 'not_required', 'uncertain'].includes(logoTextStatus)) {
    logoTextStatus = 'incorrect';
  }
  const onlyDeferredIdentityTextIssues = deferredIdentityText
    && reportedMissingRequiredItems.length + reportedLockedAssetViolations.length > 0
    && missingRequiredItems.length === 0
    && lockedAssetViolations.length === 0
    && forbiddenItemsFound.length === 0
    && brandToneMatch === 'matched'
    && !visibleIdentityText;
  if (brandMatch === 'mismatched' && onlyDeferredIdentityTextIssues) brandMatch = 'uncertain';
  const mismatchTypes = [];
  if (detectedFamily !== 'unknown' && detectedFamily !== taskContract.deliverableFamily) {
    mismatchTypes.push('wrong_family');
  }
  if (detectedFamily === taskContract.deliverableFamily
    && detectedSubtype !== 'unknown'
    && detectedSubtype !== taskContract.subtype) {
    mismatchTypes.push('wrong_subtype');
  }
  if (missingRequiredItems.length) mismatchTypes.push('missing_required_structure');
  if (uniqueLockedAssetViolations.length) mismatchTypes.push('locked_asset_violation');
  if (forbiddenItemsFound.length) mismatchTypes.push('forbidden_content');
  if (brandMatch === 'mismatched') mismatchTypes.push('brand_mismatch');
  if (brandToneMatch === 'mismatched') mismatchTypes.push('brand_tone_mismatch');
  if (sceneCompleteness === 'incomplete') mismatchTypes.push('scene_incomplete');
  if (logoTextStatus === 'incorrect') mismatchTypes.push('logo_text_error');
  if (qualityIssues.length) mismatchTypes.push('quality_issue');
  if (packagingEvaluation?.status === 'failed') mismatchTypes.push('packaging_quality_failure');

  const unverified = detectedFamily === 'unknown' || visibleEvidence.length === 0
    || packagingEvaluation?.status === 'unverified';
  const status = unverified ? 'unverified' : mismatchTypes.length ? 'failed' : 'passed';
  return {
    schemaVersion: '1.0',
    projectId,
    taskId: taskContract.taskId,
    runId,
    imageId,
    status,
    detectedFamily,
    detectedSubtype,
    visibleEvidence,
    missingRequiredItems,
    forbiddenItemsFound,
    lockedAssetViolations: uniqueLockedAssetViolations,
    brandMatch,
    brandToneMatch,
    sceneCompleteness,
    logoTextStatus,
    qualityIssues,
    lockedAssetQaResults: assetQa,
    ...(packagingEvaluation ? { packagingEvaluation } : {}),
    mismatchTypes,
    retryRecommended: status === 'failed' && mismatchTypes.some((type) => [
      'wrong_family',
      'wrong_subtype',
      'missing_required_structure',
      'forbidden_content',
      'locked_asset_violation',
      'brand_tone_mismatch',
      'scene_incomplete',
      'logo_text_error',
      'quality_issue',
      'packaging_quality_failure',
    ].includes(type)),
    validatorId: SHORT_CHAIN_DELIVERABLE_VALIDATOR_ID,
    validatorVersion: SHORT_CHAIN_DELIVERABLE_VALIDATOR_VERSION,
    validatedAt,
  };
}

export function compileShortChainCorrectionPrompt({
  originalPrompt,
  taskContract,
  validation,
  maxPromptCharacters = 7_500,
}) {
  if (validation.status !== 'failed') {
    throw new Error('A correction prompt requires a failed deliverable validation');
  }
  const mismatch = [
    validation.mismatchTypes.includes('wrong_family')
      ? `The previous image was detected as ${validation.detectedFamily}; it must be ${taskContract.deliverableFamily}.`
      : '',
    validation.mismatchTypes.includes('wrong_subtype')
      ? `The previous subtype was ${validation.detectedSubtype}; it must be ${taskContract.subtype}.`
      : '',
    ...validation.missingRequiredItems.map((item) => `Missing required structure: ${item}.`),
    ...validation.lockedAssetViolations.map((item) => `Restore locked requirement: ${item}.`),
    ...validation.forbiddenItemsFound.map((item) => `Do not show: ${item}.`),
    validation.mismatchTypes.includes('brand_tone_mismatch')
      ? 'Restore the confirmed project tone and remove generic category styling.'
      : '',
    validation.mismatchTypes.includes('scene_incomplete')
      ? 'Rebuild a complete, continuous and functionally legible scene.'
      : '',
    validation.mismatchTypes.includes('logo_text_error')
      ? taskContract.referenceAssetIds?.length
        ? 'Faithfully restore every supplied selected visual asset in a clearly visible, recognizable design role; do not invent or repeat unrelated logos or text.'
        : taskContract.logoUsageMode === 'reference'
        ? 'Use only the supplied identity reference; do not invent or repeat logos or text.'
        : 'Remove every logo, letter, word and pseudo-text; keep only a clean placement area.'
      : '',
    ...list(validation.qualityIssues).map((item) => `Repair visible quality issue: ${item}.`),
  ].filter(Boolean);
  const correctionBlock = [
    '【一次性对题纠偏】',
    `Regenerate exactly one ${taskContract.deliverableFamily} / ${taskContract.subtype} result.`,
    ...mismatch.map((item) => `- ${item}`),
    `- Preserve the requested shot/composition: ${taskContract.shot}.`,
    '- Produce a formal finished deliverable, not an analysis board, moodboard, or collection of unrelated mockups.',
  ].join('\n');
  const maximum = Number(maxPromptCharacters);
  const sourceLines = originalPrompt.trim().split(/\r?\n/u);
  if (Number.isFinite(maximum) && maximum > 0) {
    const baseBudget = maximum - characters(correctionBlock) - 2;
    const removablePatterns = [
      /^- (?:Strict negative|User prohibition):/iu,
      /^- (?:Approved project prohibition|Approved tone prohibition):/iu,
      /^- (?:Target worldview|Approved generation goal):/iu,
      /^- Strict non-literal prohibition:/iu,
    ];
    for (const pattern of removablePatterns) {
      for (let index = sourceLines.length - 1;
        index >= 0 && characters(sourceLines.join('\n')) > baseBudget;
        index -= 1) {
        if (pattern.test(sourceLines[index])) sourceLines.splice(index, 1);
      }
    }
    while (characters(sourceLines.join('\n')) > baseBudget) {
      const candidates = sourceLines
        .map((line, index) => ({ line, index, length: characters(line) }))
        .filter((item) => item.line.startsWith('- ') && item.length > 120)
        .sort((a, b) => b.length - a.length);
      const target = candidates[0];
      if (!target) break;
      const excess = characters(sourceLines.join('\n')) - baseBudget;
      const nextLength = Math.max(120, target.length - excess - 1);
      sourceLines[target.index] = `${[...target.line].slice(0, nextLength).join('').trimEnd()}…`;
    }
    if (baseBudget <= 0 || characters(sourceLines.join('\n')) > baseBudget) {
      throw Object.assign(new Error('Correction instructions cannot fit the active prompt budget'), {
        code: 'CORRECTION_PROMPT_BUDGET_INSUFFICIENT',
      });
    }
  }
  return [sourceLines.join('\n').trim(), '', correctionBlock].join('\n');
}
