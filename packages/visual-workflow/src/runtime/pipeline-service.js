import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  completeStructuredAnalysis
} from "../analysis-decisions/core/visual-analysis-core.js";
import {
  normalizeSpatialFunctionalValue,
  validateSpatialSemantics
} from "../generation-runtime/core/space-generation-core.js";
import {
  buildFusionEnhancedTask,
  buildReportFilename,
  analysisFactualConstraints,
  extractProjectNameFromReport,
  normalizeReportTitle,
  redactSecret,
  validateVisualUpgradeMarkdown
} from "./analysis-contract.js";
import {
  compileProjectVisualContext,
  writeProjectVisualContext,
  PROJECT_VISUAL_CONTEXT_SCHEMA_VERSION
} from "./project-visual-context-compiler.js";
import {
  buildProjectVisualContext,
  writeProjectVisualContext as writeStructuredProjectVisualContext
} from "./project-visual-context-builder.js";
import {
  buildUnifiedVisualUnderstandingPrompt,
  normalizeUnifiedVisualUnderstanding
} from "./unified-visual-understanding.js";
import {
  visualDecisionPacketToPromptSourceObject
} from "./visual-decision-packet.js";
import { compileVisualDecisionReport } from "./visual-decision-report-compiler.js";
import { createAnalysisRepairStore } from "./analysis-repair-store.js";
import { isAnalysisSourceAsset } from "./project-assets.js";
import {
  throwForValidationIssues
} from "./model-schema/validation-issues.js";
import { createDefaultAnalysisProviderRegistry } from "../model-runtime/analysis-provider-registry.js";
import { parseStructuredResponse } from "../model-runtime/response-parser.js";
function configurePromptRoot() {
}
function providerLabel(provider) {
  return provider.trim() || "openai-compatible";
}
function combineSignals(first, second) {
  if (typeof AbortSignal.any === "function") return AbortSignal.any([first, second]);
  const controller = new AbortController();
  const abort = () => controller.abort();
  first.addEventListener("abort", abort, { once: true });
  second.addEventListener("abort", abort, { once: true });
  return controller.signal;
}
function friendlyPipelineError(error, apiKey) {
  const message = redactSecret(error.message, apiKey).replace(/^Qwen 请求失败：\s*/i, "");
  if (/401|403|API Key|unauthorized|forbidden/i.test(message)) return "API Key \u65E0\u6548\u6216\u65E0\u6743\u8BBF\u95EE\u5F53\u524D\u6A21\u578B";
  if (/404|model.*not found|does not exist/i.test(message)) return "Model ID \u6216 Base URL \u4E0D\u5B58\u5728";
  if (/image|vision|multimodal/i.test(message) && /support|不支持/i.test(message)) return "\u5F53\u524D\u6A21\u578B\u4E0D\u652F\u6301\u56FE\u7247\u8F93\u5165";
  if (/TIME_BUDGET_EXCEEDED|超时|aborted|abort/i.test(message)) return "\u5206\u6790\u8D85\u65F6\u6216\u5DF2\u88AB\u53D6\u6D88";
  if (/empty|空报告/i.test(message)) return "\u6A21\u578B\u8FD4\u56DE\u7A7A\u5185\u5BB9\uFF0C\u672A\u751F\u6210\u62A5\u544A";
  return message;
}
function sanitizeSpatialSemanticsDeterministically(packet, findings) {
  const spatial = packet.mediaTranslations?.spatial ?? {};
  const next = structuredClone(packet);
  const fieldIndices = (field) => {
    const set = /* @__PURE__ */ new Set();
    for (const finding of findings ?? []) {
      const path2 = typeof finding === "object" && finding !== null ? finding.path : void 0;
      const match = String(path2 ?? "").match(new RegExp(`${field}\\[(\\d+)\\]`, "u"));
      if (match) set.add(Number(match[1]));
    }
    return set;
  };
  const filterField = (field, values) => {
    const drop = fieldIndices(field);
    return values.map((item, index) => drop.has(index) ? null : item).filter((item) => typeof item === "string" && Boolean(item.trim())).map((item) => normalizeSpatialFunctionalValue(item.trim(), field)).filter((item) => typeof item === "string" && Boolean(item));
  };
  next.mediaTranslations.spatial.functionalNetwork = filterField("functionalNetwork", spatial.functionalNetwork ?? []);
  next.mediaTranslations.spatial.functionalRelationships = filterField("functionalRelationships", spatial.functionalRelationships ?? []);
  next.mediaTranslations.spatial.mustBeVisible = filterField("mustBeVisible", spatial.mustBeVisible ?? []);
  const result = validateSpatialSemantics(next.mediaTranslations.spatial);
  return {
    packet: next,
    pass: result.status === "pass",
    findings: result.findings ?? []
  };
}
function parseModelStructuredResponse(rawResponse) {
  const stripped = rawResponse.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  try {
    return parseStructuredResponse(stripped);
  } catch (error) {
    const trimmed = rawResponse.trim();
    const likelyTruncated = /^[{[]/u.test(trimmed) && !/[}\]]$/u.test(trimmed);
    throwForValidationIssues([{
      path: "$",
      issueType: likelyTruncated ? "truncated" : "json_parse_error",
      receivedValue: rawResponse.slice(0, 200),
      message: likelyTruncated ? "\u6A21\u578B\u8F93\u51FA\u5728 JSON \u5B8C\u6210\u524D\u88AB\u622A\u65AD\u3002" : `\u6A21\u578B\u8F93\u51FA\u4E0D\u662F\u53EF\u89E3\u6790\u7684 JSON\uFF1A${error.message}`,
      validExamples: [{ field: "value" }],
      repairInstruction: "\u91CD\u65B0\u8F93\u51FA\u5B8C\u6574\u3001\u95ED\u5408\u4E14\u53EF\u76F4\u63A5\u89E3\u6790\u7684\u88F8 JSON\uFF1B\u4E0D\u8981\u9644\u52A0\u89E3\u91CA\u3002",
      severity: "blocking"
    }]);
    throw error;
  }
}
function preservePipelineError(error, apiKey) {
  return Object.assign(new Error(friendlyPipelineError(error, apiKey)), {
    code: error.code,
    issues: error.issues,
    details: error.details,
    structuredStep: error.structuredStep,
    structuredAttempts: error.structuredAttempts
  });
}
function createPipelineService(projects, readCredentials, readSettings, emitProgress, runtime, analysisProviders = createDefaultAnalysisProviderRegistry()) {
  const active = /* @__PURE__ */ new Map();
  async function start(projectId, forceReasoning = true, apiProfileId, validationMode = "visual_upgrade") {
    if (active.has(projectId)) throw new Error("\u8BE5\u9879\u76EE\u6B63\u5728\u5206\u6790\u4E2D");
    const summary = await projects.scan(projectId);
    const project = await projects.get(projectId);
    const analysisItems = summary.items.filter((item) => item.usage === "analysis_source");
    const analysisImageCount = analysisItems.filter((item) => item.kind === "image").length;
    const analysisPdfCount = analysisItems.filter((item) => item.kind === "pdf").length;
    if (!analysisItems.length) throw new Error("\u9879\u76EE\u7D20\u6750\u4E3A\u7A7A\uFF0C\u8BF7\u5148\u4E0A\u4F20\u89C6\u89C9\u65B9\u6848");
    if (analysisImageCount + analysisPdfCount === 0) throw new Error("\u9879\u76EE\u4E2D\u6CA1\u6709\u53EF\u5206\u6790\u7684\u56FE\u7247\u6216 PDF");
    if (!project.logoLocked) throw new Error("\u5F53\u524D\u5206\u6790\u6A21\u5F0F\u8981\u6C42\u539F\u59CB Logo \u9ED8\u8BA4\u9501\u5B9A");
    if (project.outputLanguage !== "zh-CN") throw new Error("\u5F53\u524D\u5206\u6790\u6A21\u5F0F\u56FA\u5B9A\u8F93\u51FA\u7B80\u4F53\u4E2D\u6587");
    const credentials = await readCredentials(apiProfileId || project.apiProfileId || void 0);
    const settings = await readSettings();
    const projectPaths = await projects.paths(projectId);
    const controller = new AbortController();
    const startedAt = (/* @__PURE__ */ new Date()).toISOString();
    const started = performance.now();
    let currentStage = "preparing-assets";
    active.set(projectId, { controller, startedAt });
    const progress = (stage, message, extra = {}) => {
      currentStage = stage;
      emitProgress({
        projectId,
        stage,
        message,
        startedAt,
        elapsedMs: Math.round(performance.now() - started),
        assetCount: analysisItems.length,
        model: credentials.model,
        ...extra
      });
    };
    await projects.update(projectId, {
      status: "running",
      provider: credentials.provider,
      model: credentials.model,
      apiProfileId: credentials.profileId,
      lastError: null
    });
    const configPath = path.join(projectPaths.runtime, "masterpiece-os-v5.json");
    try {
      progress("preparing-assets", "\u6B63\u5728\u6574\u7406\u89C6\u89C9\u7D20\u6750", {
        cacheStatus: forceReasoning ? "forced" : "checking"
      });
      progress("extracting-project-facts", "\u6B63\u5728\u8BC6\u522B\u9879\u76EE\u4E0E\u54C1\u724C\u4FE1\u606F");
      const config = {
        version: "5.0",
        projectName: project.projectName,
        userTask: buildFusionEnhancedTask(project.description, project.projectName),
        brandFacts: {
          brandName: project.brandName,
          industry: project.industry,
          detectedBrandName: project.detectedBrandName,
          detectedIndustry: project.detectedIndustry,
          factConfidence: project.factConfidence,
          factualConstraints: analysisFactualConstraints(project.industry, project.lockedFacts, project.factConfidence.industry),
          logoAssets: project.logoFiles
        },
        benchmarkContext: { category: [], creativeExcellence: [] },
        performance: {
          targetMinutes: 10,
          maximumMinutes: 15,
          maxDetailAssets: 5,
          maxReportCharacters: 8e3,
          enablePreparationCache: settings.cacheEnabled
        },
        overrides: {
          additionalLockedAssets: [],
          allowLogoRedesign: false,
          requiredApplications: [],
          forbiddenChanges: project.lockedFacts,
          outputLanguage: project.outputLanguage
        }
      };
      await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}
`, "utf8");
      configurePromptRoot(runtime);
      progress("building-contact-sheet", "\u6B63\u5728\u751F\u6210\u89C6\u89C9\u603B\u89C8");
      const baseReasoner = analysisProviders.createReasoner(credentials);
      const reasoner = async (context) => {
        progress("building-prompt", "\u6B63\u5728\u6784\u5EFA\u5206\u6790\u4EFB\u52A1");
        await Promise.resolve();
        progress("reasoning", "\u6B63\u5728\u6267\u884C\u6DF1\u5EA6\u521B\u610F\u5BFC\u6F14\u5206\u6790", {
          cacheStatus: forceReasoning ? "forced" : "miss"
        });
        const supplied = await baseReasoner({
          ...context,
          signal: combineSignals(context.signal, controller.signal)
        });
        progress("generating-report", "\u6B63\u5728\u751F\u6210\u89C6\u89C9\u65B9\u6848\u5347\u7EA7\u62A5\u544A");
        return { ...supplied, provider: providerLabel(credentials.provider) };
      };
      const { runAnalysisPipeline } = await import("../cli/analysis-engine/bootstrap.js");
      const execution = await runAnalysisPipeline(projectPaths.input, {
        projectRoot: projectPaths.root,
        output: projectPaths.outputs,
        config: configPath,
        deepCreativeDirectorReasoner: reasoner,
        forceReasoning,
        preparationCacheRoot: path.join(projectPaths.prepared, "visual"),
        benchmarkCacheRoot: path.join(projectPaths.prepared, "benchmarks")
      });
      if (controller.signal.aborted) throw new DOMException("\u7528\u6237\u4E3B\u52A8\u53D6\u6D88", "AbortError");
      progress("validating-output", "\u6B63\u5728\u6821\u9A8C\u62A5\u544A");
      const coreReportPath = path.join(projectPaths.outputs, execution.result.outputFile);
      const rawReport = await fs.readFile(coreReportPath, "utf8");
      const finalProjectName = project.projectName || extractProjectNameFromReport(rawReport) || project.brandName || "\u672A\u547D\u540D\u9879\u76EE";
      const legacyReport = normalizeReportTitle(rawReport, finalProjectName, project.outputLanguage);
      if (validationMode === "visual_upgrade") validateVisualUpgradeMarkdown(legacyReport);
      else if (!legacyReport.trim()) throw new Error("\u53C2\u8003\u89C6\u89C9\u5206\u6790\u7ED3\u679C\u4E3A\u7A7A");
      const reportFilename = buildReportFilename(finalProjectName, credentials.model, project.outputLanguage);
      const reportPath = path.join(projectPaths.outputs, reportFilename);
      let report = legacyReport;
      let promptSourceObject;
      let visualDecisionPacket;
      let promptSourceModelCallCount = 0;
      let promptSourceRunId;
      let analysisRepairRunId;
      let analysisRepairAttempts = 0;
      let analysisRepairStatus;
      const promptSourceProject = {
        ...project,
        projectName: finalProjectName,
        brandName: project.brandName || finalProjectName
      };
      const promptSourceAssets = (project.assets || []).filter((asset) => isAnalysisSourceAsset(asset) && asset.status === "ready" && /^image\//iu.test(asset.mimeType)).slice(0, 30);
      if (promptSourceAssets.length) {
        const prompt = buildUnifiedVisualUnderstandingPrompt(
          promptSourceProject,
          promptSourceAssets.map((asset) => asset.id)
        );
        const attachments = promptSourceAssets.map((asset) => ({
          assetId: asset.id,
          path: path.join(projectPaths.input, asset.relativePath),
          mediaType: "image",
          format: path.extname(asset.relativePath).slice(1),
          readable: true
        }));
        progress("validating-output", "\u6B63\u5728\u63D0\u53D6\u751F\u56FE\u9879\u76EE\u8BED\u4E49");
        const uvuMaxAttempts = 3;
        let uvuResponse = null;
        let uvuExtracted;
        let uvuParseError;
        let uvuRepairHint = "";
        for (let attempt = 1; attempt <= uvuMaxAttempts; attempt += 1) {
          promptSourceModelCallCount += 1;
          uvuResponse = await baseReasoner({
            prompt: {
              messages: [
                {
                  role: "system",
                  content: "\u4F60\u662F Unified Visual Understanding \u5F15\u64CE\u3002\u53EA\u57FA\u4E8E ProjectRecord \u4E0E\u539F\u59CB\u89C6\u89C9\u9644\u4EF6\u8FD4\u56DE\u4E25\u683C JSON\uFF0C\u4E0D\u8BFB\u53D6\u6216\u590D\u8FF0\u5206\u6790\u62A5\u544A\u3002"
                },
                { role: "user", content: `${prompt}${uvuRepairHint}` }
              ],
              attachments
            },
            signal: controller.signal,
            maximumDurationMs: 15 * 6e4
          });
          try {
            uvuExtracted = parseModelStructuredResponse(uvuResponse.reportMarkdown);
            break;
          } catch (error) {
            uvuParseError = error;
            const failureRoot = path.join(projectPaths.runtime, "uvu-failures");
            await fs.mkdir(failureRoot, { recursive: true }).catch(() => void 0);
            await fs.writeFile(
              path.join(failureRoot, `uvu-attempt-${attempt}-${Date.now()}.json`),
              `${JSON.stringify({
                runId: uvuResponse.runId,
                model: credentials.model,
                error: uvuParseError.message,
                raw: uvuResponse.reportMarkdown
              }, null, 2)}
`,
              "utf8"
            ).catch(() => void 0);
            if (attempt >= uvuMaxAttempts) break;
            uvuRepairHint = `

\u4E0A\u4E00\u6B21\u8F93\u51FA\u4E0D\u662F\u53EF\u89E3\u6790\u7684 JSON\uFF1A${uvuParseError.message}\u3002\u8BF7\u91CD\u65B0\u8F93\u51FA\u5B8C\u6574\u3001\u95ED\u5408\u3001\u8BED\u6CD5\u6B63\u786E\u7684\u88F8 JSON \u5BF9\u8C61\uFF0C\u4E0D\u8981\u7701\u7565\u5B57\u6BB5\uFF0C\u4E0D\u8981\u4F7F\u7528 Markdown \u6216\u4EE3\u7801\u56F4\u680F\uFF0C\u4E0D\u8981\u9644\u52A0\u4EFB\u4F55\u89E3\u91CA\u3002`;
          }
        }
        if (!uvuExtracted || !uvuResponse) throw uvuParseError ?? new Error("Unified Visual Understanding \u8F93\u51FA\u65E0\u6CD5\u89E3\u6790\u4E3A JSON");
        const normalized = normalizeUnifiedVisualUnderstanding({
          project: promptSourceProject,
          extracted: uvuExtracted,
          generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          modelId: credentials.model,
          sourceRefs: promptSourceAssets.map((asset) => `asset:${asset.id}`),
          enforceExecutionSufficiency: false
        });
        promptSourceRunId = uvuResponse.runId || void 0;
        analysisRepairRunId = `repair-run-${crypto.randomUUID()}`;
        const repairStore = createAnalysisRepairStore({
          projectRoot: projectPaths.root,
          dataRoot: path.resolve(settings.defaultDataPath),
          runId: analysisRepairRunId
        });
        const completion = await completeStructuredAnalysis({
          packet: normalized.packet,
          deliverable: "space",
          execution: { outputLanguage: project.outputLanguage },
          projectLanguage: project.outputLanguage,
          lockedPaths: [
            "projectId",
            "projectFacts",
            "lockedAssets"
          ],
          persistence: repairStore,
          runId: analysisRepairRunId,
          onProgress: () => {
            progress("repairing-decisions", "\u6B63\u5728\u5B8C\u5584\u9879\u76EE\u51B3\u7B56");
          },
          validateFinalPacket: (packet) => {
            const result = validateSpatialSemantics(
              packet.mediaTranslations?.spatial ?? {}
            );
            return {
              status: result.status === "pass" ? "pass" : "block",
              findings: result.findings
            };
          },
          repairInvalidFinalPacket: async ({ packet, findings }) => {
            const current = packet;
            const spatialRepairMaxAttempts = 3;
            let repaired;
            let spatialRepairError;
            let spatialRepairHint = "";
            for (let attempt = 1; attempt <= spatialRepairMaxAttempts; attempt += 1) {
              const repairResponse = await baseReasoner({
                prompt: {
                  messages: [
                    {
                      role: "system",
                      content: "\u4F60\u662F\u7A7A\u95F4\u529F\u80FD\u8BED\u4E49\u4FEE\u590D\u5668\u3002\u53EA\u80FD\u4FEE\u590D\u6307\u5B9A\u7684\u4E09\u4E2A\u7A7A\u95F4\u529F\u80FD\u5B57\u6BB5\uFF0C\u4E0D\u5F97\u4FEE\u6539\u9879\u76EE\u4E8B\u5B9E\u3001\u54C1\u724C\u7B56\u7565\u6216\u5176\u4ED6\u5B57\u6BB5\u3002\u53EA\u8FD4\u56DE\u4E25\u683C JSON\u3002"
                    },
                    {
                      role: "user",
                      content: `\u4FEE\u590D\u4EE5\u4E0B\u7A7A\u95F4\u529F\u80FD\u5B57\u6BB5\uFF0C\u4F7F\u5176\u53EA\u63CF\u8FF0\u7A7A\u95F4\u533A\u57DF\u3001\u8FD0\u8425\u529F\u80FD\u3001\u7528\u6237\u8DEF\u5F84\u3001\u8FB9\u754C\u3001\u52A8\u7EBF\u4E0E\u529F\u80FD\u7ED3\u679C\u3002

functionalNetwork \u4E0D\u5F97\u5305\u542B\u54C1\u724C\u7B26\u53F7\u3001Logo\u3001\u56FE\u5F62\u3001\u7EB9\u6837\u3001\u8272\u5F69\u6E10\u53D8\u3001\u88C5\u9970\u6BCD\u9898\u6216\u827A\u672F\u88C5\u7F6E\u3002
functionalRelationships \u5FC5\u987B\u63CF\u8FF0\u7A7A\u95F4 A\u3001\u8FC7\u6E21/\u8FB9\u754C/\u52A8\u7EBF\u673A\u5236\u3001\u7A7A\u95F4 B \u53CA\u529F\u80FD\u7ED3\u679C\u3002
mustBeVisible \u53EA\u80FD\u5217\u51FA\u771F\u5B9E\u8FD0\u8425\u4E2D\u5FC5\u987B\u53EF\u89C1\u7684\u7A7A\u95F4\u3001\u8BBE\u5907\u6216\u529F\u80FD\u533A\u57DF\uFF0C\u4E0D\u5F97\u5305\u542B Logo\u3001\u54C1\u724C\u7B26\u53F7\u3001\u56FE\u6848\u6216\u5B57\u6807\u3002

\u4E0D\u5F97\u7F16\u9020\u8BC1\u636E\uFF1B\u65E0\u6CD5\u5B89\u5168\u4FEE\u590D\u7684\u6761\u76EE\u5E94\u5220\u9664\u3002

\u6821\u9A8C\u53D1\u73B0\uFF1A${JSON.stringify(findings)}

\u5F53\u524D\u9879\u76EE\u4E8B\u5B9E\uFF1A${JSON.stringify(current.projectFacts)}

\u5F53\u524D\u7A7A\u95F4\u5B57\u6BB5\uFF1A${JSON.stringify(current.mediaTranslations?.spatial)}${spatialRepairHint}`
                    }
                  ],
                  attachments
                },
                responseSchema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["functionalNetwork", "functionalRelationships", "mustBeVisible"],
                  properties: {
                    functionalNetwork: { type: "array", items: { type: "string" } },
                    functionalRelationships: { type: "array", items: { type: "string" } },
                    mustBeVisible: { type: "array", items: { type: "string" } }
                  }
                },
                responseSchemaName: "spatial_semantic_repair",
                structuredOutputMode: "json_object",
                signal: controller.signal,
                maximumDurationMs: 15 * 6e4
              });
              try {
                repaired = parseModelStructuredResponse(repairResponse.reportMarkdown);
                break;
              } catch (error) {
                spatialRepairError = error;
                const failureRoot = path.join(projectPaths.runtime, "uvu-failures");
                await fs.mkdir(failureRoot, { recursive: true }).catch(() => void 0);
                await fs.writeFile(
                  path.join(failureRoot, `spatial-repair-attempt-${attempt}-${Date.now()}.json`),
                  `${JSON.stringify({
                    runId: repairResponse.runId,
                    model: credentials.model,
                    error: spatialRepairError.message,
                    raw: repairResponse.reportMarkdown
                  }, null, 2)}
`,
                  "utf8"
                ).catch(() => void 0);
                if (attempt >= spatialRepairMaxAttempts) break;
                spatialRepairHint = `

\u4E0A\u4E00\u6B21\u8F93\u51FA\u4E0D\u662F\u53EF\u89E3\u6790\u7684 JSON\uFF1A${spatialRepairError.message}\u3002\u8BF7\u91CD\u65B0\u8F93\u51FA\u5B8C\u6574\u3001\u7B26\u5408 schema \u7684\u88F8 JSON\uFF0C\u4E0D\u8981\u7701\u7565\u5B57\u6BB5\u3001\u4E0D\u8981\u7528 Markdown \u6216\u4EE3\u7801\u56F4\u680F\u3002`;
              }
            }
            if (repaired) {
              const next = structuredClone(packet);
              const normalizeItems = (value, field) => Array.isArray(value) ? value.filter((item) => typeof item === "string").map((item) => normalizeSpatialFunctionalValue(item, field)).filter((item) => typeof item === "string" && Boolean(item)) : [];
              next.mediaTranslations.spatial.functionalNetwork = Array.isArray(repaired.functionalNetwork) ? normalizeItems(repaired.functionalNetwork, "functionalNetwork") : [];
              next.mediaTranslations.spatial.functionalRelationships = Array.isArray(repaired.functionalRelationships) ? normalizeItems(repaired.functionalRelationships, "functionalRelationships") : [];
              next.mediaTranslations.spatial.mustBeVisible = Array.isArray(repaired.mustBeVisible) ? normalizeItems(repaired.mustBeVisible, "mustBeVisible") : [];
              return next;
            }
            const fallback = sanitizeSpatialSemanticsDeterministically(current, findings);
            return fallback.packet;
          },
          model: async (request) => {
            const repairResponse = await baseReasoner({
              prompt: {
                messages: [
                  {
                    role: "system",
                    content: "\u4F60\u662F\u9879\u76EE\u51B3\u7B56\u5B9A\u5411\u4FEE\u590D\u5668\u3002\u53EA\u80FD\u4F7F\u7528\u5F53\u524D\u9879\u76EE\u9644\u4EF6\u548C\u63D0\u793A\u4E2D\u5217\u51FA\u7684\u5F53\u524D\u9879\u76EE\u8BC1\u636E\uFF0C\u5E76\u4E25\u683C\u6309 JSON Schema \u8FD4\u56DE\u3002"
                  },
                  { role: "user", content: request.prompt }
                ],
                attachments
              },
              responseSchema: request.responseSchema,
              responseSchemaName: "analysis_repair",
              structuredOutputMode: "json_object",
              signal: controller.signal,
              maximumDurationMs: 15 * 6e4
            });
            try {
              return parseModelStructuredResponse(repairResponse.reportMarkdown);
            } catch {
              throw Object.assign(new Error("Repair model returned unparseable JSON."), {
                code: "REPAIR_RESPONSE_INVALID",
                repairFeedback: "Return one complete JSON object with a repairs array; do not include prose or Markdown."
              });
            }
          }
        });
        promptSourceModelCallCount += completion.modelCallCount;
        analysisRepairAttempts = completion.attempts;
        analysisRepairStatus = completion.status;
        if (completion.status === "requires_confirmation") {
          const questions = completion.clarificationQuestions.slice(0, 3).map((item) => item.question).join("\n");
          throw Object.assign(
            new Error(questions || "\u5F53\u524D\u9879\u76EE\u8FD8\u7F3A\u5C11\u5FC5\u987B\u7531\u4F60\u786E\u8BA4\u7684\u771F\u5B9E\u4FE1\u606F\u3002"),
            { code: "ANALYSIS_CONFIRMATION_REQUIRED" }
          );
        }
        if (completion.status === "failed") {
          throw Object.assign(
            new Error("\u6A21\u578B\u8FD4\u56DE\u7684\u9879\u76EE\u51B3\u7B56\u672A\u901A\u8FC7\u6821\u9A8C\uFF0C\u81EA\u52A8\u4FEE\u590D\u540E\u4ECD\u672A\u901A\u8FC7\u3002\u8BF7\u91CD\u65B0\u5206\u6790\uFF1B\u82E5\u6301\u7EED\u5931\u8D25\uFF0C\u8BF7\u67E5\u770B\u5206\u6790\u4FEE\u590D\u8BB0\u5F55\u3002"),
            { code: "ANALYSIS_REPAIR_FAILED" }
          );
        }
        visualDecisionPacket = completion.packet;
        visualDecisionPacket.validation.executionDataStatus = "ready";
        visualDecisionPacket.validation.missingExecutionFields = [];
        promptSourceObject = visualDecisionPacketToPromptSourceObject(visualDecisionPacket);
        promptSourceObject.provenance.structuredAnalysisRunId = uvuResponse.runId || void 0;
        report = compileVisualDecisionReport(visualDecisionPacket, {
          title: `${finalProjectName}\u89C6\u89C9\u65B9\u6848\u5347\u7EA7\u62A5\u544A`
        });
      }
      if (promptSourceAssets.length && (!promptSourceObject || !visualDecisionPacket)) {
        throw Object.assign(
          new Error("PROMPT_SOURCE_INSUFFICIENT: unified visual understanding failed after repair"),
          { code: "PROMPT_SOURCE_INSUFFICIENT" }
        );
      }
      await fs.writeFile(reportPath, report, "utf8");
      if (path.resolve(coreReportPath) !== path.resolve(reportPath)) await fs.rm(coreReportPath, { force: true });
      if (project.lastReportFilename && project.lastReportFilename !== reportFilename) {
        await fs.rm(path.join(projectPaths.outputs, project.lastReportFilename), { force: true });
      }
      const completedAt = (/* @__PURE__ */ new Date()).toISOString();
      const durationMs = Math.round(performance.now() - started);
      const runtimeReport = {
        ...execution.result.runReport,
        outputFile: reportFilename,
        analysisProfile: "fusion-enhanced",
        projectId,
        apiProfileId: credentials.profileId,
        provider: credentials.provider,
        model: credentials.model,
        startedAt,
        completedAt,
        durationMs,
        promptSourceModelCallCount,
        promptSourceRunId,
        analysisRepairRunId,
        analysisRepairAttempts,
        analysisRepairStatus,
        modelCallsThisRun: Number(execution.result.runReport.modelCallsThisRun || 0) + promptSourceModelCallCount
      };
      const runtimeReportPath = path.join(projectPaths.runtime, "run-report.json");
      await fs.writeFile(runtimeReportPath, `${JSON.stringify(runtimeReport, null, 2)}
`, "utf8");
      const updated = await projects.update(projectId, {
        projectName: finalProjectName,
        detectedProjectName: finalProjectName,
        projectNameSource: finalProjectName === project.projectName ? project.projectNameSource : "visual-content",
        projectNameConfidence: finalProjectName === project.projectName ? project.projectNameConfidence : 0.9,
        brandName: finalProjectName === project.projectName ? project.brandName : finalProjectName,
        detectedBrandName: finalProjectName === project.projectName ? project.detectedBrandName : finalProjectName,
        factConfidence: {
          ...project.factConfidence,
          brandName: finalProjectName === project.projectName ? project.factConfidence.brandName : 0.9
        },
        status: "completed",
        provider: credentials.provider,
        model: credentials.model,
        apiProfileId: credentials.profileId,
        lastRunAt: completedAt,
        lastDurationMs: durationMs,
        lastReportFilename: reportFilename,
        lastError: null,
        assetCount: analysisItems.length,
        imageCount: analysisImageCount
      });
      try {
        const context = compileProjectVisualContext({
          project: updated,
          sourceRunId: updated.id,
          reportMarkdown: report,
          reportPath,
          runtimeReportPath,
          assetCount: analysisItems.length,
          imageCount: analysisImageCount,
          provider: credentials.provider,
          model: credentials.model
        });
        const contextTarget = path.join(projectPaths.outputs, "project-visual-context.json");
        await writeProjectVisualContext(contextTarget, context);
        await projects.update(projectId, {
          visualContextFilename: "project-visual-context.json",
          visualContextStatus: "ready",
          visualContextSchemaVersion: PROJECT_VISUAL_CONTEXT_SCHEMA_VERSION,
          visualContextLastBuiltAt: context.generatedAt
        });
      } catch (contextError) {
        const message = contextError instanceof Error ? contextError.message : String(contextError);
        console.warn(
          JSON.stringify({ event: "PROJECT_VISUAL_CONTEXT_COMPILE_FAILED", projectId, message })
        );
        await projects.update(projectId, {
          visualContextStatus: "failed",
          visualContextLastBuiltAt: (/* @__PURE__ */ new Date()).toISOString()
        }).catch(() => void 0);
      }
      try {
        const previousShortChain = updated.visualContextVNextStatus === "ready" ? await fs.readFile(
          path.join(projectPaths.root, "project-context", "project-visual-context.vnext.json"),
          "utf8"
        ).then((value) => JSON.parse(value)).catch(() => null) : null;
        const vnextContext = buildProjectVisualContext({
          project: updated,
          previousContext: previousShortChain,
          structuredAnalysis: promptSourceObject ? { promptSourceObject, visualDecisionPacket } : previousShortChain?.promptSourceObject ? {
            promptSourceObject: previousShortChain.promptSourceObject,
            visualDecisionPacket: previousShortChain.visualDecisionPacket
          } : void 0,
          structuredAnalysisRunId: promptSourceRunId || execution.result.runReport.reasoningRunId
        });
        await writeStructuredProjectVisualContext(
          path.join(projectPaths.root, "project-context", "project-visual-context.vnext.json"),
          vnextContext
        );
        if (visualDecisionPacket) {
          await fs.writeFile(
            path.join(projectPaths.root, "project-context", "visual-decision-packet.json"),
            `${JSON.stringify(visualDecisionPacket, null, 2)}
`,
            "utf8"
          );
        }
        await projects.update(projectId, {
          visualContextVNextFilename: "project-visual-context.vnext.json",
          visualContextVNextStatus: "ready",
          visualContextVNextVersion: vnextContext.version,
          visualContextVNextLastBuiltAt: vnextContext.generatedAt
        });
      } catch (contextError) {
        const message = contextError instanceof Error ? contextError.message : String(contextError);
        console.warn(JSON.stringify({
          event: "PROJECT_VISUAL_CONTEXT_VNEXT_COMPILE_FAILED",
          projectId,
          message
        }));
        await projects.update(projectId, {
          visualContextVNextStatus: "failed",
          visualContextVNextLastBuiltAt: (/* @__PURE__ */ new Date()).toISOString()
        }).catch(() => void 0);
      }
      progress("completed", "\u5206\u6790\u5B8C\u6210", {
        cacheStatus: execution.result.runReport.reasoningCacheHit ? "hit" : "miss"
      });
      return {
        // The context status is persisted after `updated` is created. Return a
        // fresh record so the renderer does not keep the generation entry
        // disabled after a successful local context compile.
        project: await projects.get(projectId),
        reportFilename,
        reportPath,
        runtimeReportPath,
        apiProfileId: credentials.profileId,
        provider: execution.result.runReport.provider,
        model: execution.result.runReport.model,
        durationMs,
        assetCount: analysisItems.length,
        imageCount: analysisImageCount,
        reasoningCacheHit: execution.result.runReport.reasoningCacheHit
      };
    } catch (error) {
      const cancelled = controller.signal.aborted || error.name === "AbortError";
      const message = cancelled ? "\u7528\u6237\u5DF2\u53D6\u6D88\u5206\u6790" : friendlyPipelineError(error, credentials.apiKey);
      await projects.update(projectId, { status: cancelled ? "cancelled" : "failed", lastError: message });
      await fs.rm(configPath, { force: true }).catch(() => {
      });
      progress(cancelled ? "cancelled" : "failed", cancelled ? "\u5206\u6790\u5DF2\u53D6\u6D88" : `\u5206\u6790\u5931\u8D25\uFF1A${message}`, {
        failedAtStage: currentStage
      });
      throw new Error(message);
    } finally {
      active.delete(projectId);
    }
  }
  function cancel(projectId) {
    const run = active.get(projectId);
    if (!run) return false;
    run.controller.abort();
    return true;
  }
  function isActive(projectId) {
    return active.has(projectId);
  }
  const ORPHANED_PROJECT_MESSAGE = "\u5E94\u7528\u5728\u5206\u6790\u8FD0\u884C\u671F\u95F4\u5F02\u5E38\u9000\u51FA\uFF0C\u4EFB\u52A1\u5DF2\u81EA\u52A8\u6807\u8BB0\u4E3A\u5931\u8D25\uFF1B\u73B0\u5728\u53EF\u4EE5\u5220\u9664\u9879\u76EE\u6216\u91CD\u65B0\u5206\u6790\u3002";
  async function reconcileOrphanedProject(project) {
    if (project.status !== "running" || active.has(project.id)) return project;
    try {
      return await projects.update(project.id, { status: "failed", lastError: project.lastError || ORPHANED_PROJECT_MESSAGE });
    } catch {
      return { ...project, status: "failed", lastError: project.lastError || ORPHANED_PROJECT_MESSAGE };
    }
  }
  return { start, cancel, isActive, reconcileOrphanedProject };
}
export {
  createPipelineService
};
