import path from "node:path";
import { isUsableProjectName } from "./project-intake.js";
const WINDOWS_FORBIDDEN = /[<>:"/\\|?*\u0000-\u001F]/g;
const ASSET_DECISIONS = /* @__PURE__ */ new Set(["\u4FDD\u7559", "\u5347\u7EA7", "\u66FF\u6362", "\u5220\u9664", "\u65B0\u589E"]);
const DECISION_COMBINATORS = /[／/并且和与及、,，+＋]/gu;
function isValidAssetDecision(value) {
  const normalized = value.trim().replace(/／/gu, "/").replace(/\s+/gu, "");
  const parts = normalized.replace(DECISION_COMBINATORS, "/").split("/");
  return parts.length > 0 && parts.every((part) => ASSET_DECISIONS.has(part));
}
function sanitizeFilenamePart(value) {
  const safe = String(value || "").trim().replace(WINDOWS_FORBIDDEN, "-").replace(/\s+/g, " ").replace(/-+/g, "-").replace(/^[-. ]+|[-. ]+$/g, "");
  return safe || "\u672A\u547D\u540D";
}
function buildReportFilename(projectName, modelName, language = "zh-CN") {
  const safeProject = sanitizeFilenamePart(projectName);
  const safeModel = sanitizeFilenamePart(modelName);
  return language === "en" ? `${safeProject}-Creative-Upgrade-Report-${safeModel}.md` : `${safeProject}-\u89C6\u89C9\u65B9\u6848\u5347\u7EA7\u62A5\u544A-${safeModel}.md`;
}
function buildFusionEnhancedTask(description, provisionalProjectName = "") {
  return `${description.trim() || "\u6DF1\u5EA6\u5BA1\u8BA1\u73B0\u6709\u89C6\u89C9\u65B9\u6848\u5E76\u63D0\u51FA\u552F\u4E00\u3001\u53EF\u6267\u884C\u7684\u89C6\u89C9\u5347\u7EA7\u65B9\u5411"}

\u5206\u6790\u914D\u7F6E\uFF1AFusion Enhanced\u3002\u53EA\u8C03\u7528\u4E00\u6B21\u6A21\u578B\uFF0C\u76F4\u63A5\u8F93\u51FA\u878D\u5408\u589E\u5F3A\u62A5\u544A\u3002
- \u5FC5\u987B\u4F18\u5148\u4ECE\u89C6\u89C9\u5185\u5BB9\u3001Logo / \u54C1\u724C\u89C4\u8303\u9875\u3001PDF \u5C01\u9762\u6216\u9AD8\u9891\u54C1\u724C\u6587\u5B57\u8BC6\u522B\u771F\u5B9E\u9879\u76EE\u540D\u79F0\uFF0C\u5E76\u628A\u62A5\u544A\u7B2C\u4E00\u884C\u5199\u4E3A\u201C# \u771F\u5B9E\u9879\u76EE\u540D\u79F0\u89C6\u89C9\u65B9\u6848\u5347\u7EA7\u62A5\u544A\u201D\u3002
- \u201C${provisionalProjectName || "\u5F53\u524D\u4E34\u65F6\u9879\u76EE\u540D\u79F0"}\u201D\u4EC5\u662F\u672C\u5730\u5BFC\u5165\u9636\u6BB5\u7684\u4E34\u65F6\u7EBF\u7D22\uFF0C\u4E0D\u5F97\u8986\u76D6\u89C6\u89C9\u5185\u5BB9\u4E2D\u660E\u786E\u51FA\u73B0\u7684\u771F\u5B9E\u540D\u79F0\u3002
- \u4E0D\u5F97\u628A input\u3001images\u3001assets\u3001visual\u3001upload\u3001project\u3001\u672A\u547D\u540D\u7B49\u901A\u7528\u6587\u4EF6\u540D\u4F5C\u4E3A\u54C1\u724C\u6216\u9879\u76EE\u540D\u79F0\u3002
- \u4E0D\u5F97\u628A\u8BBE\u8BA1\u516C\u53F8\u6216\u4F5C\u54C1\u96C6\u5E73\u53F0\u6C34\u5370\u3001Mockup \u6A21\u677F\u540D\u3001\u8F6F\u4EF6\u754C\u9762\u6587\u5B57\u3001\u9875\u7801\u3001\u6587\u4EF6\u7F16\u53F7\u3001\u8BBE\u8BA1\u5E08\u7F72\u540D\u4F5C\u4E3A\u9879\u76EE\u540D\u79F0\uFF1B\u65E0\u6CD5\u4ECE\u7D20\u6750\u53EF\u9760\u8BC6\u522B\u65F6\u4FDD\u7559\u4E34\u65F6\u540D\u79F0\uFF0C\u4E0D\u5F97\u81EA\u884C\u521B\u9020\u3002
- \u9879\u76EE\u5143\u6570\u636E\u4E2D\u7684\u54C1\u724C\u4E0E\u884C\u4E1A\u6765\u81EA\u4E0A\u4F20\u7D20\u6750\u81EA\u52A8\u8BC6\u522B\uFF1B\u9AD8\u7F6E\u4FE1\u5EA6\u7EBF\u7D22\u4F5C\u4E3A\u4E8B\u5B9E\u8FB9\u754C\uFF0C\u4F4E\u7F6E\u4FE1\u5EA6\u7EBF\u7D22\u5FC5\u987B\u660E\u786E\u6807\u8BB0\u201C\u57FA\u4E8E\u73B0\u6709\u7D20\u6750\u63A8\u65AD\u201D\u6216\u201C\u5F85\u786E\u8BA4\u201D\uFF0C\u4E0D\u5F97\u7F16\u9020\u3002
- \u5F3A\u5316\u884C\u4E1A\u7406\u89E3\u3001\u771F\u5B9E\u4E1A\u52A1\u89E6\u70B9\u3001\u5408\u89C4\u8FB9\u754C\u3001\u8D44\u4EA7\u53D6\u820D\u3001\u552F\u4E00\u89C6\u89C9\u547D\u9898\u4E0E\u56FE\u7247\u804C\u8D23\u3002
- \u540C\u65F6\u628A\u6750\u8D28\u3001\u5FAE\u7ED3\u6784\u3001\u8D1F\u5F62\u3001\u89E6\u89C9\u5DE5\u827A\u3001\u538B\u7EB9\u3001\u8680\u523B\u3001\u55B7\u7802\u3001\u900F\u660E\u5206\u5C42\u3001\u5149\u7EBF\u548C\u8868\u9762\u7EC6\u8282\u8F6C\u8BD1\u4E3A\u53EF\u6267\u884C\u52A8\u4F5C\u3002
- \u4E0D\u5F97\u5148\u751F\u6210\u591A\u4EFD\u62A5\u544A\u518D\u878D\u5408\uFF0C\u4E0D\u5F97\u8FFD\u52A0\u7B2C\u4E8C\u6B21\u603B\u7ED3\u6216\u6A21\u578B\u88C1\u51B3\u3002`;
}
function extractProjectNameFromReport(markdown) {
  const heading = String(markdown || "").match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() || "";
  const candidate = heading.replace(/[\s|｜·:：—-]*(?:视觉方案升级报告|Creative Upgrade Report)\s*$/i, "").replace(/^(?:项目名称|项目|品牌名称|品牌)\s*[:：]\s*/i, "").replace(/^[《「『【\[]+|[》」』】\]]+$/g, "").trim();
  return isUsableProjectName(candidate) ? candidate : null;
}
function analysisFactualConstraints(industry, lockedFacts, industryConfidence = 1) {
  const industryConstraint = industryConfidence >= 0.75 ? `\u884C\u4E1A\u7EBF\u7D22\u201C${industry.trim()}\u201D\u6765\u81EA\u73B0\u6709\u7D20\u6750\u81EA\u52A8\u8BC6\u522B\uFF08\u7F6E\u4FE1\u5EA6 ${industryConfidence.toFixed(2)}\uFF09\uFF0C\u5206\u6790\u4E0D\u5F97\u64C5\u81EA\u6539\u5199\uFF0C\u5E76\u987B\u8BF4\u660E\u8BC6\u522B\u6765\u6E90\u3002` : "\u73B0\u6709\u7D20\u6750\u4E0D\u8DB3\u4EE5\u53EF\u9760\u786E\u8BA4\u884C\u4E1A\u5C5E\u6027\uFF1B\u62A5\u544A\u5FC5\u987B\u4F7F\u7528\u201C\u57FA\u4E8E\u73B0\u6709\u7D20\u6750\u63A8\u65AD\u201D\u6216\u201C\u5F85\u786E\u8BA4\u201D\uFF0C\u4E0D\u5F97\u5C06\u884C\u4E1A\u731C\u6D4B\u5199\u6210\u786E\u5B9A\u4E8B\u5B9E\u3002";
  return [
    industryConstraint,
    ...lockedFacts.map((item) => item.trim()).filter(Boolean)
  ];
}
function normalizeReportTitle(markdown, projectName, language = "zh-CN") {
  const title = language === "en" ? `# ${projectName} Creative Upgrade Report` : `# ${projectName}\u89C6\u89C9\u65B9\u6848\u5347\u7EA7\u62A5\u544A`;
  const value = String(markdown || "").trim();
  return /^#\s+.+$/m.test(value) ? value.replace(/^#\s+.+$/m, title) + "\n" : `${title}

${value}
`;
}
function validateVisualUpgradeMarkdown(markdown) {
  const required = Array.from({ length: 11 }, (_, index) => `## ${index}.`);
  const missing = required.filter((heading) => !markdown.includes(heading));
  if (missing.length) throw new Error(`Markdown \u6821\u9A8C\u5931\u8D25\uFF1A\u7F3A\u5C11\u7AE0\u8282 ${missing.join("\u3001")}`);
  if (!markdown.includes("\u552F\u4E00\u89C6\u89C9\u5347\u7EA7\u547D\u9898")) throw new Error("Markdown \u6821\u9A8C\u5931\u8D25\uFF1A\u7F3A\u5C11\u552F\u4E00\u89C6\u89C9\u5347\u7EA7\u547D\u9898");
  const decisionSection = markdown.match(/## 3\.\s*视觉资产决策([\s\S]*?)(?=\n## 4\.|$)/u)?.[1] || "";
  const decisionRows = decisionSection.split(/\r?\n/u).flatMap((line) => {
    if (!/^\s*\|.*\|\s*$/u.test(line) || /^\s*\|[\s:|-]+\|\s*$/u.test(line)) return [];
    const cells = line.split("|").slice(1, -1).map((cell) => cell.replace(/\*\*/gu, "").trim());
    if (cells[0] === "\u89C6\u89C9\u8D44\u4EA7" || cells.length < 2) return [];
    return [{ asset: cells[0] || "", decision: cells[1] || "" }];
  });
  if (!decisionRows.length) {
    throw new Error("Markdown \u6821\u9A8C\u5931\u8D25\uFF1A\u89C6\u89C9\u8D44\u4EA7\u51B3\u7B56\u8868\u4E3A\u7A7A\u6216\u683C\u5F0F\u65E0\u6548");
  }
  const invalid = decisionRows.filter((row) => !isValidAssetDecision(row.decision));
  if (invalid.length) {
    throw new Error(`Markdown \u6821\u9A8C\u5931\u8D25\uFF1A\u8D44\u4EA7\u51B3\u7B56\u503C\u65E0\u6548 ${invalid.map((row) => `${row.asset}:${row.decision}`).join("\u3001")}`);
  }
}
function assertInside(parent, target) {
  const resolvedParent = path.resolve(parent);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedParent, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("\u76EE\u6807\u8DEF\u5F84\u8D85\u51FA\u9879\u76EE\u6570\u636E\u76EE\u5F55");
  return resolvedTarget;
}
function redactSecret(message, secret) {
  const value = String(message || "\u672A\u77E5\u9519\u8BEF");
  return secret ? value.split(secret).join("[REDACTED]") : value;
}
export {
  analysisFactualConstraints,
  assertInside,
  buildFusionEnhancedTask,
  buildReportFilename,
  extractProjectNameFromReport,
  normalizeReportTitle,
  redactSecret,
  sanitizeFilenamePart,
  validateVisualUpgradeMarkdown
};
