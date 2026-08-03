const MVP_MATERIALS = new Set([
  'front_lit_acrylic',
  'halo_lit_metal',
  'pvc_dimensional',
  'acrylic_dimensional',
  'metal_dimensional',
]);

function placementForShot(shot) {
  const value = String(shot || '').toLowerCase();
  if (value.includes('entrance')) {
    return { zone: 'entrance_brand_wall', normalizedBounds: { x: 0.34, y: 0.2, width: 0.32 } };
  }
  if (value.includes('front')) {
    return { zone: 'reception_back_wall', normalizedBounds: { x: 0.33, y: 0.19, width: 0.34 } };
  }
  return { zone: 'central_feature_wall', normalizedBounds: { x: 0.37, y: 0.2, width: 0.28 } };
}

export function planSingleLogoPlacement({ taskContract, selectedLogoAssetIds }) {
  const selected = [...new Set(selectedLogoAssetIds || [])];
  if (selected.length > 1) {
    throw Object.assign(new Error('Phase 2 locked-asset rendering accepts exactly one selected primary Logo.'), {
      code: 'LOCKED_ASSET_MVP_SINGLE_LOGO_REQUIRED',
    });
  }
  if (
    taskContract.deliverableFamily !== 'space'
    || taskContract.brandMarkRenderMode !== 'locked_asset_render'
    || selected.length !== 1
  ) return null;

  const requestedMaterial = taskContract.materialMode || 'auto';
  const material = requestedMaterial === 'auto' ? 'front_lit_acrylic' : requestedMaterial;
  const limitations = [];
  if (!MVP_MATERIALS.has(material)) limitations.push(`material_not_in_phase_2_mvp:${material}`);
  const { zone, normalizedBounds } = placementForShot(taskContract.shot);
  return {
    schemaVersion: '1.0',
    sceneId: `${taskContract.taskId}:primary-logo`,
    brandIntensity: taskContract.brandIntensity || 'balanced',
    mvpEligible: limitations.length === 0,
    limitations,
    placements: [{
      assetId: selected[0],
      role: 'primary_signage',
      zone,
      material,
      importance: 1,
      targetSize: 'large',
      mustBeLegible: true,
      maxOccurrences: 1,
      normalizedBounds,
    }],
    styleInheritance: {
      palette: true,
      shapeLanguage: true,
      patternRhythm: true,
      logoRepetition: false,
    },
  };
}

export function compileSingleLogoPlacementDirectives(plan) {
  if (!plan?.placements?.length) return [];
  const placement = plan.placements[0];
  return [
    `Locked Logo placement plan: render exactly one primary Logo at ${placement.zone}; target size ${placement.targetSize}; material ${placement.material}.`,
    'Use a front-facing or lightly perspective planar architectural carrier with the complete Logo clearly visible and unobstructed.',
    'Do not invent additional logos, brand names, pseudo text, duplicate signage, altered wordmarks, random typography, or logo-like decorative marks outside the planned placement zone.',
    'Preserve the exact outer contour, internal negative shapes, every letterform, symbol-to-wordmark arrangement and original proportions. Only perspective, physical scale, material, thickness, mounting, light, shadow, glow and environmental reflection may change.',
  ];
}
