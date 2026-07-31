// @masterpiece/image-generation-runtime/prompt-compiler
// §8 Prompt Compiler：确定性编译器，不调用大模型。
//
// 输入：ResolvedProjectContext、ReferenceStyleCapsule、AnchorGenerationBrief(markdown)、
//       Task Config、Provider Capability、已选参考图。
// 输出：compiled-prompt.md（固定 A–K 结构）、provider-payload-preview.json、prompt-source-map.json。
//
// 相同输入必定产生相同输出（无时间戳、无随机、无网络）。

import { orderReferences } from './reference-selector.js';

/** §8.3 文字安全固定条款（P0 强制写入 Prompt J 段）。 */
export const TEXT_SAFETY_RULES = [
  '不生成菜单正文',
  '不生成价格',
  '不生成二维码',
  '不生成法律信息',
  '不生成大段小字',
  '不伪造品牌名称',
  '不近似重绘参考品牌文字',
  '只允许少量视觉占位文字或无文字设计',
];

const ROLE_LABELS = {
  current_project_logo: '当前项目 Logo / 品牌身份',
  current_project_product: '当前项目产品或结构',
  current_project_identity: '其他当前项目身份资产',
  reference_style: '参考风格图',
};

function list(items) {
  const arr = (items ?? []).filter((x) => typeof x === 'string' && x.trim().length > 0);
  if (arr.length === 0) return '  （无）';
  return arr.map((x) => `  - ${x.trim()}`).join('\n');
}

function textOrNone(value) {
  return value && String(value).trim().length > 0 ? String(value).trim() : '（无）';
}

/**
 * 编译 Prompt。
 * @param {object} input
 * @param {import('@masterpiece/project-contracts').ResolvedProjectContext} input.resolvedContext
 * @param {import('@masterpiece/project-contracts').ReferenceStyleCapsule} input.capsule
 * @param {string} input.anchorBriefMarkdown
 * @param {import('@masterpiece/image-generation-contracts').ImageGenerationReference[]} input.references
 * @param {import('@masterpiece/image-generation-contracts').ImageProviderCapabilities} input.capabilities
 * @param {{ size: string, aspectRatio?: string }} input.parameters
 * @returns {{ compiledPromptMarkdown: string, providerPayloadPreview: object, promptSourceMap: object, promptVersion: number }}
 */
