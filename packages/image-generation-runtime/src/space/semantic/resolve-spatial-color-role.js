const NEUTRAL = /white|cream|beige|gray|grey|black|warm\s+white|off[- ]white|白|米白|灰|黑|中性/iu;
const IDENTITY = /brand|identity|primary|signature|品牌|识别|主色/iu;
const POST_COMPOSITE = /logo|wordmark|signage|标志|标识|字标/iu;

export const SPATIAL_COLOR_ROLE_VERSION = 'space-color-role@1.0.0';

export function resolveSpatialColorRole(colorItem = {}) {
  const text = [
    colorItem.name,
    colorItem.role,
    colorItem.semanticMeaning,
    colorItem.surfaceApplicability,
    colorItem.spatialUsage,
  ].filter(Boolean).join(' ');
  if (POST_COMPOSITE.test(String(colorItem.spatialUsage ?? ''))
      || /post[_ -]?composite/iu.test(String(colorItem.role ?? ''))) return 'post_composite_only';
  if (colorItem.spatialUsage && [
    'dominant_field', 'secondary_surface', 'local_accent', 'soft_furnishing',
    'detail_trim', 'post_composite_only',
  ].includes(colorItem.spatialUsage)) return colorItem.spatialUsage;
  if (/spatial[_ ]base|background|base surface|空间基底|空间基调|基础面/iu.test(text) && NEUTRAL.test(text)) {
    return 'dominant_field';
  }
  if (/soft furnishing|textile|upholstery|软装|织物/iu.test(text)) return 'soft_furnishing';
  if (/trim|edge|detail|收边|细节/iu.test(text)) return 'detail_trim';
  if (IDENTITY.test(text) || !NEUTRAL.test(text)) return 'local_accent';
  return 'secondary_surface';
}
