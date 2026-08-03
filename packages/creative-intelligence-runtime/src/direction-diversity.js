const COMPARISON_FIELDS = Object.freeze({
  strategicProposition: 'strategicProposition',
  coreMetaphor: 'coreMetaphor',
  visualMechanism: 'visualGenerationMechanism',
  compositionLogic: 'compositionLogic',
  materialLogic: 'imageMaterialLogic',
  perceptionOutcome: 'perceptionOutcome'
});

function units(value) {
  const normalized = String(value || '').toLocaleLowerCase('en-US').replace(/\s+/g, ' ').trim();
  if (/\p{Script=Han}/u.test(normalized)) {
    const compact = normalized.replace(/[^\p{L}\p{N}]/gu, '');
    return new Set([...compact].slice(0, -1).map((character, index) => `${character}${compact[index + 1]}`));
  }
  return new Set(normalized.match(/[\p{L}\p{N}]{2,}/gu) || []);
}

function similarity(left, right) {
  const a = units(left);
  const b = units(right);
  if (!a.size && !b.size) return 1;
  const intersection = [...a].filter((item) => b.has(item)).length;
  return intersection / new Set([...a, ...b]).size;
}

export function validateDirectionDiversity(directionSet, { similarityThreshold = 0.58 } = {}) {
  if (!directionSet?.directions || directionSet.directions.length !== 3) {
    throw new Error('Direction Diversity Validator requires exactly three directions');
  }
  const pairComparisons = [];
  const errors = [];
  for (let leftIndex = 0; leftIndex < 2; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < 3; rightIndex += 1) {
      const a = directionSet.directions[leftIndex];
      const b = directionSet.directions[rightIndex];
      const differences = Object.fromEntries(Object.entries(COMPARISON_FIELDS).map(([name, field]) => [
        name,
        similarity(a[field], b[field]) < similarityThreshold
      ]));
      const differenceCount = Object.values(differences).filter(Boolean).length;
      const coreDifferenceCount = [differences.strategicProposition, differences.coreMetaphor, differences.visualMechanism].filter(Boolean).length;
      const variationOnly = differenceCount < 4 || coreDifferenceCount < 2;
      pairComparisons.push({ a: a.id, b: b.id, differences, variationOnly });
      if (variationOnly) errors.push({ code: 'DIRECTION_VARIATION_ONLY', directions: [a.id, b.id] });
    }
  }
  return {
    schemaVersion: '1.0', projectId: directionSet.projectId,
    status: errors.length ? 'failed' : 'passed', pairComparisons, errors
  };
}
