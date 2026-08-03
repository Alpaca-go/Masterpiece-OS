function values(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : [];
}

function locationOf(item) {
  return [item.section, Number.isInteger(item.page) ? `p.${item.page}` : ''].filter(Boolean).join(' · ');
}

function sourcesFor(context, field) {
  const matched = (Array.isArray(context?.evidence) ? context.evidence : [])
    .filter((item) => item && typeof item === 'object' && item.field === field)
    .map((item) => ({
      sourceType: 'document',
      sourceId: item.documentId || context.sourceRunId,
      label: item.filename,
      location: locationOf(item)
    }));
  if (matched.length) return matched;
  return [{ sourceType: 'document', sourceId: context.sourceRunId }];
}

function addScalar(target, context, field, subjectPath, content, options = {}) {
  if (typeof content !== 'string' || !content.trim()) return;
  target.push({
    evidenceType: options.evidenceType || 'document_fact',
    subjectPath,
    claimMode: options.claimMode || 'one',
    content,
    confidence: options.confidence ?? 0.82,
    status: options.status,
    sources: sourcesFor(context, field)
  });
}

function addList(target, context, field, subjectPath, list, options = {}) {
  for (const content of values(list)) {
    addScalar(target, context, field, subjectPath, content, { ...options, claimMode: 'many' });
  }
}

export function adaptDocumentContext(context, { confirmed = false } = {}) {
  if (!context || context.schemaVersion !== '1.0' || !context.sourceRunId) {
    throw new Error('Document Adapter requires a DocumentVisualContext 1.0 object');
  }
  const candidates = [];
  const status = confirmed ? 'confirmed' : 'unconfirmed';
  addScalar(candidates, context, 'brandName', 'brandFacts.name', context.brandName, { status });
  addScalar(candidates, context, 'industry', 'brandFacts.industry', context.industry, { status });
  addList(candidates, context, 'products', 'productFacts.products', context.products, { status });
  addList(candidates, context, 'services', 'productFacts.services', context.services, { status });
  addList(candidates, context, 'targetAudience', 'audienceFacts.audiences', context.targetAudience, { status });
  addScalar(candidates, context, 'pricePositioning', 'productFacts.pricePositioning', context.pricePositioning, { status });
  addScalar(candidates, context, 'businessModel', 'businessGoals.businessModel', context.businessModel, { status });
  addList(candidates, context, 'brandPersonality', 'brandFacts.personality', context.brandPersonality, { status });
  addList(candidates, context, 'visualPreferences', 'brandFacts.visualPreferences', context.visualPreferences, { status });
  addList(candidates, context, 'requiredTouchpoints', 'businessGoals.requiredTouchpoints', context.requiredTouchpoints, { status });
  addList(candidates, context, 'lockedFacts', 'constraints.lockedFacts', context.lockedFacts, { status });
  addList(candidates, context, 'prohibitedDirections', 'constraints.prohibitedDirections', context.prohibitedDirections, { status });
  addList(candidates, context, 'unknownFields', 'openQuestions.documentUnknowns', context.unknownFields, {
    evidenceType: 'system_assumption',
    status: 'unconfirmed',
    confidence: 0.35
  });
  return candidates;
}
