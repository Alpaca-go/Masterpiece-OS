const GAP_CLASSES = Object.freeze(['aligned', 'underExpressed', 'overExpressed', 'misaligned', 'missing']);

function tokens(value) {
  return new Set(String(value || '').toLocaleLowerCase('en-US').match(/[\p{L}\p{N}]{2,}/gu) || []);
}

function overlap(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / Math.min(a.size, b.size);
}

function item(classification, intent, visual, rationale, source = 'deterministic') {
  return {
    classification,
    intent: intent?.content || null,
    currentExpression: visual?.content || null,
    rationale,
    evidenceRefs: [...new Set([...(intent?.evidenceRefs || []), ...(visual?.evidenceRefs || [])])],
    source
  };
}

export function analyzeIntentVisualGap(truthModel, { judgments = [] } = {}) {
  const intentClaims = [
    ...(truthModel.confirmedUserIntent || []),
    ...(truthModel.brandFacts || []).filter((claim) => /\.(personality|visualPreferences)(\.|$)/.test(claim.subjectPath))
  ];
  const visualClaims = truthModel.currentVisualPatterns || [];
  const result = Object.fromEntries(GAP_CLASSES.map((key) => [key, []]));
  const usedIntentRefs = new Set();
  for (const judgment of judgments) {
    if (!GAP_CLASSES.includes(judgment.classification) || !String(judgment.rationale || '').trim()) {
      throw new Error('Gap judgment requires a supported classification and rationale');
    }
    const evidenceRefs = [...new Set(judgment.evidenceRefs || [])];
    result[judgment.classification].push({
      classification: judgment.classification,
      intent: judgment.intent || null,
      currentExpression: judgment.currentExpression || null,
      rationale: judgment.rationale,
      evidenceRefs,
      source: 'explicit_judgment'
    });
    evidenceRefs.forEach((ref) => usedIntentRefs.add(ref));
  }
  for (const intent of intentClaims) {
    if (intent.evidenceRefs.some((ref) => usedIntentRefs.has(ref))) continue;
    if (!visualClaims.length) {
      result.missing.push(item('missing', intent, null, 'No current visual-system evidence is available for this intent.'));
      continue;
    }
    const ranked = visualClaims
      .map((visual) => ({ visual, score: overlap(intent.content, visual.content) }))
      .sort((left, right) => right.score - left.score);
    if (ranked[0]?.score >= 0.6) {
      result.aligned.push(item('aligned', intent, ranked[0].visual, 'Intent and current expression share a direct semantic signal.'));
    } else {
      result.underExpressed.push(item('underExpressed', intent, ranked[0]?.score ? ranked[0].visual : null, 'Current visual evidence does not substantiate this stated intent.'));
    }
  }
  for (const conflict of truthModel.conflicts || []) {
    result.misaligned.push(item('misaligned', conflict, null, 'The source record contains an unresolved intent or identity conflict.'));
  }
  return {
    schemaVersion: '1.0',
    projectId: truthModel.projectId,
    ...result,
    requiresHumanReview: result.misaligned.length > 0 || judgments.length === 0 && result.underExpressed.length > 0
  };
}
