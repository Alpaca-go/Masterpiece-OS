export const VNEXT_DELIVERABLE_VALIDATOR_ID = 'vnext-deliverable-validator';
export const VNEXT_DELIVERABLE_VALIDATOR_VERSION = '1.0.0';

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
    mismatchTypes,
    retryRecommended: status === 'failed' && mismatchTypes.some((type) => [
      'wrong_family',
      'wrong_subtype',
      'missing_required_structure',
      'forbidden_content',
      'locked_asset_violation',
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
