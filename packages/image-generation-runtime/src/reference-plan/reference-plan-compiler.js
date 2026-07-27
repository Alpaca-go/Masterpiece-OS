const ROLES = ['identity_reference', 'structure_reference', 'style_reference', 'analysis_only', 'excluded'];
const priority = { identity_reference: 0, structure_reference: 1, style_reference: 2, analysis_only: 3, excluded: 4 };

export function compileReferencePlan({ mode, assets = [], brief }) {
  const requested = brief?.imageReferencePlan ?? {};
  const byId = new Map(assets.map((asset) => [asset.assetId, asset]));
  const roleById = new Map();
  for (const role of ROLES) for (const assetId of requested[role] ?? []) if (byId.has(assetId)) roleById.set(assetId, role);
  for (const asset of assets) {
    if (roleById.has(asset.assetId)) continue;
    const label = `${asset.assetRole ?? ''} ${asset.name ?? ''}`.toLowerCase();
    const role = /logo|identity|brand/.test(label) ? 'identity_reference'
      : /structure|packaging|package|product/.test(label) ? 'structure_reference'
      : mode === 'extend' ? 'style_reference' : mode === 'rebuild' ? 'analysis_only' : 'analysis_only';
    roleById.set(asset.assetId, role);
  }
  return assets.map((asset, index) => ({ assetId: asset.assetId, role: roleById.get(asset.assetId), sourceIndex: index }))
    .sort((a, b) => priority[a.role] - priority[b.role] || a.sourceIndex - b.sourceIndex);
}
