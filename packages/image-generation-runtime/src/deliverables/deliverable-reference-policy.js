import { getDeliverablePolicy } from './deliverable-policies.js';
const spatial = /interior|store|space|shop|restaurant|room|装修|店内|空间|门店/i;
const vi = /card|menu|apron|shirt|coaster|bag|mockup|名片|菜单|围裙|t恤|杯垫|包装袋|拼贴/i;
export function planDeliverableReferences({ deliverable, assets = [], capabilities = {} }) {
  const policy = getDeliverablePolicy(deliverable); const plan = assets.map((asset, index) => {
    const text = `${asset.name ?? ''} ${asset.assetRole ?? ''}`;
    let role = asset.role || (/logo|identity|品牌/i.test(text) ? 'identity_reference' : /package|包装|盒型/i.test(text) ? 'structure_reference' : spatial.test(text) ? 'spatial_reference' : 'style_reference');
    if (deliverable === 'interior_scene' && vi.test(text)) role = 'analysis_only';
    return { assetId: asset.assetId, role, index };
  });
  const limits = { identity_reference: policy.maxIdentityReferences, structure_reference: policy.maxStructureReferences, style_reference: policy.maxStyleReferences, spatial_reference: deliverable === 'interior_scene' ? 3 : 1 };
  const count = {}; const selected = []; const analysisOnly = [];
  for (const item of plan) { if (item.role === 'analysis_only' || item.role === 'excluded') { analysisOnly.push(item); continue; } if (!policy.allowedReferenceRoles.includes(item.role) || (count[item.role] ?? 0) >= (limits[item.role] ?? 0)) { analysisOnly.push({ ...item, role: 'analysis_only' }); continue; } count[item.role] = (count[item.role] ?? 0) + 1; selected.push(item); }
  const max = capabilities.supportsMultiImageReference === false ? 1 : capabilities.maxReferenceImages ?? selected.length;
  const kept = selected.slice(0, max); const dropped = selected.slice(max).map(item => ({ ...item, role: 'analysis_only' }));
  return { selected: kept, analysisOnly: [...analysisOnly, ...dropped], warnings: dropped.length ? ['REFERENCE_PLAN_AUTO_REDUCED'] : [] };
}
