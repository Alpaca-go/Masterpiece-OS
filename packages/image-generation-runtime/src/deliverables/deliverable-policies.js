const ALL_REFERENCE_ROLES = [
  'identity_reference',
  'structure_reference',
  'style_reference',
  'spatial_reference',
  'analysis_only',
  'excluded',
];

function policy(deliverable, displayName, requiredPromptConcepts, forbiddenPromptConcepts, overrides = {}) {
  return Object.freeze({
    deliverable,
    displayName,
    requiredPromptConcepts,
    forbiddenPromptConcepts,
    requiredReferenceRoles: [],
    allowedReferenceRoles: ['identity_reference', 'structure_reference', 'style_reference'],
    maxIdentityReferences: 1,
    maxStructureReferences: 1,
    maxStyleReferences: 1,
    maxSpatialReferences: 0,
    requiresSpatialDepth: false,
    requiresPhysicalStructure: false,
    allowsFlatLay: false,
    allowsMockupCollection: false,
    ...overrides,
  });
}

export const DELIVERABLE_POLICIES = Object.freeze({
  anchor_image: policy(
    'anchor_image',
    'Anchor Image',
    ['单一视觉锚点', '明确主体', '可延展的视觉机制'],
    ['整套物料合集', '多格拼贴'],
    { requiredReferenceRoles: ['identity_reference'] },
  ),
  brand_poster: policy(
    'brand_poster',
    '品牌海报',
    ['单一主画面', '主视觉锚点', '海报构图', '文案预留区', '品牌色和图形语言'],
    ['整套物料合集', '多格样机拼贴', '店内空间', '包装结构展示为主体'],
    { requiredReferenceRoles: ['identity_reference'] },
  ),
  packaging_render: policy(
    'packaging_render',
    '包装渲染图',
    ['真实包装结构', '包装材质', '盒型', '开合关系', '产品陈列', '摄影灯光', '真实比例'],
    ['VI 平铺', '店面空间', '服装', '围裙', '名片合集'],
    {
      requiredReferenceRoles: ['identity_reference', 'structure_reference'],
      requiresPhysicalStructure: true,
    },
  ),
  vi_application: policy(
    'vi_application',
    'VI 应用图',
    ['明确的 VI 应用展示', '受控的物料数量', '一致的品牌应用规则'],
    ['误生成海报', '误生成空间'],
    {
      requiredReferenceRoles: ['identity_reference'],
      allowsFlatLay: true,
      allowsMockupCollection: true,
      maxStyleReferences: 4,
    },
  ),
  interior_scene: policy(
    'interior_scene',
    '店内空间效果图',
    ['完整室内空间', '墙面', '地面', '天花', '收银台或点餐区', '顾客用餐区', '桌椅', '家具', '动线', '灯光', '材质', '空间纵深', '广角视角'],
    ['VI 物料平铺', '品牌样机合集', '名片平铺', '菜单册平铺', 'T 恤展示', '围裙展示', '杯垫排列', '包装袋排列', '多格拼贴', '俯拍物料合集', '作品集网格'],
    {
      requiredReferenceRoles: ['identity_reference'],
      allowedReferenceRoles: ['identity_reference', 'structure_reference', 'style_reference', 'spatial_reference'],
      maxSpatialReferences: 3,
      maxStructureReferences: 0,
      requiresSpatialDepth: true,
      requiresPhysicalStructure: true,
    },
  ),
  storefront_scene: policy(
    'storefront_scene',
    '店面 / 门头效果图',
    ['完整门头', '店铺入口', '招牌', '门窗', '外立面材质', '街道关系', '人行尺度'],
    ['平面 Logo 展示', '招牌样机平铺', 'VI 物料拼贴', '只有墙面近景'],
    {
      requiredReferenceRoles: ['identity_reference'],
      allowedReferenceRoles: ['identity_reference', 'structure_reference', 'style_reference', 'spatial_reference'],
      maxSpatialReferences: 2,
      requiresSpatialDepth: true,
      requiresPhysicalStructure: true,
    },
  ),
  free_concept: policy(
    'free_concept',
    '自由概念图',
    ['用户明确要求'],
    [],
    { allowedReferenceRoles: ALL_REFERENCE_ROLES.filter((role) => !['analysis_only', 'excluded'].includes(role)) },
  ),
});

export function getDeliverablePolicy(deliverable) {
  const value = DELIVERABLE_POLICIES[deliverable];
  if (!value) throw Object.assign(new Error(`不支持的交付类型：${deliverable || '未提供'}`), { code: 'DELIVERABLE_UNSUPPORTED' });
  return structuredClone(value);
}
