const common = { requiredReferenceRoles: ['identity_reference'], allowedReferenceRoles: ['identity_reference', 'structure_reference', 'style_reference', 'spatial_reference'], maxIdentityReferences: 1, maxStructureReferences: 1, maxStyleReferences: 1, requiresSpatialDepth: false, requiresPhysicalStructure: false, allowsFlatLay: false, allowsMockupCollection: false };
const make = (deliverable, displayName, requiredPromptConcepts, forbiddenPromptConcepts, extras = {}) => ({ deliverable, displayName, requiredPromptConcepts, forbiddenPromptConcepts, ...common, ...extras });
export const DELIVERABLE_POLICIES = {
  anchor_image: make('anchor_image', 'Anchor Image', ['单一视觉锚点'], ['多格拼贴']),
  brand_poster: make('brand_poster', '品牌海报', ['单一主画面', '海报构图', '文案预留区'], ['物料合集', '多格样机拼贴', '店内空间']),
  packaging_render: make('packaging_render', '包装渲染图', ['真实包装结构', '盒型', '材质', '摄影灯光'], ['VI 平铺', '店面空间', '服装'], { requiredReferenceRoles: ['identity_reference', 'structure_reference'], requiresPhysicalStructure: true }),
  vi_application: make('vi_application', 'VI 应用图', ['明确 VI 应用展示'], [], { allowsFlatLay: true, allowsMockupCollection: true }),
  interior_scene: make('interior_scene', '店内空间效果图', ['完整室内空间', '墙面', '地面', '天花', '收银台或点餐区', '顾客用餐区', '桌椅', '动线', '灯光', '材质', '空间纵深', '广角视角'], ['VI 物料平铺', '品牌样机合集', '名片平铺', '菜单册平铺', 'T 恤展示', '围裙展示', '杯垫排列', '包装袋排列', '多格拼贴', '俯拍物料合集'], { requiresSpatialDepth: true, requiresPhysicalStructure: true }),
  storefront_scene: make('storefront_scene', '店面 / 门头效果图', ['完整门头', '店铺入口', '招牌', '外立面', '街道关系'], ['平面 Logo 展示', '招牌样机平铺', 'VI 物料拼贴'], { requiresSpatialDepth: true, requiresPhysicalStructure: true }),
  free_concept: make('free_concept', '自由概念图', ['用户明确要求'], [])
};
export function getDeliverablePolicy(deliverable) { const policy = DELIVERABLE_POLICIES[deliverable]; if (!policy) throw new Error('DELIVERABLE_UNSUPPORTED'); return structuredClone(policy); }
