import { resolveDeliverablePolicy } from './deliverable-policies.js';

const SPATIAL_PATTERN = /interior|store|space|shop|restaurant|room|floorplan|装修|店内|空间|门店|户型|灯光参考|材质参考/iu;
const VI_COLLECTION_PATTERN = /business.?card|menu|apron|t.?shirt|coaster|bag|mockup|flat.?lay|portfolio|grid|名片|菜单册|围裙|T\s*恤|杯垫|包装袋|样机|平铺|作品集|拼贴|物料合集/iu;
const IDENTITY_PATTERN = /logo|wordmark|brand.?identity|标志|字标|品牌身份/iu;
const STRUCTURE_PATTERN = /packag|product|bottle|box|structure|包装|产品|瓶型|盒型|结构/iu;

const PRIORITY = {
  identity_reference: 0,
  structure_reference: 1,
  spatial_reference: 2,
  style_reference: 3,
  analysis_only: 4,
  excluded: 5,
};

function assetText(reference) {
  return [
    reference.name,
    reference.localPath,
    reference.includeReason,
    ...(reference.exclusionNotes ?? []),
    reference.assetRole,
  ].filter(Boolean).join(' ');
}

export function classifyReferenceForDeliverable(reference, deliverable) {
  if (reference.generationRole) return reference.generationRole;
  const text = assetText(reference);
  if (reference.role === 'current_project_logo' || IDENTITY_PATTERN.test(text)) return 'identity_reference';
  if (SPATIAL_PATTERN.test(text)) return 'spatial_reference';
  if (deliverable === 'interior_scene' || deliverable === 'storefront_scene') {
    if (VI_COLLECTION_PATTERN.test(text)) return 'analysis_only';
    if (reference.role === 'current_project_product' || STRUCTURE_PATTERN.test(text)) return 'structure_reference';
    if (reference.role === 'reference_style') return 'style_reference';
    return 'analysis_only';
  }
  if (reference.role === 'current_project_product' || STRUCTURE_PATTERN.test(text)) return 'structure_reference';
  if (reference.role === 'reference_style') return 'style_reference';
  if (reference.role === 'current_project_identity') {
    return deliverable === 'vi_application' ? 'style_reference' : 'identity_reference';
  }
  return 'analysis_only';
}

export function buildDeliverableReferencePlan({
  deliverable,
  sourcePreset,
  purpose,
  references = [],
  capabilities = {},
}) {
  const policy = resolveDeliverablePolicy(deliverable, { sourcePreset, purpose });
  const classified = references.map((reference, sourceIndex) => ({
    assetId: reference.assetId,
    role: classifyReferenceForDeliverable(reference, deliverable),
    sourceIndex,
    reference,
  }));
  const limits = {
    identity_reference: policy.maxIdentityReferences,
    structure_reference: policy.maxStructureReferences,
    style_reference: policy.maxStyleReferences,
    spatial_reference: policy.maxSpatialReferences,
  };
  const counts = {};
  const candidates = [];
  const analysisOnly = [];
  const excluded = [];
  for (const item of classified) {
    if (item.role === 'excluded') {
      excluded.push(item);
      continue;
    }
    if (item.role === 'analysis_only' || !policy.allowedReferenceRoles.includes(item.role)) {
      analysisOnly.push({ ...item, role: 'analysis_only' });
      continue;
    }
    const count = counts[item.role] ?? 0;
    if (count >= (limits[item.role] ?? 0)) {
      analysisOnly.push({ ...item, role: 'analysis_only' });
      continue;
    }
    counts[item.role] = count + 1;
    candidates.push(item);
  }
  candidates.sort((a, b) => PRIORITY[a.role] - PRIORITY[b.role] || a.sourceIndex - b.sourceIndex);
  const providerLimit =
    capabilities.supportsMultiImageReference === false
      ? Math.min(Number(capabilities.maxReferenceImages ?? 1), 1)
      : Number(capabilities.maxReferenceImages ?? candidates.length);
  const selected = candidates.slice(0, providerLimit);
  const reduced = candidates.slice(providerLimit).map((item) => ({ ...item, role: 'analysis_only' }));
  analysisOnly.push(...reduced);
  const selectedRoles = new Set(selected.map((item) => item.role));
  const missingRequiredRoles = policy.requiredReferenceRoles.filter((role) => !selectedRoles.has(role));
  const warnings = [];
  if (reduced.length) warnings.push('REFERENCE_PLAN_AUTO_REDUCED');
  if ((deliverable === 'interior_scene' || deliverable === 'storefront_scene') && !selectedRoles.has('spatial_reference')) {
    warnings.push('NO_SPATIAL_REFERENCE');
  }
  if (analysisOnly.some((item) => VI_COLLECTION_PATTERN.test(assetText(item.reference)))) {
    warnings.push('VI_COLLECTIONS_MOVED_TO_ANALYSIS_ONLY');
  }
  return {
    schemaVersion: '1.0',
    deliverable,
    selected: selected.map(({ assetId, role, sourceIndex }) => ({ assetId, role, sourceIndex })),
    analysisOnly: analysisOnly.map(({ assetId, role, sourceIndex }) => ({ assetId, role, sourceIndex })),
    excluded: excluded.map(({ assetId, role, sourceIndex }) => ({ assetId, role, sourceIndex })),
    missingRequiredRoles,
    warnings,
  };
}

export function materializeDeliverableReferences(plan, references) {
  const byId = new Map(references.map((reference) => [reference.assetId, reference]));
  return plan.selected.map((item) => {
    const reference = byId.get(item.assetId);
    if (!reference) throw Object.assign(new Error(`Reference asset missing: ${item.assetId}`), { code: 'DELIVERABLE_REFERENCE_MISMATCH' });
    return {
      ...reference,
      role:
        item.role === 'identity_reference'
          ? reference.role === 'current_project_logo' ? 'current_project_logo' : 'current_project_identity'
          : item.role === 'structure_reference'
            ? 'current_project_product'
            : 'reference_style',
      includeReason: `${reference.includeReason || '交付类型参考'}；角色：${item.role}`,
      generationRole: item.role,
    };
  });
}
