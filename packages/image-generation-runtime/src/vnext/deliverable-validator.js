export const VNEXT_DELIVERABLE_VALIDATOR_ID = 'vnext-deliverable-validator';
export const VNEXT_DELIVERABLE_VALIDATOR_VERSION = '2.0.0';

const FAMILIES = new Set(['space', 'packaging', 'vi', 'poster']);

function list(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))];
}

export function validateVNextDeliverableEvidence({
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
  const missingRequiredItems = list(evidence?.missingRequiredItems);
  const forbiddenItemsFound = list(evidence?.forbiddenItemsFound);
  const lockedAssetViolations = list(evidence?.lockedAssetViolations);
  const brandMatch = ['matched', 'mismatched', 'uncertain'].includes(evidence?.brandMatch)
    ? evidence.brandMatch
    : 'uncertain';
  const brandToneMatch = ['matched', 'mismatched', 'uncertain'].includes(evidence?.brandToneMatch)
    ? evidence.brandToneMatch
    : 'uncertain';
  const sceneCompleteness = ['complete', 'incomplete', 'uncertain'].includes(evidence?.sceneCompleteness)
    ? evidence.sceneCompleteness
    : 'uncertain';
  const logoTextStatus = ['correct', 'incorrect', 'absent', 'uncertain', 'not_required']
    .includes(evidence?.logoTextStatus)
    ? evidence.logoTextStatus
    : 'uncertain';
  const qualityIssues = list(evidence?.qualityIssues);
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
  if (lockedAssetViolations.length) mismatchTypes.push('locked_asset_violation');
  if (forbiddenItemsFound.length) mismatchTypes.push('forbidden_content');
  if (brandMatch === 'mismatched') mismatchTypes.push('brand_mismatch');
  if (brandToneMatch === 'mismatched') mismatchTypes.push('brand_tone_mismatch');
  if (sceneCompleteness === 'incomplete') mismatchTypes.push('scene_incomplete');
  if (logoTextStatus === 'incorrect') mismatchTypes.push('logo_text_error');
  if (qualityIssues.length) mismatchTypes.push('quality_issue');

  const unverified = detectedFamily === 'unknown' || visibleEvidence.length === 0;
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
    lockedAssetViolations,
    brandMatch,
    brandToneMatch,
    sceneCompleteness,
    logoTextStatus,
    qualityIssues,
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
    ].includes(type)),
    validatorId: VNEXT_DELIVERABLE_VALIDATOR_ID,
    validatorVersion: VNEXT_DELIVERABLE_VALIDATOR_VERSION,
    validatedAt,
  };
}

export function compileVNextCorrectionPrompt({
  originalPrompt,
  taskContract,
  validation,
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
      ? taskContract.logoUsageMode === 'reference'
        ? 'Use only the supplied identity reference; do not invent or repeat logos or text.'
        : 'Remove every logo, letter, word and pseudo-text; keep only a clean placement area.'
      : '',
    ...list(validation.qualityIssues).map((item) => `Repair visible quality issue: ${item}.`),
  ].filter(Boolean);
  return [
    originalPrompt.trim(),
    '',
    '【一次性对题纠偏】',
    `Regenerate exactly one ${taskContract.deliverableFamily} / ${taskContract.subtype} result.`,
    ...mismatch.map((item) => `- ${item}`),
    `- Preserve the requested shot/composition: ${taskContract.shot}.`,
    '- Produce a formal finished deliverable, not an analysis board, moodboard, or collection of unrelated mockups.',
  ].join('\n');
}
