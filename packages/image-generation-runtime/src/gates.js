// @masterpiece/image-generation-runtime/gates
// §9 三层 Gate（确定性）。
//   Gate A Identity Safety   —— 提交前硬阻断（身份安全）
//   Gate B Task Executability —— 提交前硬阻断（任务可执行）
//   Gate C Artifact Completeness —— 下载后硬阻断/失败（产物完整）
// 视觉质量问题一律降级为 Warning（§9.4），不阻断。
//
// 本阶段不得恢复旧的大型 Readiness / Validator 树。

import { hasCurrentProjectReference } from './reference-selector.js';
import { resolveGenerationPolicy } from './policies.js';

function err(code, gate, message, detail) {
  return detail === undefined ? { code, gate, message } : { code, gate, message, detail };
}

function hasReferenceStyleImage(references = []) {
  return references.some((reference) => reference.role === 'reference_style');
}

export function resolvePresetWarnings(input) {
  const { sources, context } = input ?? {};
  const warnings = [];
  const add = (code, message) => warnings.push({ code, message });
  if (sources?.preset === 'visual_extension') {
    add('DOCUMENT_CONTEXT_NOT_USED', '本次未使用文档上下文。');
    add('REFERENCE_STYLE_NOT_USED', '本次未使用 Reference Anchor 风格上下文。');
  }
  if (sources?.preset === 'document_concept') {
    add('CONCEPT_ONLY', '当前输出仅用于概念方向探索。');
    add('BRAND_IDENTITY_NOT_FULLY_BOUND', '当前未绑定完整品牌身份。');
    add('LOGO_RENDERING_NOT_GUARANTEED', '不保证准确生成 Logo。');
    add('PACKAGING_STRUCTURE_NOT_GUARANTEED', '不保证形成可生产的包装结构。');
  }
  if (sources?.preset === 'reference_preview') {
    add('VISUAL_CONTEXT_NOT_USED', '本次未使用视觉分析上下文。');
    if (context?.referenceDecision?.status === 'awaiting_decision') {
      add('UNAPPROVED_REFERENCE_PREVIEW', 'Reference Anchor 尚未人工批准，本次仅用于预览。');
    }
    if (!hasCurrentProjectReference(context?.references)) {
      add('CURRENT_IDENTITY_NOT_BOUND', '当前项目身份未绑定。');
    }
  }
  if (!sources?.userIntent?.prompt?.trim()) add('USER_INTENT_EMPTY', '未填写本次生成意图，已使用预设默认意图。');
  return warnings;
}

export function evaluateSourceGate(input) {
  const { sources, context } = input ?? {};
  const errors = [];
  const gate = 'identity_safety';
  let policy;
  try { policy = input?.policy ?? resolveGenerationPolicy(sources?.preset); }
  catch (error) {
    return [err(error.code || 'GENERATION_PRESET_UNSUPPORTED', gate, error.message)];
  }
  if (policy.requireVisualContext && !context?.visualContext) errors.push(err('VISUAL_CONTEXT_REQUIRED', gate, '当前预设要求视觉分析上下文。'));
  if (policy.requireDocumentContext && !context?.documentContext) errors.push(err('DOCUMENT_CONTEXT_REQUIRED', gate, '当前预设要求文档上下文。'));
  if (policy.requireResolvedContext && !context?.resolvedContext) errors.push(err('RESOLVED_CONTEXT_REQUIRED', gate, '当前预设要求 ResolvedProjectContext。'));
  if (policy.requireReferenceContext && !context?.referenceCapsule) errors.push(err('REFERENCE_CONTEXT_REQUIRED', gate, '当前预设要求 Reference Anchor 上下文。'));
  const referenceStatus = context?.referenceDecision?.status;
  const referenceDecision = context?.referenceDecision?.decision;
  if (['rejected', 'failed', 'cancelled'].includes(referenceStatus) || referenceDecision === 'rejected') {
    errors.push(err('REFERENCE_RUN_REJECTED', gate, 'Reference Anchor 已拒绝、失败或取消。'));
  }
  if (policy.requireReferenceApproval && referenceDecision !== 'approved') {
    errors.push(err('REFERENCE_ANCHOR_NOT_APPROVED', gate, 'Reference Anchor 尚未获得人工批准。'));
  }
  if (policy.requireCurrentIdentityImage && !hasCurrentProjectReference(context?.references)) {
    errors.push(err('CURRENT_IDENTITY_IMAGE_REQUIRED', gate, '当前预设要求至少一张当前项目身份图。'));
  }
  if (policy.requireReferenceImage && !hasReferenceStyleImage(context?.references)) {
    errors.push(err('REFERENCE_IMAGE_REQUIRED', gate, '当前预设要求至少一张参考风格图。'));
  }
  if (policy.requireCurrentIdentity && !context?.resolvedContext?.identity?.brandName) {
    errors.push(err('CURRENT_PROJECT_IDENTITY_MISSING', gate, '当前项目缺少品牌身份。'));
  }
  if (sources?.preset === 'integrated_anchor') {
    const unresolved = (context?.resolvedContext?.conflicts ?? []).filter((item) => item.resolution === 'unresolved');
    if (unresolved.length) errors.push(err('LOCKED_ASSET_CONFLICT_UNRESOLVED', gate, '存在未解决的 Locked Asset 冲突。'));
  }
  return errors;
}

