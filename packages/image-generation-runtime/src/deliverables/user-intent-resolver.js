const DELIVERABLE_PATTERNS = [
  ['anchor_image', /锚点图|主视觉锚点|anchor\s*image/iu],
  ['interior_scene', /店内|室内|装修|空间设计|餐厅|用餐区|收银台|点餐区/iu],
  ['storefront_scene', /门头|店面|外立面|店铺入口|招牌/iu],
  ['packaging_render', /包装|礼盒|瓶身|瓶型|盒型|包装渲染/iu],
  ['brand_poster', /海报|主视觉|poster/iu],
  ['vi_application', /名片|围裙|T\s*恤|菜单|杯垫|包装袋|VI\s*应用/iu],
];

export function detectGenerationDeliverable(prompt) {
  const normalized = String(prompt ?? '').trim();
  return DELIVERABLE_PATTERNS.find(([, pattern]) => pattern.test(normalized))?.[0];
}

export function resolveUserIntent({ prompt = '', deliverable }) {
  const originalPrompt = String(prompt ?? '');
  const normalizedPrompt = originalPrompt.trim().replace(/\s+/gu, ' ');
  const detectedDeliverable = detectGenerationDeliverable(normalizedPrompt);
  const conflicts =
    detectedDeliverable && deliverable && detectedDeliverable !== deliverable
      ? [{
          code: 'DELIVERABLE_USER_INTENT_CONFLICT',
          selectedDeliverable: deliverable,
          detectedDeliverable,
          message: `当前交付类型与用户要求不一致，建议切换为 ${detectedDeliverable} 后重新编译。`,
        }]
      : [];
  return { originalPrompt, normalizedPrompt, detectedDeliverable, conflicts };
}
