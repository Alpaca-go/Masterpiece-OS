import { CreativeIntelligenceValidationError } from './contracts.js';

const MERGEABLE_FIELDS = new Set([
  'strategicProposition', 'coreMetaphor', 'languageNail', 'visualHammer', 'visualGenerationMechanism',
  'compositionLogic', 'colorLogic', 'typographyLogic', 'imageMaterialLogic', 'perceptionOutcome', 'crossTouchpointLogic'
]);

function strings(value) {
  return [...new Set((Array.isArray(value) ? value : []).map((item) => String(item || '').trim()).filter(Boolean))];
}

function normalizeMerged(value, directionIds) {
  return (Array.isArray(value) ? value : []).map((item) => {
    const fromDirectionId = String(item?.fromDirectionId || '').trim();
    const elementType = String(item?.elementType || '').trim();
    const content = String(item?.content || '').trim();
    if (!directionIds.has(fromDirectionId) || !MERGEABLE_FIELDS.has(elementType) || !content) {
      throw new CreativeIntelligenceValidationError('USER_DIRECTION_MERGE_INVALID', 'Merged direction elements must cite a valid direction, field, and content');
    }
    return { fromDirectionId, elementType, content };
  });
}

export function createUserDirectionDecision(directionSet, input = {}) {
  const directionIds = new Set(directionSet.directions.map((item) => item.id));
  const selectedDirectionId = String(input.selectedDirectionId || '').trim();
  if (selectedDirectionId && !directionIds.has(selectedDirectionId)) {
    throw new CreativeIntelligenceValidationError('USER_DIRECTION_SELECTION_INVALID', `Unknown selected direction: ${selectedDirectionId}`);
  }
  const acceptedElements = strings(input.acceptedElements);
  const rejectedElements = strings(input.rejectedElements);
  const rejected = new Set(rejectedElements.map((item) => item.toLocaleLowerCase('en-US')));
  if (acceptedElements.some((item) => rejected.has(item.toLocaleLowerCase('en-US')))) {
    throw new CreativeIntelligenceValidationError('USER_DIRECTION_ELEMENT_CONFLICT', 'The same element cannot be both accepted and rejected');
  }
  return {
    schemaVersion: '1.0', projectId: directionSet.projectId,
    selectedDirectionId: selectedDirectionId || null,
    acceptedElements,
    rejectedElements,
    mergedElements: normalizeMerged(input.mergedElements, directionIds),
    userRationale: String(input.userRationale || '').trim(),
    status: 'draft', confirmedAt: null
  };
}

export function confirmUserDirectionDecision(directionSet, draft, confirmedAt = new Date().toISOString()) {
  const directionIds = new Set(directionSet.directions.map((item) => item.id));
  if (draft?.projectId !== directionSet.projectId || !directionIds.has(draft?.selectedDirectionId)) {
    throw new CreativeIntelligenceValidationError('USER_DIRECTION_SELECTION_REQUIRED', 'A valid selected direction is required before confirmation');
  }
  if (!String(draft.userRationale || '').trim()) {
    throw new CreativeIntelligenceValidationError('USER_DIRECTION_RATIONALE_REQUIRED', 'User rationale is required before confirmation');
  }
  return { ...draft, status: 'confirmed', confirmedAt };
}
