export const FINAL_AUDIT_PROMPT_VERSION = 'final-brand-dna-audit-prompt-v3.1';

export function buildFinalAuditPrompt(core, visual, compiledImageTasks, options = {}) {
  const stageId = options.recheck ? '07-final-audit-recheck' : '07-final-audit';
  const recheckContext = options.recheck ? `\n这是受限修复后的唯一复审。原问题：${JSON.stringify(options.previousIssues || [])}\n必须重新检查完整对象，不得仅凭已修补就判定 pass。` : '';
  return [{ role: 'user', content: `PROTOCOL_STAGE=${stageId}\nPROMPT_VERSION=${FINAL_AUDIT_PROMPT_VERSION}\n你是独立最终审计器。检查项目识别、证据边界、Functional/Capability 区分、创意命题统一性、视觉专属性、Logo/认证/Text Policy、任务重复、Prompt 可执行性和跨字段冲突。不得重生成任何对象，只返回精确问题 Path 和允许修复路径。无证据最高级、Logo/认证伪造、任务职责重复或 Prompt 与禁止项冲突均不得 pass。只返回 JSON。${recheckContext}\n\nCore Decision：${JSON.stringify(core.decision)}\nVisual System：${JSON.stringify(visual)}\nCompiled Prompts：${JSON.stringify(compiledImageTasks)}\n\n输出：{"finalAudit":{"status":"pass|needs-patch|fail","score":0,"dimensions":{"identityAccuracy":0,"evidenceBoundary":0,"strategicDepth":0,"geneDistinctiveness":0,"thesisCoverage":0,"visualDistinctiveness":0,"taskExecutability":0,"crossFieldConsistency":0},"issues":[{"issueId":"issue-N","severity":"critical|major|minor","path":"/json/path","reason":"string","allowedRepairPaths":["/json/path"]}]}}` }];
}
