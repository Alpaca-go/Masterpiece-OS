function strings(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : [];
}

function push(target, content, subjectPath, options) {
  if (typeof content !== 'string' || !content.trim()) return;
  target.push({
    evidenceType: options.evidenceType,
    subjectPath,
    claimMode: options.claimMode || 'many',
    content,
    confidence: options.confidence,
    status: options.status,
    sources: options.sources
  });
}

function pushList(target, list, subjectPath, options) {
  for (const content of strings(list)) push(target, content, subjectPath, options);
}

function projectSource(context) {
  return [{ sourceType: 'system', sourceId: `project-context:${context.projectId}` }];
}

function assetSource(asset) {
  return [{ sourceType: 'image', sourceId: asset.assetId, label: asset.name, location: asset.relativePath }];
}

export function adaptVisualScheme(context) {
  if (!context || !['1.0', '2.0'].includes(context.schemaVersion) || !context.projectId) {
    throw new Error('Visual Scheme Adapter requires a ProjectVisualContext 1.0 or 2.0 object');
  }
  return context.schemaVersion === '2.0' ? adaptShortChain(context) : adaptLegacyVisualContext(context);
}

function adaptShortChain(context) {
  const candidates = [];
  const source = projectSource(context);
  const fact = { evidenceType: 'document_fact', confidence: 0.86, status: 'confirmed', sources: source };
  const observation = { evidenceType: 'visual_observation', confidence: 0.76, status: 'observed', sources: source };
  push(candidates, context.brandCore?.name, 'brandFacts.name', { ...fact, claimMode: 'one' });
  push(candidates, context.brandCore?.industry, 'brandFacts.industry', { ...fact, claimMode: 'one' });
  push(candidates, context.brandCore?.brandRole, 'brandFacts.role', { ...fact, claimMode: 'one' });
  pushList(candidates, context.brandCore?.audience, 'audienceFacts.audiences', fact);
  pushList(candidates, context.lockedAssets?.confirmedColors, 'constraints.confirmedColors', fact);
  pushList(candidates, context.lockedAssets?.packageStructures, 'constraints.packageStructures', fact);
  pushList(candidates, context.lockedAssets?.mustPreserve, 'constraints.mustPreserve', fact);
  for (const [key, value] of Object.entries(context.visualIdentity || {})) {
    pushList(candidates, value, `currentVisualPatterns.${key}`, observation);
  }
  pushList(candidates, context.styleBoundaries?.mustAvoid, 'constraints.mustAvoid', fact);
  pushList(candidates, context.styleBoundaries?.uncertainItems, 'openQuestions.visualUncertainties', {
    evidenceType: 'system_assumption', confidence: 0.35, status: 'unconfirmed', sources: source
  });
  for (const decision of Array.isArray(context.confirmedDecisions) ? context.confirmedDecisions : []) {
    const isUser = decision.source === 'user_confirmation';
    push(candidates, decision.value, `confirmedUserIntent.${decision.id}`, {
      evidenceType: isUser ? 'user_intent' : 'document_fact',
      claimMode: 'one',
      confidence: isUser ? 1 : 0.9,
      status: 'confirmed',
      sources: [{ sourceType: isUser ? 'user' : 'system', sourceId: decision.id }]
    });
  }
  for (const asset of Array.isArray(context.sourceAssetRefs) ? context.sourceAssetRefs : []) {
    push(candidates, `${asset.name} (${asset.role})`, `observedVisualAssets.${asset.role}`, {
      evidenceType: 'visual_observation', confidence: 0.95, status: 'observed', sources: assetSource(asset)
    });
  }
  return candidates;
}

function adaptLegacyVisualContext(context) {
  const candidates = [];
  const source = projectSource(context);
  const fact = { evidenceType: 'document_fact', confidence: 0.78, status: 'unconfirmed', sources: source };
  const observation = { evidenceType: 'visual_observation', confidence: 0.72, status: 'observed', sources: source };
  push(candidates, context.identity?.brandName, 'brandFacts.name', { ...fact, claimMode: 'one' });
  push(candidates, context.identity?.industry, 'brandFacts.industry', { ...fact, claimMode: 'one' });
  pushList(candidates, context.products?.coreProducts, 'productFacts.products', fact);
  pushList(candidates, context.products?.secondaryProducts, 'productFacts.secondaryProducts', fact);
  for (const [key, value] of Object.entries(context.currentVisualSystem || {})) {
    pushList(candidates, value, `currentVisualPatterns.${key}`, observation);
  }
  for (const [key, value] of Object.entries(context.businessTouchpoints || {})) {
    pushList(candidates, value, `businessGoals.touchpoints.${key}`, fact);
  }
  pushList(candidates, context.lockedAssets?.lockedFacts, 'constraints.lockedFacts', fact);
  pushList(candidates, context.evaluation?.visualProblems, 'constraints.visualProblems', observation);
  pushList(candidates, context.uncertainties, 'openQuestions.visualUncertainties', {
    evidenceType: 'system_assumption', confidence: 0.3, status: 'unconfirmed', sources: source
  });
  return candidates;
}
