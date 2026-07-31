// @masterpiece/image-generation-runtime/reference-selector
// §8.4 参考图顺序与 Provider 上限处理（确定性，不调用模型）。
//
// 排序优先级：
//   1. current_project_logo      当前项目 Logo / 品牌身份
//   2. current_project_product   当前项目产品或结构
//   3. current_project_identity  其他当前项目身份资产
//   4. reference_style           参考风格图
//
// 超出 Provider maxReferenceImages 时：
//   - 优先保留当前项目身份图（role 前三类）
//   - 再按已确认优先级保留 reference_style
//   - 输出 REFERENCE_IMAGES_REDUCED Warning
//   - 不得随机删除图片

/** §8.4 角色排序权重（越小越靠前）。 */
export const REFERENCE_ROLE_ORDER = {
  current_project_logo: 0,
  current_project_product: 1,
  current_project_identity: 2,
  reference_style: 3,
};

/**
 * 稳定排序参考图。相同角色保持输入的原始相对顺序（Reference Anchor 已确认的优先级）。
 * @param {import('@masterpiece/image-generation-contracts').ImageGenerationReference[]} references
 * @returns {import('@masterpiece/image-generation-contracts').ImageGenerationReference[]}
 */
export function orderReferences(references) {
  const indexed = references.map((ref, index) => ({ ref, index }));
  indexed.sort((a, b) => {
    const wa = REFERENCE_ROLE_ORDER[a.ref.role] ?? 99;
    const wb = REFERENCE_ROLE_ORDER[b.ref.role] ?? 99;
    if (wa !== wb) return wa - wb;
    return a.index - b.index; // 稳定：同权重维持原顺序
  });
  return indexed.map((item) => item.ref);
}

/**
 * 按 Provider 能力选择参考图。
 * @param {import('@masterpiece/image-generation-contracts').ImageGenerationReference[]} references
 * @param {import('@masterpiece/image-generation-contracts').ImageProviderCapabilities} capabilities
 * @returns {{
 *   selected: import('@masterpiece/image-generation-contracts').ImageGenerationReference[],
 *   dropped: import('@masterpiece/image-generation-contracts').ImageGenerationReference[],
 *   warnings: import('@masterpiece/image-generation-contracts').ImageGenerationWarning[]
 * }}
 */
export function selectReferences(references, capabilities) {
  const ordered = orderReferences(references ?? []);
  const warnings = [];

  const max = Number.isFinite(capabilities?.maxReferenceImages)
    ? capabilities.maxReferenceImages
    : ordered.length;

  // Provider 不支持多图参考时，最多保留 1 张（优先当前项目身份）。
  const effectiveMax =
    capabilities && capabilities.supportsMultiImageReference === false ? Math.min(max, 1) : max;

  if (ordered.length <= effectiveMax) {
    return { selected: ordered, dropped: [], warnings };
  }

  const selected = ordered.slice(0, effectiveMax);
  const dropped = ordered.slice(effectiveMax);

  warnings.push({
    code: 'REFERENCE_IMAGES_REDUCED',
    message: `参考图数量 ${ordered.length} 超出 Provider 上限 ${effectiveMax}，已按当前项目身份优先保留，丢弃 ${dropped.length} 张参考风格图。`,
    detail: {
      total: ordered.length,
      kept: selected.length,
      droppedAssetIds: dropped.map((ref) => ref.assetId),
    },
  });

  return { selected, dropped, warnings };
}

/** 当前项目身份图的角色集合（用于 Gate B 判定「至少存在一张身份图」）。 */
export const CURRENT_PROJECT_ROLES = [
  'current_project_logo',
  'current_project_product',
  'current_project_identity',
];

/**
 * 判断选择结果中是否含至少一张当前项目身份图。
 * @param {import('@masterpiece/image-generation-contracts').ImageGenerationReference[]} references
 */
export function hasCurrentProjectReference(references) {
  return (references ?? []).some((ref) => CURRENT_PROJECT_ROLES.includes(ref.role));
}