/**
 * Gate A：Identity Safety。
 * @returns {import('@masterpiece/image-generation-contracts').ImageGenerationBlockingError[]}
 */
export function evaluateIdentityGate(input) {
  const { resolvedContext, anchorApproved, capsule, compiledPromptMarkdown } = input ?? {};
  const errors = [];
  const gate = 'identity_safety';

  if (!resolvedContext) {
    errors.push(err('CURRENT_PROJECT_CONTEXT_MISSING', gate, '缺少 ResolvedProjectContext，无法确认当前项目上下文。'));
    return errors; // 无上下文时后续身份检查无意义
  }

  const brandName = resolvedContext.identity?.brandName;
  if (!brandName || String(brandName).trim().length === 0) {
    errors.push(err('CURRENT_PROJECT_IDENTITY_MISSING', gate, '当前项目缺少品牌名称等身份信息。'));
  }

  if (anchorApproved !== true) {
    errors.push(err('REFERENCE_ANCHOR_NOT_APPROVED', gate, 'Reference Anchor 尚未获得人工批准，禁止生图。'));
  }

  const unresolved = (resolvedContext.conflicts ?? []).filter((c) => c.resolution === 'unresolved');
  if (unresolved.length > 0) {
    errors.push(
      err('LOCKED_ASSET_CONFLICT_UNRESOLVED', gate, '存在未解决的上下文冲突，禁止生图。', {
        fields: unresolved.map((c) => c.field),
      })
    );
  }

  // 参考身份隔离：所有需禁止的参考品牌身份必须出现在 Prompt 的禁止段（I 段），否则视为泄漏风险。
  const prohibited = capsule?.prohibitedReferenceIdentity ?? {};
  const prompt = compiledPromptMarkdown ?? '';
  const leakCheck = [
    { list: prohibited.brandNames, code: 'REFERENCE_BRAND_IDENTITY_LEAK', label: '参考品牌名称' },
    { list: prohibited.logos, code: 'REFERENCE_LOGO_DIRECT_COPY', label: '参考 Logo' },
    { list: prohibited.slogans, code: 'REFERENCE_SLOGAN_LEAK', label: '参考 Slogan' },
    {
      list: prohibited.signatureGraphics,
      code: 'REFERENCE_SIGNATURE_GRAPHIC_DIRECT_COPY',
      label: '参考标志性图形',
    },
  ];
  for (const { list, code, label } of leakCheck) {
    const items = (list ?? []).filter((x) => typeof x === 'string' && x.trim().length > 0);
    if (items.length === 0) continue;
    const missing = items.filter((item) => !prompt.includes(item.trim()));
    if (missing.length > 0) {
      errors.push(
        err(code, gate, `${label}未被写入 Prompt 禁止段，存在身份泄漏风险。`, { missing })
      );
    }
  }

  return errors;
}

/**
 * Gate B：Task Executability。
 * @returns {import('@masterpiece/image-generation-contracts').ImageGenerationBlockingError[]}
 */
export function evaluateTaskGate(input) {
  const {
    anchorBriefMarkdown,
    task,
    compiledPromptMarkdown,
    references = [],
    capabilities,
    providerConfig,
    parameters = {},
  } = input ?? {};
  const errors = [];
  const gate = 'task_executability';

  if (!anchorBriefMarkdown || String(anchorBriefMarkdown).trim().length === 0) {
    errors.push(err('ANCHOR_GENERATION_BRIEF_MISSING', gate, '缺少 Anchor Generation Brief，无法生图。'));
  }

  if (task) {
    const requiredFields = ['projectId', 'runId', 'sourceReferenceAnchorRunId', 'providerId', 'modelId', 'region'];
    const missing = requiredFields.filter((f) => !task[f]);
    if (missing.length > 0) {
      errors.push(err('IMAGE_GENERATION_TASK_INVALID', gate, '生图任务字段不完整。', { missing }));
    }
    if (task.outputType && task.outputType !== 'master_anchor_image') {
      errors.push(err('OUTPUT_TYPE_UNSUPPORTED', gate, `P0 仅支持 master_anchor_image，收到 ${task.outputType}。`));
    }
  }

  if (!compiledPromptMarkdown || String(compiledPromptMarkdown).trim().length === 0) {
    errors.push(err('TASK_PROMPT_EMPTY', gate, '编译后的 Prompt 为空。'));
  }

  const size = parameters.size ?? task?.parameters?.size;
  if (capabilities) {
    if (Array.isArray(capabilities.supportedSizes) && capabilities.supportedSizes.length > 0) {
      if (!size || !capabilities.supportedSizes.includes(size)) {
        errors.push(
          err('ASPECT_OR_SIZE_UNSUPPORTED', gate, `尺寸 ${size ?? '(空)'} 不在 Provider 支持列表内。`, {
            supportedSizes: capabilities.supportedSizes,
          })
        );
      }
    }
    if (task?.modelId && capabilities.modelId && task.modelId !== capabilities.modelId) {
      errors.push(
        err('PROVIDER_MODEL_UNAVAILABLE', gate, `模型 ${task.modelId} 与 Provider 能力 ${capabilities.modelId} 不一致。`)
      );
    }
  } else {
    errors.push(err('PROVIDER_MODEL_UNAVAILABLE', gate, '缺少 Provider Capability，无法校验模型与尺寸。'));
  }

  if (!hasCurrentProjectReference(references)) {
    errors.push(err('REFERENCE_IMAGE_MISSING', gate, '缺少至少一张当前项目身份参考图。'));
  }

  const max = capabilities?.maxReferenceImages;
  if (Number.isFinite(max) && references.length > max) {
    errors.push(
      err('REFERENCE_IMAGE_LIMIT_EXCEEDED', gate, `参考图数量 ${references.length} 超出 Provider 上限 ${max}（Selector 未正确削减）。`)
    );
  }

  if (!providerConfig || !providerConfig.apiKey || !providerConfig.baseUrl) {
    errors.push(err('PROVIDER_CONFIG_MISSING', gate, '缺少 Provider 配置（baseUrl / apiKey）。'));
  }

  return errors;
}

