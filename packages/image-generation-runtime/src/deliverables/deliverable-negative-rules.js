export const COMMON_NEGATIVE_RULES = [
  '不要生成二维码、价格、法律信息或大段正文',
  '不要复制参考品牌名称、Logo、Slogan 或专属图形',
];

export const DELIVERABLE_NEGATIVE_RULES = {
  anchor_image: ['不要生成多格拼贴或整套物料合集'],
  brand_poster: ['不要生成整套物料合集', '不要生成多格样机拼贴', '不要以店内空间或包装结构为主体'],
  packaging_render: ['不要生成 VI 平铺', '不要生成店面空间', '不要生成服装、围裙或名片合集'],
  vi_application: ['不要误生成海报、店内空间或门头场景', '物料数量必须受控'],
  interior_scene: [
    '不要生成 VI 物料平铺、品牌样机合集或作品集网格',
    '不要生成名片、菜单册平铺、T 恤、围裙、杯垫或包装袋排列',
    '不要生成多格拼贴、俯拍物料合集或纯平面设计稿',
  ],
  storefront_scene: ['不要生成平面 Logo 展示', '不要生成招牌样机平铺或 VI 物料拼贴', '不要只生成墙面近景'],
  free_concept: [],
};

export function getDeliverableNegativeRules(deliverable) {
  return [...COMMON_NEGATIVE_RULES, ...(DELIVERABLE_NEGATIVE_RULES[deliverable] ?? [])];
}
