const POST_COMPOSITE = /logo|wordmark|signage|标志|标识|字标/iu;
const SPATIAL_COLOR_ROLE_VERSION = "space-color-role@1.0.0";
function resolveSpatialColorRole(colorItem = {}) {
  const text = [
    colorItem.role,
    colorItem.semanticMeaning,
    colorItem.surfaceApplicability,
    colorItem.spatialUsage
  ].filter(Boolean).join(" ");
  if (POST_COMPOSITE.test(String(colorItem.spatialUsage ?? "")) || /post[_ -]?composite/iu.test(String(colorItem.role ?? ""))) return "post_composite_only";
  if (colorItem.spatialUsage && [
    "dominant_field",
    "secondary_surface",
    "local_accent",
    "soft_furnishing",
    "detail_trim",
    "post_composite_only"
  ].includes(colorItem.spatialUsage)) return colorItem.spatialUsage;
  const roles = [];
  if (/spatial[_ ]base|background|base surface|空间基底|空间基调|基础面|背景/iu.test(text)) roles.push("dominant_field");
  if (/secondary[_ ]surface|supporting surface|次要表面|辅助承载面/iu.test(text)) roles.push("secondary_surface");
  if (!roles.length && /\bwall\b|\bwalls\b|墙面|承载面/iu.test(text)) roles.push("secondary_surface");
  if (/soft furnishing|textile|upholstery|软装|织物/iu.test(text)) roles.push("soft_furnishing");
  if (/trim|edge|detail|收边|细节/iu.test(text)) roles.push("detail_trim");
  if (/local[_ ]accent|accent|点缀|局部配色/iu.test(text)) roles.push("local_accent");
  if (roles.length > 1) return "unresolved_conflict";
  return roles[0] || "unspecified";
}
export {
  SPATIAL_COLOR_ROLE_VERSION,
  resolveSpatialColorRole
};
