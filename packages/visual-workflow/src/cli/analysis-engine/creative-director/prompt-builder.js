import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const PROMPT_ROOT = fileURLToPath(new URL("../../../../prompts/analysis/", import.meta.url));
const PROMPT_FILES = Object.freeze({
  system: "deep-creative-director.md",
  benchmark: "benchmark-instructions.md",
  executionCore: "execution-core-template.md",
  reportSchema: "report-schema.md"
});
let templateCache = null;
async function loadTemplates() {
  if (!templateCache) {
    templateCache = Object.freeze(Object.fromEntries(await Promise.all(
      Object.entries(PROMPT_FILES).map(async ([key, filename]) => [
        key,
        (await fs.readFile(path.join(PROMPT_ROOT, filename), "utf8")).trim()
      ])
    )));
  }
  return templateCache;
}
function json(value) {
  return JSON.stringify(value, null, 2);
}
function renderProjectInput(context) {
  const { config, projectName } = context;
  return `## Project Input

${json({
    projectName,
    brandName: config.brandFacts.brandName,
    industry: config.brandFacts.industry,
    userTask: config.userTask || "\u57FA\u4E8E\u5168\u90E8\u89C6\u89C9\u8D44\u4EA7\u5B8C\u6210\u54C1\u724C\u89C6\u89C9\u7CFB\u7EDF\u5BA1\u8BA1\u4E0E\u5347\u7EA7",
    requiredApplications: config.overrides.requiredApplications
  })}`;
}
function renderManifest(inventory, visualPreparation) {
  const assets = inventory.items.map((item, index) => ({
    assetId: `asset-${String(index + 1).padStart(3, "0")}`,
    path: item.path,
    type: item.type,
    extension: item.extension,
    bytes: item.bytes,
    isImage: item.isImage,
    detail: item.detail,
    warning: item.warning
  }));
  const preparation = visualPreparation ? {
    fingerprint: visualPreparation.fingerprint,
    strategy: visualPreparation.strategy,
    contactSheet: visualPreparation.contactSheetPath ? "contact-sheet" : null,
    priorityAssetIds: visualPreparation.priorityAssetIds,
    attachmentCount: visualPreparation.attachmentCount,
    instruction: "\u5148\u6574\u4F53\u9605\u8BFB Contact Sheet\uFF0C\u518D\u7CBE\u8BFB priorityAssetIds\uFF1B\u8D44\u4EA7\u51B3\u7B56\u4ECD\u987B\u8986\u76D6\u5B8C\u6574 index\uFF0C\u4E0D\u5F97\u628A\u672A\u5355\u72EC\u9644\u52A0\u7684\u56FE\u7247\u89C6\u4E3A\u672A\u63D0\u4F9B\u3002"
  } : null;
  return {
    markdown: `## Asset Manifest

\u4F60\u5FC5\u987B\u67E5\u770B\u6E05\u5355\u4E2D\u7684\u5168\u90E8\u53EF\u8BFB\u89C6\u89C9\u8D44\u4EA7\u3002\u91CD\u590D Mockup \u53EA\u4F5C\u4E3A\u91CD\u590D\u8BC1\u636E\uFF0C\u4E0D\u5F97\u63D0\u9AD8\u76F8\u5173\u5143\u7D20\u7684\u4FDD\u7559\u6743\u91CD\u3002\u4E0D\u53EF\u8BFB\u6587\u4EF6\u5FC5\u987B\u660E\u786E\u5199\u5165\u5BA1\u8BA1\u8303\u56F4\uFF0C\u4E0D\u5F97\u731C\u6D4B\u5185\u5BB9\u3002

${json({ totalFiles: inventory.totalFiles, imageCount: inventory.imageCount, preparation, assets })}`,
    assets
  };
}
function renderConstraints(config) {
  const logoRule = config.overrides.allowLogoRedesign ? "\u7528\u6237\u5DF2\u663E\u5F0F\u6388\u6743\u672C\u9879\u76EE\u8FDB\u884C Logo \u91CD\u8BBE\u8BA1\uFF1B\u4ECD\u4E0D\u5F97\u4F2A\u9020\u54C1\u724C\u540D\u79F0\u6216\u5BA2\u89C2\u4E8B\u5B9E\u3002" : "\u539F\u59CB Logo Locked\uFF1A\u4E0D\u5F97\u4FEE\u6539\u3001\u91CD\u7ED8\u3001\u62C6\u89E3\u3001\u91CD\u7EC4\u3001\u66FF\u6362\u6216\u6539\u53D8\u5185\u90E8\u5B57\u5F62\u3002";
  return `## Explicit User Constraints

- ${logoRule}
- Creative Authority\uFF1AMaximum\u3002
- \u9664 Logo\u3001\u5BA2\u89C2\u4E8B\u5B9E\u53CA\u4E0B\u5217\u663E\u5F0F\u9501\u5B9A\u9879\u5916\uFF0C\u5168\u90E8\u89C6\u89C9\u8D44\u4EA7\u90FD\u53EF\u4FDD\u7559\u3001\u5347\u7EA7\u3001\u66FF\u6362\u3001\u5220\u9664\u6216\u65B0\u589E\u3002

${json({
    factualConstraints: config.brandFacts.factualConstraints,
    logoAssets: config.brandFacts.logoAssets,
    additionalLockedAssets: config.overrides.additionalLockedAssets,
    forbiddenChanges: config.overrides.forbiddenChanges,
    requiredApplications: config.overrides.requiredApplications
  })}`;
}
function attachments(inventory) {
  return inventory.items.map((item, index) => Object.freeze({
    assetId: `asset-${String(index + 1).padStart(3, "0")}`,
    path: path.resolve(inventory.root, item.path),
    mediaType: item.isImage ? "image" : "document",
    readable: !item.warning
  }));
}
function renderPreparedBenchmarks(benchmarkPreparation) {
  if (!benchmarkPreparation) return "";
  return `## Prepared Benchmark Context

\u4EE5\u4E0B\u5185\u5BB9\u6765\u81EA\u53D7\u9650\u7684\u9879\u76EE\u914D\u7F6E\u6216\u884C\u4E1A\u7F13\u5B58\u3002\u53EA\u63D0\u53D6\u4E0E\u5F53\u524D\u8BBE\u8BA1\u95EE\u9898\u76F8\u5173\u7684\u53EF\u8FC1\u79FB\u539F\u5219\uFF1B\u4E0D\u5F97\u4E3A\u51D1\u6570\u91CF\u7EE7\u7EED\u6269\u5C55\u540D\u5355\u3002

${json({
    category: benchmarkPreparation.category,
    creativeExcellence: benchmarkPreparation.creativeExcellence
  })}`;
}
async function buildDeepCreativeDirectorPrompt(context) {
  if (!context?.inventory || !context?.config) throw new Error("Prompt Builder \u7F3A\u5C11 inventory \u6216 analysis config");
  const templates = await loadTemplates();
  const manifest = renderManifest(context.inventory, context.visualPreparation);
  const userSections = [
    renderProjectInput(context),
    manifest.markdown,
    renderConstraints(context.config),
    templates.benchmark,
    renderPreparedBenchmarks(context.benchmarkPreparation),
    "## GPT Execution Core Contract\n\nExecution Core \u5FC5\u987B\u4F4D\u4E8E\u62A5\u544A\u6700\u524D\u90E8\u5E76\u63A7\u5236\u5728\u7EA6 600\uFF5E1,200 \u4E2D\u6587\u5B57\u3002\u4E0D\u5F97\u628A\u5B8C\u6574\u5206\u6790\u590D\u5236\u8FDB Core\u3002\n\n" + templates.executionCore,
    `## Report Budget

\u6574\u4EFD\u62A5\u544A\u76EE\u6807\u4E3A 6,000\uFF5E${context.config.performance.maxReportCharacters.toLocaleString("en-US")} \u4E2A\u4E2D\u6587\u5B57\u7B26\u3002\u4F18\u5148\u5220\u9664\u91CD\u590D\u89E3\u91CA\uFF0C\u4E0D\u5F97\u727A\u7272\u8D44\u4EA7\u51B3\u7B56\u3001\u89C6\u89C9\u7CFB\u7EDF\u6216\u5E94\u7528\u52A8\u4F5C\u3002`,
    "## Required Report Schema\n\n\u4E25\u683C\u4F7F\u7528\u4EE5\u4E0B\u7AE0\u8282\u987A\u5E8F\u548C\u6807\u9898\uFF0C\u4E0D\u5F97\u65B0\u589E\u7B2C\u4E8C\u4EFD\u6587\u6863\uFF1A\n\n" + templates.reportSchema
  ].filter(Boolean);
  const messages = Object.freeze([
    Object.freeze({ role: "system", content: templates.system }),
    Object.freeze({ role: "user", content: userSections.join("\n\n---\n\n") })
  ]);
  const attachmentList = context.visualPreparation?.attachments || Object.freeze(attachments(context.inventory));
  const canonical = JSON.stringify({ messages, attachments: attachmentList });
  return Object.freeze({
    contractVersion: "5.0.0",
    modelCalls: 1,
    messages,
    attachments: attachmentList,
    sections: Object.freeze(["projectInput", "assetManifest", "explicitConstraints", "benchmark", "executionCore", "reportBudget", "reportSchema"]),
    promptDigest: crypto.createHash("sha256").update(canonical).digest("hex")
  });
}
function clearPromptTemplateCache() {
  templateCache = null;
}
export {
  buildDeepCreativeDirectorPrompt,
  clearPromptTemplateCache
};
