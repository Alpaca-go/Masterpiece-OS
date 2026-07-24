import type {
  AssetAuthenticity,
  CurrentProjectAssetRole,
  GenerationOutputType,
  ReferenceAssetRole,
  StructureStatus,
  StyleCarrierCategory
} from '../../shared/types.ts';

export const REFERENCE_ASSET_ROLES = [
  'system_overview', 'brand_identity', 'packaging', 'packaging_detail', 'product',
  'poster', 'vi_application', 'material_detail', 'typography_detail', 'graphic_detail',
  'spatial', 'display_layout', 'interface', 'publication', 'photography_style', 'motion',
  'brand_strategy_text', 'pure_text_slide', 'duplicate', 'irrelevant', 'uncertain'
] as const satisfies readonly ReferenceAssetRole[];

export const CURRENT_PROJECT_ASSET_ROLES = [
  'brand_identity_evidence', 'logo_evidence', 'logo_typography_evidence',
  'service_fact_evidence', 'confirmed_structure_evidence', 'observed_copy',
  'legacy_visual_only', 'stock_mockup', 'third_party_mockup', 'reference_only',
  'brand_name_evidence', 'product_fact_evidence', 'packaging_structure_evidence',
  'product_structure_evidence', 'touchpoint_evidence', 'locked_asset_evidence',
  'brand_copy_evidence', 'spatial_structure_evidence', 'legacy_visual_style_only',
  'duplicate', 'irrelevant', 'uncertain'
] as const satisfies readonly CurrentProjectAssetRole[];

export const ASSET_AUTHENTICITIES = [
  'brand_original', 'user_confirmed_real', 'user_confirmed_locked', 'stock_mockup',
  'third_party_mockup', 'design_concept_only', 'reference_only', 'unknown'
] as const satisfies readonly AssetAuthenticity[];

export const GENERATION_USAGES = [
  'identity', 'product', 'product_or_service', 'structure_only', 'locked_asset', 'exclude'
] as const;

export const GENERATION_OUTPUT_TYPES = [
  'anchor_vi_system', 'packaging_single', 'packaging_series', 'brand_poster',
  'product_poster', 'vi_application', 'spatial_scene', 'digital_campaign'
] as const satisfies readonly GenerationOutputType[];

export const STYLE_CARRIER_CATEGORIES = [
  'color', 'layout', 'typography', 'graphic', 'material', 'photography', 'display', 'spatial'
] as const satisfies readonly StyleCarrierCategory[];

export const STYLE_CARRIER_PRIORITIES = ['primary', 'secondary', 'optional'] as const;
export const REFERENCE_MATCH_LEVELS = ['exact', 'compatible', 'inferred', 'insufficient'] as const;
export const FACT_STATUSES = ['confirmed', 'inferred', 'unverified'] as const;
export const FACT_CLASSIFICATIONS = [
  'identity', 'product_or_service', 'structure', 'copy', 'audience', 'touchpoint', 'other'
] as const;
export const STRUCTURE_DOMAINS = ['packaging', 'product', 'space', 'interface', 'publication', 'other'] as const;
export const STRUCTURE_STATUSES = [
  'locked', 'user_confirmed', 'real_structure_detected', 'open_for_redesign', 'not_applicable'
] as const satisfies readonly StructureStatus[];
export const GRAPHIC_ANCHOR_ROLES = ['primary', 'secondary'] as const;
export const GENERATION_READINESS_STATUSES = ['ready', 'needs_review', 'blocked'] as const;
export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;

export function isEnumValue<const T extends readonly string[]>(
  values: T,
  value: unknown
): value is T[number] {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}
