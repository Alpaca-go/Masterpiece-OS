export const PROJECT_SIGNATURE_DIMENSIONS = Object.freeze([
  'paletteSignature',
  'motifSignature',
  'architecturalSignature',
  'materialSignature',
  'narrativeSignature',
]);

function meaningful(value) {
  return value !== null && value !== undefined && JSON.stringify(value) !== '""';
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function validateProjectSignatureDifference({
  projectSignature,
  referenceSignature,
  minimumDistinctDimensions = 3,
}) {
  const missingDimensions = PROJECT_SIGNATURE_DIMENSIONS.filter((dimension) =>
    !meaningful(projectSignature?.[dimension]));
  const distinctDimensions = PROJECT_SIGNATURE_DIMENSIONS.filter((dimension) =>
    meaningful(projectSignature?.[dimension])
    && !same(projectSignature[dimension], referenceSignature?.[dimension]));
  return {
    valid: missingDimensions.length === 0
      && distinctDimensions.length >= minimumDistinctDimensions,
    minimumDistinctDimensions,
    distinctDimensions,
    missingDimensions,
  };
}

export function assertProjectSignatureDifference(input) {
  const result = validateProjectSignatureDifference(input);
  if (result.valid) return result;
  throw Object.assign(new Error(
    `Project signature must define all five dimensions and differ in at least ${result.minimumDistinctDimensions}; found ${result.distinctDimensions.length}.`,
  ), {
    code: 'PROJECT_SIGNATURE_TOO_SIMILAR',
    ...result,
  });
}
