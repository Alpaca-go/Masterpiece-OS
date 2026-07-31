import { DELIVERABLE_POLICIES } from './deliverable-policies.js';

const VALID_ROLES = new Set([
  'identity_reference',
  'structure_reference',
  'style_reference',
  'spatial_reference',
  'analysis_only',
  'excluded',
]);

export function validateDeliverablePolicy(policy) {
  const issues = [];
  if (!policy?.deliverable || !DELIVERABLE_POLICIES[policy.deliverable]) issues.push('DELIVERABLE_UNSUPPORTED');
  if (!String(policy?.displayName ?? '').trim()) issues.push('DELIVERABLE_DISPLAY_NAME_MISSING');
  if (!Array.isArray(policy?.requiredPromptConcepts) || policy.requiredPromptConcepts.length === 0) issues.push('DELIVERABLE_REQUIRED_CONCEPTS_EMPTY');
  if (!Array.isArray(policy?.forbiddenPromptConcepts)) issues.push('DELIVERABLE_FORBIDDEN_CONCEPTS_INVALID');
  for (const role of [...(policy?.requiredReferenceRoles ?? []), ...(policy?.allowedReferenceRoles ?? [])]) {
    if (!VALID_ROLES.has(role)) issues.push(`DELIVERABLE_REFERENCE_ROLE_INVALID:${role}`);
  }
  for (const field of ['maxIdentityReferences', 'maxStructureReferences', 'maxStyleReferences', 'maxSpatialReferences']) {
    if (!Number.isInteger(policy?.[field]) || policy[field] < 0) issues.push(`DELIVERABLE_LIMIT_INVALID:${field}`);
  }
  if (policy?.deliverable === 'interior_scene') {
    if (!policy.requiresSpatialDepth || !policy.requiresPhysicalStructure) issues.push('INTERIOR_SCENE_SPATIAL_POLICY_INVALID');
    if (policy.allowsFlatLay || policy.allowsMockupCollection) issues.push('INTERIOR_SCENE_FLATLAY_POLICY_INVALID');
  }
  return { valid: issues.length === 0, issues };
}

export function validateAllDeliverablePolicies() {
  return Object.fromEntries(
    Object.entries(DELIVERABLE_POLICIES).map(([key, value]) => [key, validateDeliverablePolicy(value)]),
  );
}