export function compilePrompt(input) {
  const {
    resolvedContext,
    capsule,
    anchorBriefMarkdown,
    references = [],
    capabilities,
    parameters = {},
  } = input ?? {};

  const identity = resolvedContext?.identity ?? {};
  const inherited = capsule?.inheritedStyle ?? {};
  const prohibitedIdentity = capsule?.prohibitedReferenceIdentity ?? {};
  const ordered = orderReferences(references);

  const aspectRatio = parameters.aspectRatio ?? capsule?.aspectRatio ?? '16:9';
  const size = parameters.size ?? '';

  // ── A–K 固定结构 ──
  const sections = [];

  sections.push(`## A. 当前项目身份
  - 品牌名称：${textOrNone(identity.brandName)}
  - 行业：${textOrNone(identity.industry)}
  - 项目名称：${textOrNone(identity.projectName)}`);

  sections.push(`## B. 不可修改资产
  - Logo 锁定：${resolvedContext?.lockedAssets?.logoLocked ? '是' : '否'}
  - 锁定事实：
${list(resolvedContext?.lockedAssets?.lockedFacts)}`);

  sections.push(`## C. 本次输出职责
  - 输出类型：Master Anchor Image（主锚点图，用于确立视觉方向）
  - Anchor 目标：${textOrNone(capsule?.anchorGoal)}`);

  sections.push(`## D. 主体与构图
  - 核心产品：
${list(resolvedContext?.products)}
  - 业务触点：
${list(resolvedContext?.businessTouchpoints?.packaging)}`);

  sections.push(`## E. 色彩关系
${list(inherited.color)}`);

  sections.push(`## F. 材质与光线
${list(inherited.materialAndPhotography)}`);

  sections.push(`## G. 图形与排版关系
  - 图形语言：
${list(inherited.graphicLanguage)}
  - 版式与字体：
${list(inherited.layoutAndTypography)}`);

  sections.push(`## H. 参考图使用规则
  - 参考图按以下顺序提供，仅用于风格与结构参考，不得复制其品牌身份：
${
    ordered.length === 0
      ? '  （无参考图）'
      : ordered
          .map((ref, i) => `  ${i + 1}. [${ROLE_LABELS[ref.role] ?? ref.role}] ${ref.includeReason}`)
          .join('\n')
  }`);

  sections.push(`## I. 禁止事项
  - 禁止方向：
${list(resolvedContext?.prohibitedDirections)}
  - 用户明确避免：
${list(capsule?.userAvoidance)}
  - 禁止复制的参考品牌身份：
${list([
    ...(prohibitedIdentity.brandNames ?? []),
    ...(prohibitedIdentity.logos ?? []),
    ...(prohibitedIdentity.slogans ?? []),
    ...(prohibitedIdentity.signatureGraphics ?? []),
    ...(prohibitedIdentity.proprietaryPatterns ?? []),
  ])}`);

  sections.push(`## J. 文字安全
${TEXT_SAFETY_RULES.map((r) => `  - ${r}`).join('\n')}`);

  sections.push(`## K. 输出规格
  - 尺寸：${textOrNone(size)}
  - 比例：${aspectRatio}
  - 格式：PNG
  - 数量：1
  - 水印：无`);

  const compiledPromptMarkdown = `# Master Anchor Image 生成 Prompt\n\n${sections.join('\n\n')}\n`;

  // ── provider-payload-preview.json（脱敏，不含 API Key）──
  const providerPayloadPreview = {
    model: input.modelId ?? capabilities?.modelId ?? '',
    prompt: compiledPromptMarkdown,
    size,
    n: 1,
    watermark: false,
    negativePrompt: capabilities?.supportsNegativePrompt
      ? buildNegativePrompt(prohibitedIdentity)
      : undefined,
    referenceImages: ordered.map((ref, i) => ({
      order: i + 1,
      role: ref.role,
      assetId: ref.assetId,
      localPath: ref.localPath,
      sha256: ref.sha256,
    })),
  };

  // ── prompt-source-map.json（可追溯：每段引用了哪些上游字段）──
  const promptSourceMap = {
    A: { fields: ['resolvedContext.identity.brandName', 'resolvedContext.identity.industry', 'resolvedContext.identity.projectName'] },
    B: { fields: ['resolvedContext.lockedAssets.logoLocked', 'resolvedContext.lockedAssets.lockedFacts'] },
    C: { fields: ['capsule.anchorGoal'], outputType: 'master_anchor_image' },
    D: { fields: ['resolvedContext.products', 'resolvedContext.businessTouchpoints.packaging'] },
    E: { fields: ['capsule.inheritedStyle.color'] },
    F: { fields: ['capsule.inheritedStyle.materialAndPhotography'] },
    G: { fields: ['capsule.inheritedStyle.graphicLanguage', 'capsule.inheritedStyle.layoutAndTypography'] },
    H: { fields: ['references[].role', 'references[].includeReason'], referenceOrder: ordered.map((r) => r.assetId) },
    I: {
      fields: [
        'resolvedContext.prohibitedDirections',
        'capsule.userAvoidance',
        'capsule.prohibitedReferenceIdentity',
      ],
    },
    J: { source: 'TEXT_SAFETY_RULES (§8.3 固定)' },
    K: { fields: ['parameters.size', 'capsule.aspectRatio'] },
    upstream: {
      resolvedContextGeneratedAt: resolvedContext?.generatedAt ?? null,
      capsuleGeneratedAt: capsule?.generatedAt ?? null,
      capsuleSourceRunId: capsule?.sourceRunId ?? null,
      anchorBriefLength: (anchorBriefMarkdown ?? '').length,
    },
  };

  return {
    compiledPromptMarkdown,
    providerPayloadPreview,
    promptSourceMap,
    promptVersion: 1,
  };
}

function buildNegativePrompt(prohibitedIdentity) {
  const banned = [
    ...(prohibitedIdentity?.brandNames ?? []),
    ...(prohibitedIdentity?.logos ?? []),
    ...(prohibitedIdentity?.slogans ?? []),
  ];
  const base = ['文字段落', '价格', '二维码', '菜单正文'];
  return [...base, ...banned].join(', ');
}
