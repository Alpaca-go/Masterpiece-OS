export const PACKAGING_SHOT_LIBRARY_VERSION = '0.1.0';

export const PACKAGING_SHOT_IDS = Object.freeze([
  'PKG-HERO-SINGLE',
  'PKG-SERIES-GROUP',
  'PKG-GIFT-OPEN',
]);

const SHOTS = Object.freeze({
  'PKG-HERO-SINGLE': Object.freeze({
    id: 'PKG-HERO-SINGLE',
    purpose: 'single_packaging_hero',
    compatibleSubtypes: ['lid_and_base_box', 'drawer_box', 'paper_bag', 'small_carton', 'gift_set', 'single_product_display'],
    defaultAspectRatio: '4:3',
    minimumProducts: 1,
    maximumProducts: 1,
    requiresOpeningState: false,
    evaluationCriteria: ['logo_fidelity', 'structure', 'material', 'craft', 'asset_ownership', 'commercial_photography'],
  }),
  'PKG-SERIES-GROUP': Object.freeze({
    id: 'PKG-SERIES-GROUP',
    purpose: 'packaging_series_group',
    compatibleSubtypes: ['lid_and_base_box', 'drawer_box', 'paper_bag', 'small_carton', 'gift_set', 'single_product_display'],
    defaultAspectRatio: '4:3',
    minimumProducts: 2,
    maximumProducts: 8,
    requiresOpeningState: false,
    evaluationCriteria: [
      'logo_fidelity', 'structure', 'material', 'craft', 'asset_ownership',
      'product_hierarchy', 'group_relationship', 'series_consistency',
    ],
  }),
  'PKG-GIFT-OPEN': Object.freeze({
    id: 'PKG-GIFT-OPEN',
    purpose: 'open_gift_packaging',
    compatibleSubtypes: ['lid_and_base_box', 'drawer_box', 'gift_set'],
    defaultAspectRatio: '4:3',
    minimumProducts: 1,
    maximumProducts: 12,
    requiresOpeningState: true,
    evaluationCriteria: [
      'logo_fidelity', 'structure', 'material', 'craft', 'asset_ownership',
      'box_structure', 'insert_structure', 'product_arrangement', 'structural_realism',
    ],
  }),
});

export function getPackagingShotDefinition(id) {
  const shot = SHOTS[id];
  return shot ? structuredClone(shot) : null;
}

export function listPackagingShotDefinitions() {
  return PACKAGING_SHOT_IDS.map((id) => getPackagingShotDefinition(id));
}

export function validatePackagingShotSelection(input) {
  const shot = getPackagingShotDefinition(input?.shotId);
  const errors = [];
  if (!shot) return { valid: false, errors: ['PACKAGING_SHOT_UNSUPPORTED'] };
  if (!shot.compatibleSubtypes.includes(input?.subtype)) errors.push('PACKAGING_SHOT_SUBTYPE_MISMATCH');
  const productCount = Number(input?.productCount);
  if (Number.isFinite(productCount)
    && (productCount < shot.minimumProducts || productCount > shot.maximumProducts)) {
    errors.push('PACKAGING_SHOT_PRODUCT_COUNT_INVALID');
  }
  if (shot.requiresOpeningState && input?.openingState === 'closed') {
    errors.push('PACKAGING_SHOT_OPENING_STATE_REQUIRED');
  }
  return { valid: errors.length === 0, errors };
}
