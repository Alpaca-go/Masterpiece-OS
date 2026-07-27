import { compilePrompt as compileLegacyPrompt, TEXT_SAFETY_RULES } from '../prompt-compiler.js';
import { orderReferences } from '../reference-selector.js';

const DEFAULT_INTENTS = Object.freeze({
  visual_extension: '延续当前视觉系统，生成一张可继续使用的横版主视觉。',
  document_concept: '根据文策生成一张能够表达品牌核心概念的视觉概念稿。',
  reference_preview: '测试参考方案的色彩、版式、材质与视觉机制。',
  integrated_anchor: '生成一张能够建立整套视觉升级方向的 Master Anchor Image。',
});

const titleByPreset = Object.freeze({
  visual_extension: '基于视觉分析继续生成',
  document_concept: '文策概念稿生成',
  reference_preview: 'Reference Anchor 风格预览',
  integrated_anchor: '完整上下文 Master Anchor',
});

function text(value, fallback = '（未提供）') {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  return JSON.stringify(value, null, 2).slice(0, 8000);
}

function safety() {
  return TEXT_SAFETY_RULES.map((rule) => `- ${rule}`).join('\n');
}

function referenceList(references) {
  const ordered = orderReferences(references ?? []);
  return ordered.length
    ? ordered.map((item, index) => `${index + 1}. [${item.role}] ${item.includeReason}`).join('\n')
    : '（无参考图）';
}

function outputSpec(parameters) {
  return `- 尺寸：${text(parameters?.size)}\n- 比例：${text(parameters?.aspectRatio, '按尺寸确定')}\n- 格式：PNG\n- 数量：1\n- 水印：无`;
}

function visualPrompt({ sources, context, parameters }) {
  const intent = sources.userIntent?.prompt?.trim() || DEFAULT_INTENTS.visual_extension;
  return {
    sections: [
      ['A. 当前视觉项目', text(context.visualContext)],
      ['B. 需要延续的视觉资产', referenceList(context.references)],
      ['C. 当前视觉语言', text(context.visualContext)],
      ['D. 本次生成目标', intent],
      ['E. 允许变化项', '允许在不破坏现有视觉识别的前提下调整构图、场景与信息密度。'],
      ['F. 禁止破坏项', '不得改写已有品牌身份，不得伪造 Logo、品牌名称或锁定视觉事实。'],
      ['G. 参考图片使用规则', '当前项目图片用于延续视觉语言和身份，不复制无关内容。'],
      ['H. 文字安全', safety()],
      ['I. 输出规格', outputSpec(parameters)],
    ],
    fields: ['visualContext', 'references', 'sources.userIntent', 'parameters'],
  };
}

function documentPrompt({ sources, context, parameters }) {
  const intent = sources.userIntent?.prompt?.trim() || DEFAULT_INTENTS.document_concept;
  return {
    sections: [
      ['A. 项目或品牌概念', text(context.documentContext)],
      ['B. 行业与产品', text(context.documentContext)],
      ['C. 目标用户', text(context.documentContext)],
      ['D. 情绪与视觉关键词', text(context.documentContext)],
      ['E. 本次概念稿目标', intent],
      ['F. 概念探索边界', '这是一张概念探索图；不要求生成准确 Logo；不要求形成完整品牌系统；不要伪造复杂品牌文字。'],
      ['G. 文字安全', safety()],
      ['H. 输出规格', outputSpec(parameters)],
    ],
    fields: ['documentContext', 'sources.userIntent', 'parameters'],
  };
}

function referencePrompt({ sources, context, parameters }) {
  const intent = sources.userIntent?.prompt?.trim() || DEFAULT_INTENTS.reference_preview;
  const unapproved = context.referenceDecision?.decision !== 'approved'
    ? '当前方向尚未人工批准，仅用于试生成预览。'
    : '当前 Reference Anchor 已批准。';
  return {
    sections: [
      ['A. 本次风格预览目标', `${intent}\n\n${unapproved}`],
      ['B. 可迁移视觉机制', text(context.referenceCapsule)],
      ['C. 色彩关系', text(context.referenceCapsule)],
      ['D. 材质与光线', text(context.referenceCapsule)],
      ['E. 图形与版式', text(context.referenceCapsule)],
      ['F. 参考图使用规则', referenceList(context.references)],
      ['G. 禁止迁移的参考身份', text(context.referenceCapsule?.prohibitedReferenceIdentity)],
      ['H. 当前项目身份绑定状态', context.references?.some((item) => item.role !== 'reference_style') ? '已绑定当前项目身份图。' : '未绑定当前项目身份图，仅预览风格机制。'],
      ['I. 文字安全', safety()],
      ['J. 输出规格', outputSpec(parameters)],
    ],
    fields: ['referenceCapsule', 'referenceDecision', 'references', 'sources.userIntent', 'parameters'],
  };
}

export function composePrompt(input) {
  const { sources, context, capabilities, parameters = {}, modelId } = input ?? {};
  if (!sources?.preset) throw Object.assign(new Error('缺少生图预设。'), { code: 'GENERATION_PRESET_MISSING' });
  if (sources.preset === 'integrated_anchor') {
    const legacy = compileLegacyPrompt({
      resolvedContext: context?.resolvedContext,
      capsule: context?.referenceCapsule,
      anchorBriefMarkdown: context?.anchorBriefMarkdown,
      references: context?.references,
      capabilities,
      parameters,
      modelId,
    });
    const intent = sources.userIntent?.prompt?.trim() || DEFAULT_INTENTS.integrated_anchor;
    return {
      ...legacy,
      compiledPromptMarkdown: `${legacy.compiledPromptMarkdown}\n## 用户本次明确要求\n${intent}\n`,
      promptVersion: 2,
      promptSourceMap: { ...legacy.promptSourceMap, userIntent: { priority: 1, fields: ['sources.userIntent.prompt'] } },
    };
  }
  const builder = {
    visual_extension: visualPrompt,
    document_concept: documentPrompt,
    reference_preview: referencePrompt,
  }[sources.preset];
  if (!builder) throw Object.assign(new Error(`不支持的生图预设：${sources.preset}`), { code: 'GENERATION_PRESET_UNSUPPORTED' });
  const compiled = builder({ sources, context: context ?? {}, parameters });
  const compiledPromptMarkdown = `# ${titleByPreset[sources.preset]}\n\n${compiled.sections.map(([title, content]) => `## ${title}\n${content}`).join('\n\n')}\n`;
  return {
    compiledPromptMarkdown,
    providerPayloadPreview: {
      model: modelId ?? capabilities?.modelId ?? '',
      prompt: compiledPromptMarkdown,
      size: parameters.size ?? '',
      n: 1,
      watermark: false,
      referenceImages: orderReferences(context?.references ?? []).map((item, index) => ({
        order: index + 1,
        role: item.role,
        assetId: item.assetId,
        localPath: item.localPath,
        sha256: item.sha256,
      })),
    },
    promptSourceMap: {
      schemaVersion: '2.0',
      preset: sources.preset,
      fragments: compiled.sections.map(([title], index) => ({
        id: title.split('.')[0],
        title,
        sourceFields: compiled.fields,
        priority: index === 0 ? 3 : 6,
      })),
    },
    promptVersion: 2,
  };
}

export { DEFAULT_INTENTS };
