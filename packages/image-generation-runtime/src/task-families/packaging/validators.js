import { validatePackagingShotSelection } from './shot-library.js';
import { validatePackagingLockedAssetBindings } from './locked-assets.js';

const MATERIAL_CATEGORIES = Object.freeze([
  ['paper', /纸|纸板|卡纸|灰板|paper|board|carton/iu],
  ['glass', /玻璃|glass/iu],
  ['metal', /金属|铝|铁|钢|metal|aluminium|aluminum|steel/iu],
  ['stone', /石材|石纹|stone|marble/iu],
  ['polymer', /塑料|亚克力|树脂|plastic|acrylic|resin|polymer/iu],
  ['wood', /木|竹|wood|bamboo/iu],
  ['fabric', /布|织物|皮革|fabric|textile|leather/iu],
  ['ceramic', /陶瓷|ceramic/iu],
]);

const CRAFT_CATEGORIES = Object.freeze([
  ['foil', /烫金|烫银|foil/iu],
  ['uv', /局部\s*uv|spot\s*uv|\buv\b/iu],
  ['deboss', /压凹|deboss/iu],
  ['emboss', /击凸|压凸|emboss/iu],
  ['print', /印刷|丝印|凹印|胶印|print|screen/iu],
  ['coating', /覆膜|涂层|上光|laminat|coating|varnish/iu],
  ['texture', /压纹|纹理|texture/iu],
]);

function classify(value, categories) {
  return categories.find(([, pattern]) => pattern.test(String(value ?? '')))?.[0] ?? 'other_confirmed';
}

export function validatePackagingMaterials(analysis) {
  const errors = [];
  const items = (analysis?.material ?? []).map((value) => ({ value, category: classify(value, MATERIAL_CATEGORIES) }));
  if (!items.length) errors.push('PACKAGING_MATERIAL_MISSING');
  if (items.some((item) => /空间|墙面|地面|天花|architectural/iu.test(item.value))) {
    errors.push('PACKAGING_MATERIAL_OWNERSHIP_INVALID');
  }
  return { valid: errors.length === 0, items, errors };
}

export function validatePackagingCrafts(analysis) {
  const errors = [];
  const items = (analysis?.craft ?? []).map((item) => ({
    ...item,
    category: classify(item?.craft, CRAFT_CATEGORIES),
  }));
  if (!items.length) errors.push('PACKAGING_CRAFT_MISSING');
  if (items.some((item) => !String(item?.purpose ?? '').trim())) errors.push('PACKAGING_CRAFT_PURPOSE_MISSING');
  return { valid: errors.length === 0, items, errors };
}

export function validatePackagingAssetOwnership(bindings) {
  const result = validatePackagingLockedAssetBindings(bindings);
  const errors = result.errors.map((item) => item.code);
  return { valid: errors.length === 0, errors };
}

export function validatePackagingStructure(analysis, taskContract = {}) {
  const errors = [];
  if (!(analysis?.packageStructure ?? []).length) errors.push('PACKAGING_STRUCTURE_EVIDENCE_MISSING');
  if (!(analysis?.packageStructure ?? []).some((item) => item.evidenceRefs?.length)) {
    errors.push('PACKAGING_STRUCTURE_EVIDENCE_MISSING');
  }
  if (String(taskContract.shot ?? '').startsWith('PKG-')) {
    const shot = validatePackagingShotSelection({
      shotId: taskContract.shot,
      subtype: taskContract.subtype,
      productCount: taskContract.packagingProductCount,
      openingState: taskContract.packagingOpeningState,
    });
    errors.push(...shot.errors);
  }
  if (taskContract.shot === 'PKG-GIFT-OPEN' && !(analysis?.openingExperience ?? []).length) {
    errors.push('PACKAGING_OPENING_EXPERIENCE_MISSING');
  }
  if (!(analysis?.productArrangement ?? []).length) errors.push('PACKAGING_PRODUCT_ARRANGEMENT_MISSING');
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

export function validatePackagingAnalysisForShot(input) {
  const material = validatePackagingMaterials(input.analysis);
  const craft = validatePackagingCrafts(input.analysis);
  const ownership = validatePackagingAssetOwnership(input.lockedAssetBindings
    ?? { bindings: [], errors: [] });
  const structure = validatePackagingStructure(input.analysis, input.taskContract);
  const errors = [...new Set([
    ...material.errors,
    ...craft.errors,
    ...ownership.errors,
    ...structure.errors,
  ])];
  return { valid: errors.length === 0, errors, material, craft, ownership, structure };
}
