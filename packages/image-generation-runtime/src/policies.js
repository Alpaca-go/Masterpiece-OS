export const IMAGE_GENERATION_POLICIES = Object.freeze({
  visual_extension: Object.freeze({
    preset: 'visual_extension',
    requireVisualContext: true,
    requireDocumentContext: false,
    requireResolvedContext: false,
    requireReferenceContext: false,
    requireReferenceApproval: false,
    requireCurrentIdentity: false,
    requireCurrentIdentityImage: true,
    requireReferenceImage: false,
    allowTextOnlyGeneration: false,
    allowUnapprovedReferencePreview: false,
  }),
  document_concept: Object.freeze({
    preset: 'document_concept',
    requireVisualContext: false,
    requireDocumentContext: true,
    requireResolvedContext: false,
    requireReferenceContext: false,
    requireReferenceApproval: false,
    requireCurrentIdentity: false,
    requireCurrentIdentityImage: false,
    requireReferenceImage: false,
    allowTextOnlyGeneration: true,
    allowUnapprovedReferencePreview: false,
  }),
  reference_preview: Object.freeze({
    preset: 'reference_preview',
    requireVisualContext: false,
    requireDocumentContext: false,
    requireResolvedContext: false,
    requireReferenceContext: true,
    requireReferenceApproval: false,
    requireCurrentIdentity: false,
    requireCurrentIdentityImage: false,
    requireReferenceImage: true,
    allowTextOnlyGeneration: false,
    allowUnapprovedReferencePreview: true,
  }),
  integrated_anchor: Object.freeze({
    preset: 'integrated_anchor',
    requireVisualContext: true,
    requireDocumentContext: false,
    requireResolvedContext: true,
    requireReferenceContext: true,
    requireReferenceApproval: true,
    requireCurrentIdentity: true,
    requireCurrentIdentityImage: true,
    requireReferenceImage: true,
    allowTextOnlyGeneration: false,
    allowUnapprovedReferencePreview: false,
  }),
});

export function resolveGenerationPolicy(preset) {
  if (!preset) {
    const error = new Error('缺少生图预设。');
    error.code = 'GENERATION_PRESET_MISSING';
    throw error;
  }
  const policy = IMAGE_GENERATION_POLICIES[preset];
  if (!policy) {
    const error = new Error(`不支持的生图预设：${preset}`);
    error.code = 'GENERATION_PRESET_UNSUPPORTED';
    throw error;
  }
  return policy;
}

export const IMAGE_GENERATION_PRESET_CAPABILITIES = Object.freeze([
  {
    preset: 'visual_extension',
    displayName: '基于视觉分析继续生成',
    description: '延续当前项目视觉语言，不加载文档或参考锚点。',
    purpose: 'production',
    requiredSources: ['visual'],
    optionalSources: [],
    warnings: ['DOCUMENT_CONTEXT_NOT_USED', 'REFERENCE_STYLE_NOT_USED'],
  },
  {
    preset: 'document_concept',
    displayName: '基于文策生成概念稿',
    description: '使用文档上下文进行方向探索，不承诺完整品牌身份。',
    purpose: 'exploration',
    requiredSources: ['document'],
    optionalSources: [],
    warnings: ['CONCEPT_ONLY', 'BRAND_IDENTITY_NOT_FULLY_BOUND', 'LOGO_RENDERING_NOT_GUARANTEED', 'PACKAGING_STRUCTURE_NOT_GUARANTEED'],
  },
  {
    preset: 'reference_preview',
    displayName: '试生成参考风格效果',
    description: '只验证 Reference Anchor 的风格转译机制。',
    purpose: 'exploration',
    requiredSources: ['reference'],
    optionalSources: ['visual'],
    warnings: [],
  },
  {
    preset: 'integrated_anchor',
    displayName: '使用完整上下文生成',
    description: '使用完整上下文生成正式 Master Anchor。',
    purpose: 'production',
    requiredSources: ['visual', 'reference', 'resolved'],
    optionalSources: ['document'],
    warnings: [],
  },
]);
