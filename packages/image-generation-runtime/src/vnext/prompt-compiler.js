import crypto from 'node:crypto';
import { assertVNextProjectPromptAsset } from './project-prompt-asset.js';

export const VNEXT_PROMPT_COMPILER_ID = 'vnext-prompt-compiler';
export const VNEXT_PROMPT_COMPILER_VERSION = '1.0.0';

function cleanList(...values) {
  const result = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== 'string') return;
    const clean = value.trim().replace(/\s+/gu, ' ');
    if (clean && !result.includes(clean)) result.push(clean);
  };
  values.forEach(visit);
  return result;
}

function section(title, values) {
  if (!values.length) return '';
  return `【${title}】\n${values.map((value) => `- ${value}`).join('\n')}`;
}

export function compileVNextPrompt({ projectContext, taskContract, route, adapter, projectPromptAsset }) {
  if (projectContext.schemaVersion !== '2.0') {
    throw new Error('vNext prompt compiler requires Project Visual Context 2.0');
  }
  if (projectContext.projectId !== taskContract.projectId) {
    throw new Error('Task Contract and Project Visual Context belong to different projects');
  }
  const templates = route.templates;
  const promptAsset = projectPromptAsset
    ? assertVNextProjectPromptAsset(
      projectPromptAsset,
      taskContract.projectId,
      taskContract.deliverableFamily,
    )
    : null;
  const templateSections = (key) => cleanList(
    templates.map((template) => template.sections?.[key] ?? []),
  );
  const negativeConstraints = cleanList(
    taskContract.mustAvoid,
    projectContext.styleBoundaries.mustAvoid,
    promptAsset?.negativeConstraints,
    templateSections('negative'),
  );
  const parts = [
    section('成果物硬定义', templateSections('definition')),
    section('本轮任务（最高优先级）', [
      `成果物：${taskContract.deliverableFamily} / ${taskContract.subtype} / ${taskContract.shot}`,
      taskContract.currentInstruction,
      ...taskContract.mustInclude.map((item) => `必须包含：${item}`),
    ]),
    section('项目身份', cleanList(
      `品牌：${projectContext.brandCore.name}`,
      projectContext.brandCore.industry !== 'unknown'
        ? `行业：${projectContext.brandCore.industry}`
        : '',
      projectContext.brandCore.brandRole ? `品牌角色：${projectContext.brandCore.brandRole}` : '',
      projectContext.brandCore.audience.length
        ? `受众：${projectContext.brandCore.audience.join('、')}`
        : '',
    )),
    section('已锁定资产与事实', cleanList(
      projectContext.lockedAssets.mustPreserve,
      projectContext.lockedAssets.confirmedColors.map((item) => `确认色彩：${item}`),
      projectContext.lockedAssets.packageStructures.map((item) => `确认结构：${item}`),
      projectContext.lockedAssets.logoAssetIds.length ? '保留所提供的品牌标识，不重新设计 Logo' : '',
    )),
    section('项目视觉行为', cleanList(
      projectContext.visualIdentity.tone,
      projectContext.visualIdentity.colorBehavior,
      projectContext.visualIdentity.graphicBehavior,
      projectContext.visualIdentity.materialBehavior,
      projectContext.visualIdentity.compositionBehavior,
      projectContext.visualIdentity.lightingBehavior,
    )),
    section('项目级 Prompt 资产', cleanList(promptAsset?.promptFragments)),
    section('子类型专业要求', templateSections('professionalRequirements')),
    section('镜头与构图', cleanList(
      templateSections('composition'),
      `画幅比例：${taskContract.aspectRatio}`,
    )),
    section('输出真实性', templateSections('realism')),
    section('禁止内容', negativeConstraints),
  ].filter(Boolean);
  const finalPrompt = adapter.orderSections(parts).join('\n\n');
  const traceValue = {
    projectContextFingerprint: projectContext.provenance.sourceFingerprint,
    taskContract,
    route: {
      familyTemplateId: route.familyTemplateId,
      subtypeTemplateId: route.subtypeTemplateId,
      shotTemplateId: route.shotTemplateId,
      templateVersions: route.templateVersions,
    },
    projectPromptAsset: promptAsset
      ? { id: promptAsset.id, version: promptAsset.version }
      : null,
    finalPrompt,
  };
  return {
    schemaVersion: '1.0',
    taskContract,
    projectContextVersion: projectContext.version,
    route: {
      familyTemplateId: route.familyTemplateId,
      subtypeTemplateId: route.subtypeTemplateId,
      shotTemplateId: route.shotTemplateId,
      templateVersions: route.templateVersions,
    },
    finalPrompt,
    editablePrompt: finalPrompt,
    negativeConstraints,
    referenceAssetIds: taskContract.referenceAssetIds,
    compiledAt: new Date().toISOString(),
    trace: {
      compilerId: VNEXT_PROMPT_COMPILER_ID,
      compilerVersion: VNEXT_PROMPT_COMPILER_VERSION,
      adapterId: adapter.id,
      adapterVersion: adapter.version,
      sourceFingerprint: crypto.createHash('sha256').update(JSON.stringify(traceValue)).digest('hex'),
      ...(promptAsset ? {
        projectPromptAssetId: promptAsset.id,
        projectPromptAssetVersion: promptAsset.version,
      } : {}),
    },
  };
}
