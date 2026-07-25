import type {
  GenerationIdentityPack,
  GenerationReadinessGate,
  GenerationReadinessResult
} from '../../../shared/types.ts';

export interface BlockedReasonDescriptor {
  code: string;
  failedField: string;
  failedValue: string;
  artifactPath: string;
  repairInstruction: string;
}

/**
 * §6 阻断原因 → 失败字段 / 产物路径 / 自动修复建议 的项目无关映射。
 * 仅按错误码前缀归类，不含任何具体品牌 / 行业 / 资产名。
 */
const BLOCKED_REASON_MAP: Record<string, Omit<BlockedReasonDescriptor, 'code' | 'failedValue'>> = {
  REFERENCE_IDENTITY_IN_STYLE_CARRIER: {
    failedField: 'styleCarrierRanking.contaminationTypes',
    artifactPath: 'reference/global-style-carrier-ranking.json',
    repairInstruction: '在 Ranking 前过滤参考品牌身份，仅保留抽象视觉规律。'
  },
  REFERENCE_SIGNATURE_GRAPHIC_IN_STYLE_CARRIER: {
    failedField: 'styleCarrierRanking.signatureGraphicIds',
    artifactPath: 'reference/reference-signature-graphics.json',
    repairInstruction: '将参考专属图形从 Style Carrier 中移除，仅继承其重复/密度/层级规律。'
  },
  REFERENCE_COPY_IN_STYLE_CARRIER: {
    failedField: 'styleCarrierRanking.contaminationTypes',
    artifactPath: 'reference/global-style-carrier-ranking.json',
    repairInstruction: '将参考文案 / 口号从 Style Carrier 中移除。'
  },
  REQUESTED_TASK_SUBSET_MISSING: {
    failedField: 'taskReferenceSubset.artifactPath',
    artifactPath: 'tasks/<output-type>/task-reference-subset.json',
    repairInstruction: '为当前请求任务重新执行任务参考筛选，生成真实 Task Reference Subset。'
  },
  TASK_STYLE_CARRIER_INCOMPATIBLE: {
    failedField: 'taskScopedStyleCarriers.requiredPrimary',
    artifactPath: 'tasks/<output-type>/task-scoped-style-carriers.json',
    repairInstruction: '按 outputType 与摄影/空间/动效约束重新编译 Task-Scoped Style Carriers。'
  },
  STRUCTURE_ONLY_ASSET_INVALID: {
    failedField: 'structurePolicy.confirmedAssetIds',
    artifactPath: 'current-project/structure-policy.json',
    repairInstruction: '未确认资产不得作为结构证据；解析为 open_for_redesign 或请用户确认。'
  },
  UNVERIFIED_STRUCTURE_MARKED_CONFIRMED: {
    failedField: 'structurePolicy.status',
    artifactPath: 'current-project/structure-policy.json',
    repairInstruction: '未确认结构不得标记为 confirmed；退回 open_for_redesign 或获取用户确认。'
  },
  UNVERIFIED_ASSET_ENTERED_GENERATION_PACK: {
    failedField: 'generationIdentityPack.assets',
    artifactPath: 'current-project/generation-identity-pack.json',
    repairInstruction: '未经核验的资产不得进入 Generation Identity Pack。'
  },
  AUDIT_BRIEF_TASK_MISMATCH: {
    failedField: 'generationContextManifest.outputType',
    artifactPath: 'generation/generation-context-manifest.json',
    repairInstruction: '统一审计报告与执行文档的 outputType 与 Task Subset。'
  },
  AUDIT_BRIEF_TASK_DEFINITION_MISMATCH: {
    failedField: 'generationTaskDefinition',
    artifactPath: 'generation/generation-brief.md',
    repairInstruction: '让审计报告与执行文档都声明一致的 Generation Task Definition。'
  }
};