/**
 * Gate C：Artifact Completeness（下载后）。Phase 3 下载图片后调用。
 * @param {object} input
 * @param {string} [input.providerTaskId]
 * @param {object} [input.providerResult]  归一化后的 provider 结果
 * @param {object} [input.downloaded]  { mimeType, sizeBytes, sha256, decoded, written }
 * @param {string[]} [input.allowedMimeTypes]
 * @returns {import('@masterpiece/image-generation-contracts').ImageGenerationBlockingError[]}
 */
export function evaluateArtifactGate(input) {
  const { providerTaskId, providerResult, downloaded, allowedMimeTypes = ['image/png'] } = input ?? {};
  const errors = [];
  const gate = 'artifact_completeness';

  if (!providerTaskId) {
    errors.push(err('PROVIDER_TASK_ID_MISSING', gate, 'Provider 未返回 task_id。'));
  }
  if (!providerResult) {
    errors.push(err('PROVIDER_RESULT_MISSING', gate, 'Provider 未返回结果。'));
    return errors;
  }
  const images = providerResult.images ?? [];
  const first = images[0];
  if (!first || (!first.url && !first.b64)) {
    errors.push(err('IMAGE_RESULT_URL_MISSING', gate, 'Provider 结果缺少图片 URL 或数据。'));
    return errors;
  }

  if (!downloaded) {
    errors.push(err('IMAGE_DOWNLOAD_FAILED', gate, '图片下载失败。'));
    return errors;
  }
  if (downloaded.downloadFailed) {
    errors.push(err('IMAGE_DOWNLOAD_FAILED', gate, downloaded.error ?? '图片下载失败。'));
  }
  if (downloaded.mimeType && !allowedMimeTypes.includes(downloaded.mimeType)) {
    errors.push(err('IMAGE_MIME_INVALID', gate, `图片 MIME ${downloaded.mimeType} 不在允许列表内。`, { allowedMimeTypes }));
  }
  if (!Number.isFinite(downloaded.sizeBytes) || downloaded.sizeBytes <= 0) {
    errors.push(err('IMAGE_FILE_EMPTY', gate, '下载文件为空。'));
  }
  if (downloaded.decoded === false) {
    errors.push(err('IMAGE_MIME_INVALID', gate, '图片无法解码。'));
  }
  if (!downloaded.sha256) {
    errors.push(err('IMAGE_HASH_FAILED', gate, '未能计算图片 SHA-256。'));
  }
  if (downloaded.written === false) {
    errors.push(err('OUTPUT_WRITE_FAILED', gate, '图片原子写入失败。'));
  }

  return errors;
}

/**
 * 汇总提交前（Gate A + Gate B）结果。
 * @returns {import('@masterpiece/image-generation-contracts').ImageGenerationGateResult}
 */
export function evaluatePreSubmitGates(input) {
  if (input?.policy || input?.sources || input?.context) {
    const errors = [...evaluateSourceGate(input)];
    const taskErrors = evaluateTaskGate({
      ...input,
      anchorBriefMarkdown: input.policy?.requireReferenceContext ? input.context?.anchorBriefMarkdown : '# not required',
      references: input.context?.references ?? input.references,
    }).filter((error) => ![
      'REFERENCE_IMAGE_MISSING',
      'OUTPUT_TYPE_UNSUPPORTED',
      'IMAGE_GENERATION_TASK_INVALID',
    ].includes(error.code));
    errors.push(...taskErrors);
    const warnings = [...(input?.warnings ?? []), ...resolvePresetWarnings(input)];
    return { blocked: errors.length > 0, errors, warnings };
  }
  const errors = [...evaluateIdentityGate(input), ...evaluateTaskGate(input)];
  const warnings = input?.warnings ?? [];
  return {
    blocked: errors.length > 0,
    errors,
    warnings,
  };
}
