const PROVIDER_ROLE = { identity_reference: 'current_project_identity', structure_reference: 'current_project_product', style_reference: 'reference_style' };

export function materializeReferencePlan(plan, assets, capabilities = {}) {
  const byId = new Map((assets ?? []).map((asset) => [asset.assetId, asset]));
  const eligible = (plan ?? []).filter((item) => PROVIDER_ROLE[item.role] && byId.has(item.assetId));
  const max = capabilities.supportsMultiImageReference === false ? 1 : capabilities.maxReferenceImages ?? eligible.length;
  const selected = eligible.slice(0, max).map((item) => {
    const asset = byId.get(item.assetId);
    return { assetId: item.assetId, role: PROVIDER_ROLE[item.role], localPath: asset.path, sha256: asset.sha256 ?? '', source: 'project_visual_context', includeReason: `Creative Director: ${item.role}` };
  });
  const dropped = eligible.slice(max);
  return { selected, dropped, warnings: dropped.length ? [{ code: 'REFERENCE_PLAN_AUTO_REDUCED', message: 'Reference plan reduced to provider limit.' }] : [] };
}
