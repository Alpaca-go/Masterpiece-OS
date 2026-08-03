import crypto from 'node:crypto';
import { validatePackagingShotSelection } from '../task-families/packaging/shot-library.js';

const FAMILIES = new Set(['space', 'packaging', 'vi', 'poster']);
const RATIOS = new Set(['1:1', '4:3', '3:4', '16:9', '9:16']);
const LOGO_USAGE_MODES = new Set(['reference', 'blank_area', 'post_composite']);
const BRAND_MARK_RENDER_MODES = new Set([
  'locked_asset_render',
  'no_logo_preview',
  'creative_logo_interpretation',
]);
const MATERIAL_MODES = new Set([
  'auto',
  'front_lit_acrylic',
  'halo_lit_metal',
  'acrylic_dimensional',
  'pvc_dimensional',
  'metal_dimensional',
  'neon',
  'wall_engraving',
  'lightbox',
  'screen_print',
  'frosted_glass',
  'flat_print',
]);
const BRAND_INTENSITIES = new Set(['subtle', 'balanced', 'expressive']);

function cleanList(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))];
}

export function createShortChainTaskContract(input, options = {}) {
  const family = String(input?.deliverableFamily ?? '').trim();
  const subtype = String(input?.subtype ?? '').trim();
  const scene = String(input?.scene ?? '').trim();
  const shot = String(input?.shot ?? '').trim();
  const currentInstruction = String(input?.currentInstruction ?? '').trim();
  const count = Number(input?.count ?? 1);
  const aspectRatio = String(input?.aspectRatio ?? '16:9');
  const legacyLogoUsageMode = String(input?.logoUsageMode ?? '');
  const brandMarkRenderMode = String(input?.brandMarkRenderMode
    ?? (legacyLogoUsageMode === 'blank_area'
      ? 'no_logo_preview'
      : legacyLogoUsageMode === 'reference' || legacyLogoUsageMode === 'post_composite'
        ? 'locked_asset_render'
        : 'locked_asset_render'));
  const materialMode = String(input?.materialMode ?? 'auto');
  const brandIntensity = String(input?.brandIntensity ?? 'balanced');
  const referenceAssetIds = cleanList(input.referenceAssetIds);
  const logoUsageMode = legacyLogoUsageMode || (brandMarkRenderMode === 'no_logo_preview'
    ? 'blank_area'
    : referenceAssetIds.length ? 'reference' : 'blank_area');
  if (!input?.projectId) throw new Error('projectId is required');
  if (!FAMILIES.has(family)) throw new Error(`Unsupported deliverable family: ${family || '(empty)'}`);
  if (!subtype) throw new Error('subtype is required');
  if (!shot) throw new Error('shot is required');
  if (!currentInstruction) throw new Error('currentInstruction is required');
  if (count !== 1 && count !== 2) throw new Error('count must be 1 or 2');
  if (!RATIOS.has(aspectRatio)) throw new Error(`Unsupported aspect ratio: ${aspectRatio}`);
  if (!LOGO_USAGE_MODES.has(logoUsageMode)) {
    throw new Error(`Unsupported logo usage mode: ${logoUsageMode}`);
  }
  if (!BRAND_MARK_RENDER_MODES.has(brandMarkRenderMode)) {
    throw new Error(`Unsupported brand mark render mode: ${brandMarkRenderMode}`);
  }
  if (!MATERIAL_MODES.has(materialMode)) {
    throw new Error(`Unsupported locked asset material mode: ${materialMode}`);
  }
  if (!BRAND_INTENSITIES.has(brandIntensity)) {
    throw new Error(`Unsupported brand intensity: ${brandIntensity}`);
  }
  if (family === 'vi' && subtype === 'unspecified') {
    throw new Error('VI generation requires a concrete material subtype');
  }
  if (family === 'packaging' && String(shot).startsWith('PKG-')) {
    const shotValidation = validatePackagingShotSelection({
      shotId: shot,
      subtype,
      productCount: input.packagingProductCount,
      openingState: input.packagingOpeningState,
    });
    if (!shotValidation.valid) {
      throw Object.assign(new Error(shotValidation.errors.join(', ')), {
        code: shotValidation.errors[0],
        issues: shotValidation.errors,
      });
    }
  }
  return {
    schemaVersion: '1.0',
    taskId: input.taskId || `short-chain-task-${crypto.randomUUID()}`,
    projectId: input.projectId,
    deliverableFamily: family,
    subtype,
    ...(scene ? { scene } : {}),
    shot,
    count,
    aspectRatio,
    currentInstruction,
    mustInclude: cleanList(input.mustInclude),
    mustAvoid: cleanList(input.mustAvoid),
    referenceAssetIds,
    brandMarkRenderMode,
    materialMode,
    brandIntensity,
    logoUsageMode,
    ...(family === 'packaging' && Number.isInteger(input.packagingProductCount)
      ? { packagingProductCount: input.packagingProductCount } : {}),
    ...(family === 'packaging' && ['open', 'closed', 'partially_open'].includes(input.packagingOpeningState)
      ? { packagingOpeningState: input.packagingOpeningState } : {}),
    createdAt: options.now || new Date().toISOString(),
  };
}

export function validateShortChainTaskContract(task) {
  try {
    createShortChainTaskContract(task, { now: task?.createdAt });
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
}
