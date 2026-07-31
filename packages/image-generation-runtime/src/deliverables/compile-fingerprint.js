import { createHash } from 'node:crypto';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function stableHash(value) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function referencePlanIdentity(referencePlan) {
  if (Array.isArray(referencePlan)) {
    return referencePlan.map((item) => ({ assetId: item.assetId, role: item.role }));
  }
  return {
    selected: (referencePlan?.selected ?? []).map((item) => ({ assetId: item.assetId, role: item.role })),
    analysisOnly: (referencePlan?.analysisOnly ?? []).map((item) => ({ assetId: item.assetId, role: item.role })),
    excluded: (referencePlan?.excluded ?? []).map((item) => ({ assetId: item.assetId, role: item.role })),
  };
}

export function createCompileFingerprint({
  sourceBundle,
  userIntent,
  deliverable,
  referencePlan,
  compiledPrompt,
  compiledAt,
}) {
  return {
    sourceBundleHash: stableHash(sourceBundle),
    userIntentHash: stableHash(userIntent),
    deliverableHash: stableHash(deliverable),
    referencePlanHash: stableHash(referencePlanIdentity(referencePlan)),
    compiledPromptHash: stableHash(compiledPrompt),
    compiledAt,
  };
}

export function verifyCompileFingerprint(fingerprint, current) {
  if (!fingerprint) return { valid: false, code: 'COMPILE_INPUT_STALE', mismatches: ['fingerprint'] };
  const expected = createCompileFingerprint({
    ...current,
    compiledAt: fingerprint.compiledAt,
  });
  const fields = ['sourceBundleHash', 'userIntentHash', 'deliverableHash', 'referencePlanHash', 'compiledPromptHash'];
  const mismatches = fields.filter((field) => expected[field] !== fingerprint[field]);
  return { valid: mismatches.length === 0, code: mismatches.length ? 'COMPILE_INPUT_STALE' : undefined, mismatches };
}
