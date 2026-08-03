const MVP_LOGO_MATERIALS = new Set([
  'front_lit_acrylic', 'halo_lit_metal', 'pvc_dimensional',
  'acrylic_dimensional', 'metal_dimensional',
]);

function primaryLocation(shot) {
  const value = String(shot || '').toLowerCase();
  if (value.includes('entrance')) {
    return { zone: 'entrance_brand_wall', normalizedBounds: { x: 0.34, y: 0.2, width: 0.32 } };
  }
  if (value.includes('front')) {
    return { zone: 'reception_back_wall', normalizedBounds: { x: 0.33, y: 0.19, width: 0.34 } };
  }
  return { zone: 'central_feature_wall', normalizedBounds: { x: 0.37, y: 0.2, width: 0.28 } };
}

function normalizeSelected(selectedAssets, selectedLogoAssetIds) {
  if (Array.isArray(selectedAssets)) {
    return [...new Map(selectedAssets
      .filter((item) => item?.assetId)
      .map((item) => [item.assetId, {
        assetId: item.assetId,
        type: item.type || 'other',
      }])).values()];
  }
  return [...new Set(selectedLogoAssetIds || [])].map((assetId) => ({ assetId, type: 'logo' }));
}

export function guardBrandAssetDensity(plan) {
  if (!plan) return null;
  const primary = plan.placements.filter((item) => item.importance === 1);
  if (primary.length !== 1) throw Object.assign(new Error('A spatial render must have exactly one primary brand asset.'), {
    code: 'LOCKED_ASSET_PRIMARY_COUNT_INVALID',
  });
  if (plan.placements.length > 2) throw Object.assign(new Error('A spatial render accepts at most two explicit brand assets.'), {
    code: 'LOCKED_ASSET_DENSITY_EXCEEDED',
  });
  if (plan.placements.filter((item) => item.assetType === 'logo').length > 1) {
    throw Object.assign(new Error('Multiple selected Logos are not supported in one spatial render.'), {
      code: 'LOCKED_ASSET_DUPLICATE_LOGO_PLAN',
    });
  }
  if (new Set(plan.placements.map((item) => item.zone)).size !== plan.placements.length) {
    throw Object.assign(new Error('Brand assets must not compete on the same architectural surface.'), {
      code: 'LOCKED_ASSET_SURFACE_DENSITY_EXCEEDED',
    });
  }
  return plan;
}

export function planLockedAssetPlacements({ taskContract, selectedAssets, selectedLogoAssetIds }) {
  const selected = normalizeSelected(selectedAssets, selectedLogoAssetIds);
  if (taskContract.deliverableFamily !== 'space'
    || taskContract.brandMarkRenderMode !== 'locked_asset_render'
    || selected.length === 0) return null;
  if (selected.length > 2) throw Object.assign(new Error('At most two locked visual assets can be planned.'), {
    code: 'LOCKED_ASSET_DENSITY_EXCEEDED',
  });
  const logoCount = selected.filter((item) => item.type === 'logo').length;
  if (logoCount > 1) throw Object.assign(new Error('Phase 4 supports Logo + IP or Logo + icon, not multiple Logos.'), {
    code: 'LOCKED_ASSET_DUPLICATE_LOGO_PLAN',
  });
  const primary = selected.find((item) => item.type === 'logo')
    || selected.find((item) => item.type === 'ip_character')
    || selected[0];
  const supporting = selected.find((item) => item.assetId !== primary.assetId);
  const requestedMaterial = taskContract.materialMode || 'auto';
  const logoMaterial = requestedMaterial === 'auto' ? 'front_lit_acrylic' : requestedMaterial;
  const location = primaryLocation(taskContract.shot);
  const limitations = [];
  if (primary.type === 'logo' && !MVP_LOGO_MATERIALS.has(logoMaterial)) {
    limitations.push(`logo_material_requires_strict_qa:${logoMaterial}`);
  }
  const placements = [{
    assetId: primary.assetId,
    assetType: primary.type,
    role: primary.type === 'logo' ? 'primary_signage' : 'hero_installation',
    zone: location.zone,
    material: primary.type === 'logo' ? logoMaterial : 'fiberglass_sculpture',
    importance: 1,
    targetSize: 'large',
    mustBeLegible: primary.type === 'logo',
    maxOccurrences: 1,
    normalizedBounds: location.normalizedBounds,
  }];
  if (supporting) {
    const isIp = supporting.type === 'ip_character';
    placements.push({
      assetId: supporting.assetId,
      assetType: supporting.type,
      role: isIp ? 'hero_installation' : supporting.type === 'icon' ? 'secondary_wayfinding' : 'supporting_graphic',
      zone: isIp ? 'right_supporting_zone' : 'left_supporting_wall',
      material: isIp ? 'fiberglass_sculpture' : supporting.type === 'icon' ? 'vinyl_graphics' : 'painted_mural',
      importance: 0.65,
      targetSize: isIp ? 'medium' : 'small',
      mustBeLegible: false,
      maxOccurrences: 1,
      normalizedBounds: isIp
        ? { x: 0.72, y: 0.42, width: 0.16 }
        : { x: 0.1, y: 0.38, width: 0.18 },
    });
  }
  return guardBrandAssetDensity({
    schemaVersion: '1.0',
    sceneId: `${taskContract.taskId}:locked-assets`,
    brandIntensity: taskContract.brandIntensity || 'balanced',
    mvpEligible: limitations.length === 0,
    limitations,
    placements,
    styleInheritance: { palette: true, shapeLanguage: true, patternRhythm: true, logoRepetition: false },
  });
}

export function planSingleLogoPlacement(input) {
  return planLockedAssetPlacements(input);
}

export function compileSingleLogoPlacementDirectives(plan) {
  if (!plan?.placements?.length) return [];
  const includesIp = plan.placements.some((placement) => placement.assetType === 'ip_character');
  const placementLines = plan.placements.map((placement, index) => (
    `Locked asset ${index + 1}: ${placement.assetId}; type ${placement.assetType}; role ${placement.role}; zone ${placement.zone}; target size ${placement.targetSize}; material ${placement.material}; maximum occurrences ${placement.maxOccurrences}.`
  ));
  return [
    `Locked Asset Placement Plan: use exactly ${plan.placements.length} selected asset(s) with one primary asset and no competing focal points.`,
    ...placementLines,
    'Use front-facing or lightly perspective architectural carriers. Keep each selected asset complete, camera-visible and on its assigned distinct surface.',
    ...(includesIp ? ['For an IP character, lock identity, head-to-body proportion range, facial feature positions, primary colors, signature clothing and accessories; pose, expression, view, 3D material and environmental light may adapt.'] : []),
    'Do not invent additional logos, pseudo text, duplicate signage, unrelated mascot variants, random typography, or logo-like marks outside planned placement zones.',
    'Preserve Logo outer contour, internal negative shapes, every letterform, symbol-to-wordmark arrangement and original proportions. Only perspective, physical scale, material, thickness, mounting, light, shadow, glow and environmental reflection may change.',
  ];
}
