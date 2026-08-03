const TYPE_TO_ROLE = Object.freeze({
  brand_name: 'package_surface_identity',
  logo: 'package_surface_identity',
  packaging_artwork: 'package_surface_graphic',
  core_symbol: 'package_surface_graphic',
  color: 'package_surface_graphic',
  packaging_front: 'package_surface_graphic',
  icon: 'package_surface_graphic',
  pattern: 'package_surface_graphic',
  illustration: 'package_surface_graphic',
  ip_character: 'package_surface_graphic',
  other: 'package_surface_graphic',
  packaging_structure: 'package_structure',
  product_category: 'product_identity',
  product_color: 'product_identity',
  product_arrangement: 'product_arrangement',
  required_visual_element: 'package_surface_graphic',
  forbidden_reference_content: 'exclusion',
});

function cleanList(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))];
}

export function bindPackagingLockedAssets(assets = []) {
  const bindings = [];
  const errors = [];
  const seen = new Set();
  for (const asset of Array.isArray(assets) ? assets : []) {
    const assetId = String(asset?.id ?? asset?.assetId ?? '').trim();
    const type = String(asset?.type ?? '').trim();
    const role = TYPE_TO_ROLE[type];
    if (!assetId || !role) {
      errors.push({ assetId: assetId || '(missing)', code: 'PACKAGING_LOCKED_ASSET_UNSUPPORTED' });
      continue;
    }
    if (seen.has(assetId)) continue;
    seen.add(assetId);
    const evidenceRefs = cleanList(asset?.evidenceRefs);
    const sourceAssetId = String(asset?.sourceAssetId ?? '').trim();
    if (sourceAssetId) evidenceRefs.push(sourceAssetId);
    bindings.push({
      assetId,
      type,
      role,
      lockLevel: ['logo', 'brand_name', 'packaging_structure'].includes(type) ? 'hard' : 'structural',
      evidenceRefs: [...new Set(evidenceRefs)],
      mayAffectScene: false,
    });
  }
  return { schemaVersion: '1.0', bindings, errors };
}

export function validatePackagingLockedAssetBindings(result) {
  const errors = [...(result?.errors ?? [])];
  for (const binding of result?.bindings ?? []) {
    if (binding.mayAffectScene !== false) {
      errors.push({ assetId: binding.assetId, code: 'PACKAGING_ASSET_OWNERSHIP_LEAK' });
    }
    if (binding.lockLevel === 'hard' && !binding.evidenceRefs.length) {
      errors.push({ assetId: binding.assetId, code: 'PACKAGING_LOCKED_ASSET_EVIDENCE_MISSING' });
    }
  }
  return { valid: errors.length === 0, errors };
}