function describe(code: string): Omit<BlockedReasonDescriptor, 'code' | 'failedValue'> {
  const [prefix] = code.split(':');
  return BLOCKED_REASON_MAP[prefix ?? code] || {
    failedField: prefix ?? code,
    artifactPath: 'validation/generation-readiness.json',
    repairInstruction: '请查看 Generation Readiness Gate 的阻断详情并修复对应产物。'
  };
}

/**
 * §6 blocked 状态生成阻断报告。
 * 只包含：最小身份摘要 / 阻断原因 / 失败字段和失败值 / 对应产物路径 / 自动修复建议。
 * 绝不输出可直接复制的 GPT Prompt、不完整的 Primary Style Carriers 或 Generation Task Definition。
 */
export function compileBlockedGenerationReport(input: {
  identityPack: GenerationIdentityPack;
  readiness: GenerationReadinessGate;
  /** §ValidationIssue 单一事实源；提供时阻断原因以其 rootIssues 为准，不再从 blockingReasons 反推。 */
  readinessResult?: GenerationReadinessResult;
}): string {
  const identity = [
    ...input.identityPack.identityFacts.map((item) => `${item.key || item.id}: ${item.value}`),
    ...input.identityPack.productOrServiceFacts.map((item) => `${item.key || item.id}: ${item.value}`)
  ];
  const identityLines = identity.length ? identity.map((line) => `- ${line}`).join('\n') : '- 无可用身份事实';

  let reasonsBlock: string;
  let derivedBlock = '';
  if (input.readinessResult) {
    const root = input.readinessResult.rootIssues.map((issue, index) => {
      const value = issue.receivedValue == null ? '（无具体值）' : JSON.stringify(issue.receivedValue);
      return [
        `### ${index + 1}. ${issue.code}`,
        `- 失败字段：${issue.path || '（无）'}`,
        `- 失败值：${value}`,
        `- 对应产物：${issue.artifactPath || '（无）'}`,
        `- 自动修复建议：${issue.repairInstruction || '请查看 Generation Readiness 阻断详情'}`,
        `- 自动可修复：${issue.autoRepairable ? '是' : '否'}`,
        issue.sourceValidator ? `- 来源校验器：${issue.sourceValidator}` : ''
      ].filter(Boolean).join('\n');
    }).join('\n\n');
    reasonsBlock = root || '- 无根因阻断项（但状态为 blocked，请检查单一事实源）';
    if (input.readinessResult.derivedIssues.length) {
      const derived = input.readinessResult.derivedIssues.map((issue, index) => [
        `### ${index + 1}. ${issue.code}`,
        `- 失败字段：${issue.path || '（无）'}`,
        `- 对应产物：${issue.artifactPath || '（无）'}`,
        `- 自动修复建议：${issue.repairInstruction || '由上游根因引发，修复根因后自动解除'}`
      ].join('\n')).join('\n\n');
      derivedBlock = `\n\n## 3. 下游衍生阻断（修复根因后自动解除）\n${derived}`;
    }
  } else {
    const reasons = input.readiness.blockingReasons.map((code, index) => {
      const descriptor = describe(code);
      const value = code.includes(':') ? code.slice(code.indexOf(':') + 1) : '（无具体值）';
      return [
        `### ${index + 1}. ${code}`,
        `- 失败字段：${descriptor.failedField}`,
        `- 失败值：${value}`,
        `- 对应产物：${descriptor.artifactPath}`,
        `- 自动修复建议：${descriptor.repairInstruction}`
      ].join('\n');
    }).join('\n\n');
    reasonsBlock = reasons || '- 无（但状态为 blocked，请检查校验器输入）';
  }

  return `# Generation Blocked Report

> 当前 Generation Readiness Gate 状态为 blocked，禁止生成可执行生图提示词。
> 请修复以下阻断项后重新运行闭环校验。

## 1. 当前项目最小身份摘要
${identityLines}

## 2. 阻断原因与修复建议（根因）
${reasonsBlock}${derivedBlock}
`;
}
