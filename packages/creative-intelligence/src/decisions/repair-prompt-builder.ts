import type { RepairPlanBatch } from './contracts.ts';
import {
  stableValue,
  valueAtPath,
} from './path-utils.ts';

export interface RepairPrompt {
  prompt: string;
  evidence: Record<string, unknown>;
}

export function buildRepairPrompt(input: {
  batch: RepairPlanBatch;
  packet: unknown;
  attempt: number;
}): RepairPrompt {
  const evidence = Object.fromEntries(
    input.batch.evidencePaths.map((path) => [
      path,
      structuredClone(valueAtPath(input.packet, path)),
    ]),
  );
  const payload = JSON.stringify(stableValue(evidence), null, 2);
  const targets = input.batch.fieldPaths.map((path) => `- ${path}`).join('\n');
  const allowedRefs = input.batch.evidenceRefs.map((ref) => `- ${ref}`).join('\n');
  return {
    evidence,
    prompt: `你正在修复当前项目结构化分析中的缺失字段。

只输出以下字段：
${targets}

只能使用下方“当前项目证据”。禁止读取或借用任何外部项目、历史答案、评测基准、行业审美模板或未列出的事实。
禁止修改已有字段、项目身份、Locked Assets、真实产品、包装结构、医疗功效、法律声明或强制文案。

每个字段必须输出：
- path：必须与请求字段完全一致
- value：该字段的修复值
- status：只能是 inferred 或 proposed
- confidence：0 到 1
- evidenceRefs：只能从允许引用中选择，至少 1 项

只输出严格 JSON：
{
  "repairs": [
    {
      "path": "请求字段",
      "value": null,
      "status": "inferred",
      "confidence": 0.8,
      "evidenceRefs": ["允许引用"]
    }
  ]
}

允许引用：
${allowedRefs || '- 无可用引用；不得补齐，请返回空 repairs'}

当前项目证据：
${payload}

本次为 Repair Attempt ${input.attempt}。不得输出解释、Markdown 或未请求字段。`,
  };
}
