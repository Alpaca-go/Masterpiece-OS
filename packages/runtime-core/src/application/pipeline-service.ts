import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  AnalysisProgress,
  AnalysisResult,
  CurrentProjectAssetDecision,
  CurrentProjectProfile,
  FlexibleColorSystem,
  FlexibleCompositionSystem,
  ProjectRecord,
  ProjectRuntimeContext,
  ProviderCredentials,
  PublicSettings,
  ReferenceFirstAnalysisOutput,
  ReferencePackagingProjectInput,
  ReferenceAssetDecision,
  ReferenceInheritanceRule,
  ReferenceStyleProfile,
  ReferenceStyleRule,
  VisualAnchor,
  VisualAnalysisPurpose,
  VisualReconstructionDirection
} from '../shared/types.ts';
import type {
  PromptSourceObject,
  VisualDecisionPacket,
} from '@masterpiece/project-contracts/index.ts';
import {
  completeStructuredAnalysis,
  type AnalysisRepairResult,
  type StructuredRepairModelRequest,
  type VisualAnalysisRuntimeAdapter,
} from '@masterpiece/analysis-runtime/core/visual-analysis-core.ts';
import {
  normalizeSpatialFunctionalValue,
  validateSpatialSemantics,
} from '@masterpiece/image-generation-runtime/core/space-generation-core.js';
import {
  normalizeCurrentProjectDecisions,
  normalizeReferenceDecisions
} from './asset-selection-protocol/index.ts';
import {
  buildCurrentProjectAssetSelectionPrompt,
  buildReferenceAssetSelectionPrompt
} from './asset-selection-protocol/prompts.ts';
import {
  buildFusionEnhancedTask,
  buildReportFilename,
  analysisFactualConstraints,
  extractProjectNameFromReport,
  normalizeReportTitle,
  redactSecret,
  validateVisualUpgradeMarkdown
} from './analysis-contract.ts';
import {
  compileProjectVisualContext,
  writeProjectVisualContext,
  PROJECT_VISUAL_CONTEXT_SCHEMA_VERSION
} from './project-visual-context-compiler.ts';
import {
  buildProjectVisualContext,
  writeProjectVisualContext as writeStructuredProjectVisualContext,
} from './project-visual-context-builder.ts';
import {
  buildUnifiedVisualUnderstandingPrompt,
  normalizeUnifiedVisualUnderstanding,
} from './unified-visual-understanding.ts';
import {
  visualDecisionPacketToPromptSourceObject,
} from './visual-decision-packet.ts';
import { compileVisualDecisionReport } from './visual-decision-report-compiler.ts';
import { createAnalysisRepairStore } from './analysis-repair-store.ts';
import type { ProjectStore } from './project-store.ts';
import { isAnalysisSourceAsset } from './project-assets.ts';
import {
  incompleteProjectIdentity,
  resolveAnalyzedProjectIdentity
} from './project-identity.ts';
import {
  assertCurrentProjectProfile,
  completeVisualDirectionTouchpoints,
  normalizeProjectTouchpointClassification,
  validateReferenceStyleProfile,
  validateVisualDirectionExecutability
} from './reference-style-reconstruction.ts';
import {
  buildCurrentProjectFactsPrompt,
  buildReferenceStylePrompt,
  buildVisualReconstructionDecisionPrompt
} from './reference-reconstruction-prompts.ts';
import { normalizePackagingTranslationV2 } from './packaging-translation-contract.ts';
import {
  buildAudienceFacts,
  parseProjectFactsModelOutput,
  ProjectFactsSchema
} from './model-schema/project-facts.schema.ts';
import { MODEL_SCHEMA_REGISTRY } from './model-schema/schema-registry.ts';
import {
  compileRepairPrompt,
  throwForValidationIssues,
  type ValidationIssue
} from './model-schema/validation-issues.ts';

// Bundled from the repository core. The Node Runtime Host consumes this provider registry.
// @ts-ignore — JavaScript core module intentionally has no TypeScript declaration file.
import { createDefaultAnalysisProviderRegistry } from '@masterpiece/model-runtime/analysis-provider-registry.js';
// @ts-ignore — JavaScript core module intentionally has no TypeScript declaration file.
import { parseStructuredResponse } from '@masterpiece/model-runtime/response-parser.js';

type ProgressSink = (progress: AnalysisProgress) => void;
type CredentialsReader = (profileId?: string) => Promise<ProviderCredentials>;
type SettingsReader = () => Promise<PublicSettings>;

interface ActiveRun {
  controller: AbortController;
  startedAt: string;
}

function configurePromptRoot(runtime: VisualAnalysisRuntimeAdapter): void {
  const promptRoot = runtime.resolvePromptRoot().trim();
  if (!promptRoot) throw new Error('Visual Analysis runtime adapter returned an empty prompt root');
  process.env.MASTERPIECE_PROMPT_ROOT = promptRoot;
}

function providerLabel(provider: ProviderCredentials['provider']): string {
  return provider.trim() || 'openai-compatible';
}

function combineSignals(first: AbortSignal, second: AbortSignal): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([first, second]);
  const controller = new AbortController();
  const abort = () => controller.abort();
  first.addEventListener('abort', abort, { once: true });
  second.addEventListener('abort', abort, { once: true });
  return controller.signal;
}

function friendlyPipelineError(error: Error, apiKey: string): string {
  const message = redactSecret(error.message, apiKey).replace(/^Qwen 请求失败：\s*/i, '');
  if (/401|403|API Key|unauthorized|forbidden/i.test(message)) return 'API Key 无效或无权访问当前模型';
  if (/404|model.*not found|does not exist/i.test(message)) return 'Model ID 或 Base URL 不存在';
  if (/image|vision|multimodal/i.test(message) && /support|不支持/i.test(message)) return '当前模型不支持图片输入';
  if (/TIME_BUDGET_EXCEEDED|超时|aborted|abort/i.test(message)) return '分析超时或已被取消';
  if (/empty|空报告/i.test(message)) return '模型返回空内容，未生成报告';
  return message;
}

interface StructuredStepAttempt {
  attempt: number;
  completedAt: string;
  rawResponse: string;
  validationError?: {
    code?: string;
    message: string;
    issues?: string[];
    details?: unknown;
  };
}

/**
 * Deterministic fallback for the spatial semantic repair. When every model
 * attempt fails, drop the flagged ambiguous / decorative items from the
 * spatial functional fields instead of hard-failing the whole analysis. This
 * is the same fail-safe the R10.4.1 demotion path uses: an ambiguous or
 * decorative must-be-visible item is better removed than allowed to block.
 */
function sanitizeSpatialSemanticsDeterministically(
  packet: VisualDecisionPacket,
  findings: unknown[],
): { packet: VisualDecisionPacket; pass: boolean; findings: Array<{ code: string }> } {
  const spatial = packet.mediaTranslations?.spatial ?? {};
  const next = structuredClone(packet);
  const fieldIndices = (field: string): Set<number> => {
    const set = new Set<number>();
    for (const finding of findings ?? []) {
      const path = typeof finding === 'object' && finding !== null
        ? (finding as { path?: unknown }).path
        : undefined;
      const match = String(path ?? '').match(new RegExp(`${field}\\[(\\d+)\\]`, 'u'));
      if (match) set.add(Number(match[1]));
    }
    return set;
  };
  const filterField = (field: string, values: string[]): string[] => {
    const drop = fieldIndices(field);
    return values
      .map((item, index) => (drop.has(index) ? null : item))
      .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
      .map((item) => normalizeSpatialFunctionalValue(item.trim(), field))
      .filter((item): item is string => typeof item === 'string' && Boolean(item));
  };
  next.mediaTranslations.spatial.functionalNetwork = filterField('functionalNetwork', spatial.functionalNetwork ?? []);
  next.mediaTranslations.spatial.functionalRelationships = filterField('functionalRelationships', spatial.functionalRelationships ?? []);
  next.mediaTranslations.spatial.mustBeVisible = filterField('mustBeVisible', spatial.mustBeVisible ?? []);
  const result = validateSpatialSemantics(next.mediaTranslations.spatial);
  return {
    packet: next,
    pass: result.status === 'pass',
    findings: result.findings ?? [],
  };
}

function parseModelStructuredResponse(rawResponse: string): Record<string, unknown> {
  // 模型经常返回用 ```json ... ``` 包装的 JSON（忽略 prompt 中的裸 JSON 要求）。
  // 先剥离 Markdown code fence，再交给引擎层的 parseStructuredResponse 解析（其
  // extractJsonCandidate 同样会做一次 strip，此处是桌面端防御层）。
  const stripped = rawResponse.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '');
  try {
    return parseStructuredResponse(stripped) as Record<string, unknown>;
  } catch (error) {
    const trimmed = rawResponse.trim();
    const likelyTruncated = /^[{[]/u.test(trimmed)
      && !(/[}\]]$/u.test(trimmed));
    throwForValidationIssues([{
      path: '$',
      issueType: likelyTruncated ? 'truncated' : 'json_parse_error',
      receivedValue: rawResponse.slice(0, 200),
      message: likelyTruncated
        ? '模型输出在 JSON 完成前被截断。'
        : `模型输出不是可解析的 JSON：${(error as Error).message}`,
      validExamples: [{ field: 'value' }],
      repairInstruction: '重新输出完整、闭合且可直接解析的裸 JSON；不要附加解释。',
      severity: 'blocking'
    }]);
    throw error;
  }
}

function preservePipelineError(
  error: Error & {
    code?: string;
    issues?: string[];
    details?: unknown;
    structuredStep?: string;
    structuredAttempts?: StructuredStepAttempt[];
  },
  apiKey: string
): Error {
  return Object.assign(new Error(friendlyPipelineError(error, apiKey)), {
    code: error.code,
    issues: error.issues,
    details: error.details,
    structuredStep: error.structuredStep,
    structuredAttempts: error.structuredAttempts
  });
}

const valueArray = (value: unknown): string[] => Array.isArray(value)
  ? [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
  : [];

function directionTextArray(value: unknown): string[] {
  const values: string[] = [];
  const visit = (item: unknown): void => {
    if (typeof item === 'string' || typeof item === 'number') {
      const text = String(item).trim();
      if (text) values.push(text);
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (!item || typeof item !== 'object') return;
    const source = item as Record<string, unknown>;
    const preferred = [
      source.rule,
      source.redirection,
      source.description,
      source.visualForm,
      source.transformationLogic
    ].find((candidate) => typeof candidate === 'string' && candidate.trim());
    if (preferred) {
      visit(preferred);
      return;
    }
    Object.values(source).forEach(visit);
  };
  visit(value);
  return [...new Set(values)];
}

function directionNameValue(value: unknown, brandName: string): string {
  const source = String(value || '').trim()
    .replace(/[·｜|:：—–-]/gu, '')
    .replace(/Reference-First|视觉重构|重构执行方案|执行方案|视觉方向|视觉系统/giu, '')
    .replace(/\s+/gu, '');
  const candidate = source || `${brandName}新序`;
  return [...candidate].slice(0, 8).join('');
}

function separatedDirectionTextArray(value: unknown): string[] {
  return [...new Set(directionTextArray(value)
    .flatMap((item) => item.split(/[、，,；;]/gu).map((part) => part.trim()).filter(Boolean)))];
}

const incompleteFact = incompleteProjectIdentity;

function styleRuleArray(value: unknown): ReferenceStyleRule[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const source = item as Record<string, unknown>;
    const rule = String(source.rule || '').trim();
    const designEffect = String(source.designEffect || '').trim();
    if (!rule || !designEffect) return [];
    return [{
      rule,
      inheritanceLevel: source.inheritanceLevel === 'principle'
        || source.inheritanceLevel === 'relationship'
        || source.inheritanceLevel === 'surface'
        ? source.inheritanceLevel
        : undefined,
      evidence: valueArray(source.evidence),
      designEffect,
      confidence: Math.max(0, Math.min(1, Number(source.confidence ?? 0.7)))
    }];
  });
}

/** Parser boundary for the one-pass Reference style + Packaging response. */
export function normalizeReferenceFirstAnalysisOutput(
  raw: Record<string, unknown>,
  assetIds: string[],
): ReferenceFirstAnalysisOutput {
  const style = raw.referenceStyleProfile && typeof raw.referenceStyleProfile === 'object'
    ? raw.referenceStyleProfile as Record<string, unknown>
    : {};
  return {
    referenceStyleProfile: {
      schemaVersion: 'reference-style-profile-v3',
      overallTemperament: styleRuleArray(style.overallTemperament),
      colorSystem: styleRuleArray(style.colorSystem),
      compositionSystem: styleRuleArray(style.compositionSystem),
      graphicLanguage: styleRuleArray(style.graphicLanguage),
      typographySystem: styleRuleArray(style.typographySystem),
      materialSystem: styleRuleArray(style.materialSystem),
      lightingSystem: styleRuleArray(style.lightingSystem),
      photographySystem: styleRuleArray(style.photographySystem),
      packagingPresentation: styleRuleArray(style.packagingPresentation),
      posterPresentation: styleRuleArray(style.posterPresentation),
      viExtensionSystem: styleRuleArray(style.viExtensionSystem),
      excludedIdentityTerms: valueArray(style.excludedIdentityTerms),
      sourceAssetIds: valueArray(style.sourceAssetIds).length
        ? valueArray(style.sourceAssetIds)
        : assetIds,
    },
    packagingTranslation: normalizePackagingTranslationV2(raw.packagingTranslation),
  };
}

const recordValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

function visualAnchorValue(value: unknown): VisualAnchor {
  const source = recordValue(value);
  return {
    name: String(source.name || '').trim(),
    sourceElements: separatedDirectionTextArray(source.sourceElements),
    transformationLogic: String(source.transformationLogic || '').trim(),
    visualForm: String(source.visualForm || '').trim(),
    extensionTouchpoints: separatedDirectionTextArray(source.extensionTouchpoints),
    referenceSurfaceSimilarityRisk: source.referenceSurfaceSimilarityRisk === 'medium'
      || source.referenceSurfaceSimilarityRisk === 'high'
      ? source.referenceSurfaceSimilarityRisk
      : 'low'
  };
}

function referenceInheritanceValue(value: unknown): ReferenceInheritanceRule[] {
  const normalized = Array.isArray(value)
    ? value
    : Object.entries(recordValue(value)).map(([level, weight]) => ({
      level,
      weight,
      rule: `采用参考项目的${level}层级规则`
    }));
  return normalized.flatMap((item) => {
    const source = recordValue(item);
    const level = source.level;
    if (level !== 'principle' && level !== 'relationship' && level !== 'surface') return [];
    const defaultWeight = level === 'principle' ? 1 : level === 'relationship' ? 0.8 : 0.35;
    return [{
      level: level as ReferenceInheritanceRule['level'],
      weight: Number.isFinite(Number(source.weight)) ? Number(source.weight) : defaultWeight,
      rule: String(source.rule || '').trim()
    }];
  }).filter((item) => item.rule);
}

function flexibleColorSystemValue(value: unknown): FlexibleColorSystem {
  const source = recordValue(value);
  return {
    identityColorRole: String(source.identityColorRole || '').trim(),
    backgroundOptions: valueArray(source.backgroundOptions),
    textAndStructureColors: valueArray(source.textAndStructureColors),
    accentOptions: valueArray(source.accentOptions),
    saturationGuideline: String(source.saturationGuideline || '').trim(),
    touchpointVariations: valueArray(source.touchpointVariations)
  };
}

function flexibleCompositionSystemValue(value: unknown): FlexibleCompositionSystem {
  const source = recordValue(value);
  return {
    fixedPrinciples: valueArray(source.fixedPrinciples),
    allowedVariations: valueArray(source.allowedVariations),
    seriesConsistencyRules: valueArray(source.seriesConsistencyRules),
    prohibitedLayouts: valueArray(source.prohibitedLayouts)
  };
}

export function createPipelineService(
  projects: ProjectStore,
  readCredentials: CredentialsReader,
  readSettings: SettingsReader,
  emitProgress: ProgressSink,
  runtime: VisualAnalysisRuntimeAdapter,
  analysisProviders = createDefaultAnalysisProviderRegistry(),
) {
  const active = new Map<string, ActiveRun>();

  async function start(
    projectId: string,
    forceReasoning = true,
    apiProfileId?: string,
    validationMode: 'visual_upgrade' | 'reference_source' = 'visual_upgrade'
  ): Promise<AnalysisResult> {
    if (active.has(projectId)) throw new Error('该项目正在分析中');
    const summary = await projects.scan(projectId);
    const project = await projects.get(projectId);
    const analysisItems = summary.items.filter((item) => item.usage === 'analysis_source');
    const analysisImageCount = analysisItems.filter((item) => item.kind === 'image').length;
    const analysisPdfCount = analysisItems.filter((item) => item.kind === 'pdf').length;
    if (!analysisItems.length) throw new Error('项目素材为空，请先上传视觉方案');
    if (analysisImageCount + analysisPdfCount === 0) throw new Error('项目中没有可分析的图片或 PDF');
    if (!project.logoLocked) throw new Error('当前分析模式要求原始 Logo 默认锁定');
    if (project.outputLanguage !== 'zh-CN') throw new Error('当前分析模式固定输出简体中文');
    const credentials = await readCredentials(apiProfileId || project.apiProfileId || undefined);
    const settings = await readSettings();
    const projectPaths = await projects.paths(projectId);
    const controller = new AbortController();
    const startedAt = new Date().toISOString();
    const started = performance.now();
    let currentStage: AnalysisProgress['stage'] = 'preparing-assets';
    active.set(projectId, { controller, startedAt });

    const progress = (
      stage: AnalysisProgress['stage'],
      message: string,
      extra: Partial<AnalysisProgress> = {}
    ) => {
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
      status: 'running',
      provider: credentials.provider,
      model: credentials.model,
      apiProfileId: credentials.profileId,
      lastError: null
    });

    const configPath = path.join(projectPaths.runtime, 'masterpiece-os-v5.json');
    try {
      progress('preparing-assets', '正在整理视觉素材', {
        cacheStatus: forceReasoning ? 'forced' : 'checking'
      });
      progress('extracting-project-facts', '正在识别项目与品牌信息');
      const config = {
        version: '5.0',
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
          maxReportCharacters: 8_000,
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
      await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
      configurePromptRoot(runtime);
      progress('building-contact-sheet', '正在生成视觉总览');

      const baseReasoner = analysisProviders.createReasoner(credentials);
      const reasoner = async (context: Record<string, unknown> & { signal: AbortSignal }) => {
        progress('building-prompt', '正在构建分析任务');
        await Promise.resolve();
        progress('reasoning', '正在执行深度创意导演分析', {
          cacheStatus: forceReasoning ? 'forced' : 'miss'
        });
        const supplied = await baseReasoner({
          ...context,
          signal: combineSignals(context.signal, controller.signal)
        });
        progress('generating-report', '正在生成视觉方案升级报告');
        return { ...supplied, provider: providerLabel(credentials.provider) };
      };

      // Dynamic import ensures the packaged prompt resource path is configured first.
      // @ts-ignore — JavaScript core module intentionally has no TypeScript declaration file.
      const { runAnalysisPipeline } = await import('../../../../apps/cli/src/analysis-engine/bootstrap.js');
      const execution = await runAnalysisPipeline(projectPaths.input, {
        projectRoot: projectPaths.root,
        output: projectPaths.outputs,
        config: configPath,
        deepCreativeDirectorReasoner: reasoner,
        forceReasoning,
        preparationCacheRoot: path.join(projectPaths.prepared, 'visual'),
        benchmarkCacheRoot: path.join(projectPaths.prepared, 'benchmarks')
      });
      if (controller.signal.aborted) throw new DOMException('用户主动取消', 'AbortError');

      progress('validating-output', '正在校验报告');
      const coreReportPath = path.join(projectPaths.outputs, execution.result.outputFile);
      const rawReport = await fs.readFile(coreReportPath, 'utf8');
      // ProjectRecord identity is authoritative. A free-form legacy report may
      // only fill an actually empty name; it must never rename the project.
      const finalProjectName = project.projectName
        || extractProjectNameFromReport(rawReport)
        || project.brandName
        || '未命名项目';
      const legacyReport = normalizeReportTitle(rawReport, finalProjectName, project.outputLanguage);
      if (validationMode === 'visual_upgrade') validateVisualUpgradeMarkdown(legacyReport);
      else if (!legacyReport.trim()) throw new Error('参考视觉分析结果为空');
      const reportFilename = buildReportFilename(finalProjectName, credentials.model, project.outputLanguage);
      const reportPath = path.join(projectPaths.outputs, reportFilename);
      let report = legacyReport;

      // Unified Visual Understanding is extracted directly from ProjectRecord
      // and original assets. The final human report and Prompt Source are
      // siblings rendered from the same Visual Decision Packet.
      let promptSourceObject: PromptSourceObject | undefined;
      let visualDecisionPacket: VisualDecisionPacket | undefined;
      let promptSourceModelCallCount = 0;
      let promptSourceRunId: string | undefined;
      let analysisRepairRunId: string | undefined;
      let analysisRepairAttempts = 0;
      let analysisRepairStatus: AnalysisRepairResult['status'] | undefined;
      const promptSourceProject: ProjectRecord = {
        ...project,
        projectName: finalProjectName,
        brandName: project.brandName || finalProjectName,
      };
      const promptSourceAssets = (project.assets || [])
        .filter((asset) => isAnalysisSourceAsset(asset) && asset.status === 'ready' && /^image\//iu.test(asset.mimeType))
        .slice(0, 30);
      if (promptSourceAssets.length) {
        const prompt = buildUnifiedVisualUnderstandingPrompt(
          promptSourceProject,
          promptSourceAssets.map((asset) => asset.id),
        );
        const attachments = promptSourceAssets.map((asset) => ({
          assetId: asset.id,
          path: path.join(projectPaths.input, asset.relativePath),
          mediaType: 'image',
          format: path.extname(asset.relativePath).slice(1),
          readable: true,
        }));
        progress('validating-output', '正在提取生图项目语义');
        const uvuMaxAttempts = 3;
        let uvuResponse: Awaited<ReturnType<typeof baseReasoner>> | null = null;
        let uvuExtracted: Record<string, unknown> | undefined;
        let uvuParseError: Error | undefined;
        let uvuRepairHint = '';
        for (let attempt = 1; attempt <= uvuMaxAttempts; attempt += 1) {
          promptSourceModelCallCount += 1;
          uvuResponse = await baseReasoner({
            prompt: {
              messages: [
                {
                  role: 'system',
                  content: '你是 Unified Visual Understanding 引擎。只基于 ProjectRecord 与原始视觉附件返回严格 JSON，不读取或复述分析报告。',
                },
                { role: 'user', content: `${prompt}${uvuRepairHint}` },
              ],
              attachments,
            },
            signal: controller.signal,
            maximumDurationMs: 15 * 60_000,
          });
          try {
            uvuExtracted = parseModelStructuredResponse(uvuResponse.reportMarkdown);
            break;
          } catch (error) {
            uvuParseError = error as Error;
            const failureRoot = path.join(projectPaths.runtime, 'uvu-failures');
            await fs.mkdir(failureRoot, { recursive: true }).catch(() => undefined);
            await fs.writeFile(
              path.join(failureRoot, `uvu-attempt-${attempt}-${Date.now()}.json`),
              `${JSON.stringify({
                runId: uvuResponse.runId,
                model: credentials.model,
                error: uvuParseError.message,
                raw: uvuResponse.reportMarkdown,
              }, null, 2)}\n`,
              'utf8',
            ).catch(() => undefined);
            if (attempt >= uvuMaxAttempts) break;
            uvuRepairHint = `\n\n上一次输出不是可解析的 JSON：${uvuParseError.message}。请重新输出完整、闭合、语法正确的裸 JSON 对象，不要省略字段，不要使用 Markdown 或代码围栏，不要附加任何解释。`;
          }
        }
        if (!uvuExtracted || !uvuResponse) throw uvuParseError ?? new Error('Unified Visual Understanding 输出无法解析为 JSON');
        const normalized = normalizeUnifiedVisualUnderstanding({
          project: promptSourceProject,
          extracted: uvuExtracted,
          generatedAt: new Date().toISOString(),
          modelId: credentials.model,
          sourceRefs: promptSourceAssets.map((asset) => `asset:${asset.id}`),
          enforceExecutionSufficiency: false,
        });
        promptSourceRunId = uvuResponse.runId || undefined;
        analysisRepairRunId = `repair-run-${crypto.randomUUID()}`;
        const repairStore = createAnalysisRepairStore({
          projectRoot: projectPaths.root,
          dataRoot: path.resolve(settings.defaultDataPath),
          runId: analysisRepairRunId,
        });
        const completion = await completeStructuredAnalysis({
          packet: normalized.packet,
          deliverable: 'space',
          execution: { outputLanguage: project.outputLanguage },
          projectLanguage: project.outputLanguage,
          lockedPaths: [
            'projectId',
            'projectFacts',
            'lockedAssets',
          ],
          persistence: repairStore,
          runId: analysisRepairRunId,
          onProgress: () => {
            progress('repairing-decisions', '正在完善项目决策');
          },
          validateFinalPacket: (packet) => {
            const result = validateSpatialSemantics(
              (packet as unknown as VisualDecisionPacket).mediaTranslations?.spatial ?? {},
            );
            return {
              status: result.status === 'pass' ? 'pass' as const : 'block' as const,
              findings: result.findings,
            };
          },
          repairInvalidFinalPacket: async ({ packet, findings }) => {
            const current = packet as unknown as VisualDecisionPacket;
            const spatialRepairMaxAttempts = 3;
            let repaired: Record<string, unknown> | undefined;
            let spatialRepairError: Error | undefined;
            let spatialRepairHint = '';
            for (let attempt = 1; attempt <= spatialRepairMaxAttempts; attempt += 1) {
              const repairResponse = await baseReasoner({
                prompt: {
                  messages: [
                    {
                      role: 'system',
                      content: '你是空间功能语义修复器。只能修复指定的三个空间功能字段，不得修改项目事实、品牌策略或其他字段。只返回严格 JSON。',
                    },
                    {
                      role: 'user',
                      content: `修复以下空间功能字段，使其只描述空间区域、运营功能、用户路径、边界、动线与功能结果。\n\nfunctionalNetwork 不得包含品牌符号、Logo、图形、纹样、色彩渐变、装饰母题或艺术装置。\nfunctionalRelationships 必须描述空间 A、过渡/边界/动线机制、空间 B 及功能结果。\nmustBeVisible 只能列出真实运营中必须可见的空间、设备或功能区域，不得包含 Logo、品牌符号、图案或字标。\n\n不得编造证据；无法安全修复的条目应删除。\n\n校验发现：${JSON.stringify(findings)}\n\n当前项目事实：${JSON.stringify(current.projectFacts)}\n\n当前空间字段：${JSON.stringify(current.mediaTranslations?.spatial)}${spatialRepairHint}`,
                    },
                  ],
                  attachments,
                },
                responseSchema: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['functionalNetwork', 'functionalRelationships', 'mustBeVisible'],
                  properties: {
                    functionalNetwork: { type: 'array', items: { type: 'string' } },
                    functionalRelationships: { type: 'array', items: { type: 'string' } },
                    mustBeVisible: { type: 'array', items: { type: 'string' } },
                  },
                },
                responseSchemaName: 'spatial_semantic_repair',
                signal: controller.signal,
                maximumDurationMs: 15 * 60_000,
              });
              try {
                repaired = parseModelStructuredResponse(repairResponse.reportMarkdown);
                break;
              } catch (error) {
                spatialRepairError = error as Error;
                const failureRoot = path.join(projectPaths.runtime, 'uvu-failures');
                await fs.mkdir(failureRoot, { recursive: true }).catch(() => undefined);
                await fs.writeFile(
                  path.join(failureRoot, `spatial-repair-attempt-${attempt}-${Date.now()}.json`),
                  `${JSON.stringify({
                    runId: repairResponse.runId,
                    model: credentials.model,
                    error: spatialRepairError.message,
                    raw: repairResponse.reportMarkdown,
                  }, null, 2)}\n`,
                  'utf8',
                ).catch(() => undefined);
                if (attempt >= spatialRepairMaxAttempts) break;
                spatialRepairHint = `\n\n上一次输出不是可解析的 JSON：${spatialRepairError.message}。请重新输出完整、符合 schema 的裸 JSON，不要省略字段、不要用 Markdown 或代码围栏。`;
              }
            }
            if (repaired) {
              const next = structuredClone(packet) as unknown as VisualDecisionPacket;
              const normalizeItems = (value: unknown, field: string): string[] => (
                Array.isArray(value)
                  ? value
                    .filter((item): item is string => typeof item === 'string')
                    .map((item) => normalizeSpatialFunctionalValue(item, field))
                    .filter((item): item is string => typeof item === 'string' && Boolean(item))
                  : []
              );
              next.mediaTranslations.spatial.functionalNetwork = Array.isArray(repaired.functionalNetwork)
                ? normalizeItems(repaired.functionalNetwork, 'functionalNetwork')
                : [];
              next.mediaTranslations.spatial.functionalRelationships = Array.isArray(repaired.functionalRelationships)
                ? normalizeItems(repaired.functionalRelationships, 'functionalRelationships')
                : [];
              next.mediaTranslations.spatial.mustBeVisible = Array.isArray(repaired.mustBeVisible)
                ? normalizeItems(repaired.mustBeVisible, 'mustBeVisible')
                : [];
              return next as unknown as Record<string, unknown>;
            }
            // Deterministic fallback: if every model attempt failed, drop the
            // flagged ambiguous / decorative items instead of hard-failing the
            // whole analysis on a flaky model response.
            const fallback = sanitizeSpatialSemanticsDeterministically(current, findings);
            return fallback.packet as unknown as Record<string, unknown>;
          },
          model: async (request: StructuredRepairModelRequest) => {
            const repairResponse = await baseReasoner({
              prompt: {
                messages: [
                  {
                    role: 'system',
                    content: '你是项目决策定向修复器。只能使用当前项目附件和提示中列出的当前项目证据，并严格按 JSON Schema 返回。',
                  },
                  { role: 'user', content: request.prompt },
                ],
                attachments,
              },
              responseSchema: request.responseSchema,
              responseSchemaName: 'analysis_repair',
              signal: controller.signal,
              maximumDurationMs: 15 * 60_000,
            });
            return repairResponse.reportMarkdown;
          },
        });
        promptSourceModelCallCount += completion.modelCallCount;
        analysisRepairAttempts = completion.attempts;
        analysisRepairStatus = completion.status;
        if (completion.status === 'requires_confirmation') {
          const questions = completion.clarificationQuestions
            .slice(0, 3)
            .map((item) => item.question)
            .join('\n');
          throw Object.assign(
            new Error(questions || '当前项目还缺少必须由你确认的真实信息。'),
            { code: 'ANALYSIS_CONFIRMATION_REQUIRED' },
          );
        }
        if (completion.status === 'failed') {
          throw Object.assign(
            new Error('项目决策完善失败，请检查当前资料后重试。'),
            { code: 'ANALYSIS_REPAIR_FAILED' },
          );
        }
        visualDecisionPacket = completion.packet as unknown as VisualDecisionPacket;
        visualDecisionPacket.validation.executionDataStatus = 'ready';
        visualDecisionPacket.validation.missingExecutionFields = [];
        promptSourceObject = visualDecisionPacketToPromptSourceObject(visualDecisionPacket);
        promptSourceObject.provenance.structuredAnalysisRunId = uvuResponse.runId || undefined;
        report = compileVisualDecisionReport(visualDecisionPacket, {
          title: `${finalProjectName}视觉方案升级报告`,
        });
      }
      if (promptSourceAssets.length && (!promptSourceObject || !visualDecisionPacket)) {
        throw Object.assign(
          new Error('PROMPT_SOURCE_INSUFFICIENT: unified visual understanding failed after repair'),
          { code: 'PROMPT_SOURCE_INSUFFICIENT' },
        );
      }
      await fs.writeFile(reportPath, report, 'utf8');
      if (path.resolve(coreReportPath) !== path.resolve(reportPath)) await fs.rm(coreReportPath, { force: true });
      if (project.lastReportFilename && project.lastReportFilename !== reportFilename) {
        await fs.rm(path.join(projectPaths.outputs, project.lastReportFilename), { force: true });
      }

      const completedAt = new Date().toISOString();
      const durationMs = Math.round(performance.now() - started);
      const runtimeReport = {
        ...execution.result.runReport,
        outputFile: reportFilename,
        analysisProfile: 'fusion-enhanced',
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
        modelCallsThisRun: Number(execution.result.runReport.modelCallsThisRun || 0)
          + promptSourceModelCallCount
      };
      const runtimeReportPath = path.join(projectPaths.runtime, 'run-report.json');
      await fs.writeFile(runtimeReportPath, `${JSON.stringify(runtimeReport, null, 2)}\n`, 'utf8');
      const updated = await projects.update(projectId, {
        projectName: finalProjectName,
        detectedProjectName: finalProjectName,
        projectNameSource: finalProjectName === project.projectName ? project.projectNameSource : 'visual-content',
        projectNameConfidence: finalProjectName === project.projectName ? project.projectNameConfidence : 0.9,
        brandName: finalProjectName === project.projectName ? project.brandName : finalProjectName,
        detectedBrandName: finalProjectName === project.projectName ? project.detectedBrandName : finalProjectName,
        factConfidence: {
          ...project.factConfidence,
          brandName: finalProjectName === project.projectName ? project.factConfidence.brandName : 0.9
        },
        status: 'completed',
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

      // Phase 1 视觉分析接口稳定化：报告成功保存后，本地确定性编译 Project Visual Context。
      // 编译失败只标记 Context 失败并保持主任务 completed；绝不删除已生成报告或重新调用模型。
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
        const contextTarget = path.join(projectPaths.outputs, 'project-visual-context.json');
        await writeProjectVisualContext(contextTarget, context);
        await projects.update(projectId, {
          visualContextFilename: 'project-visual-context.json',
          visualContextStatus: 'ready',
          visualContextSchemaVersion: PROJECT_VISUAL_CONTEXT_SCHEMA_VERSION,
          visualContextLastBuiltAt: context.generatedAt
        });
      } catch (contextError) {
        const message = contextError instanceof Error ? contextError.message : String(contextError);
        console.warn(
          JSON.stringify({ event: 'PROJECT_VISUAL_CONTEXT_COMPILE_FAILED', projectId, message })
        );
        await projects
          .update(projectId, {
            visualContextStatus: 'failed',
            visualContextLastBuiltAt: new Date().toISOString()
          })
          .catch(() => undefined);
      }

      // Project Visual Context is a sibling of the report. It is compiled only from the
      // project record and original asset inventory; report markdown is never
      // accepted by the builder.
      try {
        const previousShortChain = updated.visualContextVNextStatus === 'ready'
          ? await fs.readFile(
            path.join(projectPaths.root, 'project-context', 'project-visual-context.vnext.json'),
            'utf8',
          ).then((value) => JSON.parse(value)).catch(() => null)
          : null;
        const vnextContext = buildProjectVisualContext({
          project: updated,
          previousContext: previousShortChain,
          structuredAnalysis: promptSourceObject
            ? { promptSourceObject, visualDecisionPacket }
            : previousShortChain?.promptSourceObject
              ? {
                promptSourceObject: previousShortChain.promptSourceObject,
                visualDecisionPacket: previousShortChain.visualDecisionPacket,
              }
              : undefined,
          structuredAnalysisRunId: promptSourceRunId
            || execution.result.runReport.reasoningRunId,
        });
        await writeStructuredProjectVisualContext(
          path.join(projectPaths.root, 'project-context', 'project-visual-context.vnext.json'),
          vnextContext,
        );
        if (visualDecisionPacket) {
          await fs.writeFile(
            path.join(projectPaths.root, 'project-context', 'visual-decision-packet.json'),
            `${JSON.stringify(visualDecisionPacket, null, 2)}\n`,
            'utf8',
          );
        }
        await projects.update(projectId, {
          visualContextVNextFilename: 'project-visual-context.vnext.json',
          visualContextVNextStatus: 'ready',
          visualContextVNextVersion: vnextContext.version,
          visualContextVNextLastBuiltAt: vnextContext.generatedAt,
        });
      } catch (contextError) {
        const message = contextError instanceof Error ? contextError.message : String(contextError);
        console.warn(JSON.stringify({
          event: 'PROJECT_VISUAL_CONTEXT_VNEXT_COMPILE_FAILED',
          projectId,
          message,
        }));
        await projects.update(projectId, {
          visualContextVNextStatus: 'failed',
          visualContextVNextLastBuiltAt: new Date().toISOString(),
        }).catch(() => undefined);
      }

      progress('completed', '分析完成', {
        cacheStatus: execution.result.runReport.reasoningCacheHit ? 'hit' : 'miss'
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
      const cancelled = controller.signal.aborted || (error as Error).name === 'AbortError';
      const message = cancelled ? '用户已取消分析' : friendlyPipelineError(error as Error, credentials.apiKey);
      await projects.update(projectId, { status: cancelled ? 'cancelled' : 'failed', lastError: message });
      await fs.rm(configPath, { force: true }).catch(() => {});
      progress(cancelled ? 'cancelled' : 'failed', cancelled ? '分析已取消' : `分析失败：${message}`, {
        failedAtStage: currentStage as Exclude<AnalysisProgress['stage'], 'failed' | 'cancelled' | 'completed'>
      });
      throw new Error(message);
    } finally {
      active.delete(projectId);
    }
  }

  async function runStructuredReferenceStep<T>(options: {
    step: string;
    projectId: string;
    apiProfileId?: string;
    prompt: string;
    includeVisualAssets: boolean;
    assetIds?: string[];
    maxVisualAssets?: number;
    schemaSummary?: string;
    normalize(value: Record<string, unknown>, assetIds: string[]): T;
    validate(value: T): T;
  }): Promise<{
    value: T;
    provider: string;
    model: string;
    durationMs: number;
    modelCallCount: number;
  }> {
    if (active.has(options.projectId)) throw new Error('该项目正在执行结构化视觉分析');
    const project = await projects.get(options.projectId);
    const credentials = await readCredentials(options.apiProfileId || project.apiProfileId || undefined);
    const projectPaths = await projects.paths(options.projectId);
    const controller = new AbortController();
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const validationAuditRoot = path.join(
      projectPaths.runtime,
      'model-validation',
      options.step.replace(/[^a-z0-9_-]+/giu, '-'),
      startedAt.replace(/[:.]/gu, '-')
    );
    const persistValidationAudit = async (
      filename: string,
      payload: Record<string, unknown>
    ): Promise<void> => {
      await fs.mkdir(validationAuditRoot, { recursive: true });
      await fs.writeFile(
        path.join(validationAuditRoot, filename),
        `${JSON.stringify(payload, null, 2)}\n`,
        'utf8'
      );
    };
    active.set(options.projectId, { controller, startedAt });
    const allowedAssetIds = options.assetIds ? new Set(options.assetIds) : null;
    const visualAssets = options.includeVisualAssets
      ? (project.assets || []).filter((asset) =>
        isAnalysisSourceAsset(asset)
        && /^image\//iu.test(asset.mimeType)
        && (!allowedAssetIds || allowedAssetIds.has(asset.id)))
        .slice(0, options.maxVisualAssets || 12)
      : [];
    const attachments = visualAssets.map((asset, index) => ({
      assetId: asset.id || `visual-${String(index + 1).padStart(3, '0')}`,
      path: path.join(projectPaths.input, asset.relativePath),
      mediaType: 'image',
      format: path.extname(asset.relativePath).slice(1),
      readable: true
    }));
    if (options.includeVisualAssets && !attachments.length) {
      active.delete(options.projectId);
      throw new Error('当前模型分析步骤需要至少一张可读取图片');
    }
    const reasoner = analysisProviders.createReasoner(credentials);
    let modelCallCount = 0;
    let lastError: unknown;
    let repairContext = '';
    const structuredAttempts: StructuredStepAttempt[] = [];
    try {
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        modelCallCount += 1;
        const response = await reasoner({
          prompt: {
            messages: [
              {
                role: 'system',
                content: '你是 Masterpiece OS 的结构化视觉分析器。严格隔离项目事实与参考视觉风格，只返回请求的 JSON。'
              },
              {
                role: 'user',
                content: `${options.prompt}${repairContext}`
              }
            ],
            attachments
          },
          signal: controller.signal,
          maximumDurationMs: 15 * 60_000
        });
        const attemptRecord: StructuredStepAttempt = {
          attempt,
          completedAt: new Date().toISOString(),
          rawResponse: response.reportMarkdown.slice(0, 200_000)
        };
        try {
          const parsed = parseModelStructuredResponse(response.reportMarkdown);
          const value = options.validate(options.normalize(parsed, attachments.map((item) => item.assetId)));
          structuredAttempts.push(attemptRecord);
          await persistValidationAudit(`attempt-${attempt}.json`, {
            step: options.step,
            promptVersion: options.step,
            schemaVersion: 'runtime-schema-v1',
            provider: providerLabel(credentials.provider),
            model: response.model || credentials.model,
            attempt,
            sourceAssetIds: attachments.map((item) => item.assetId),
            validationResult: 'passed',
            rawResponse: attemptRecord.rawResponse,
            completedAt: attemptRecord.completedAt
          }).catch(() => {});
          await persistValidationAudit('final-validation.json', {
            step: options.step,
            schemaVersion: 'runtime-schema-v1',
            terminalStatus: 'passed',
            modelCallCount,
            repaired: attempt > 1,
            completedAt: new Date().toISOString()
          }).catch(() => {});
          return {
            value,
            provider: providerLabel(credentials.provider),
            model: response.model || credentials.model,
            durationMs: Math.round(performance.now() - started),
            modelCallCount
          };
        } catch (error) {
          lastError = error;
          const structuredError = error as Error & {
            code?: string;
            issues?: string[];
            details?: unknown;
          };
          attemptRecord.validationError = {
            code: structuredError.code,
            message: structuredError.message,
            issues: structuredError.issues,
            details: structuredError.details
          };
          structuredAttempts.push(attemptRecord);
          const validationIssues = (
            structuredError.details
            && typeof structuredError.details === 'object'
            && Array.isArray((structuredError.details as { issues?: unknown[] }).issues)
          )
            ? (structuredError.details as { issues: ValidationIssue[] }).issues
            : [];
          repairContext = validationIssues.length
            ? compileRepairPrompt({
              issues: validationIssues,
              schemaSummary: options.schemaSummary || '保持原输出完整结构和字段类型。',
              attempt,
              maxAttempts: maxAttempts - 1
            })
            : `\n\n上一次输出未通过 Schema／质量校验：${structuredError.message}。
请逐项修复失败内容，保留所有已正确字段，并重新输出完整 JSON，不要解释。`;
          await persistValidationAudit(`attempt-${attempt}.json`, {
            step: options.step,
            promptVersion: options.step,
            schemaVersion: 'runtime-schema-v1',
            provider: providerLabel(credentials.provider),
            model: response.model || credentials.model,
            attempt,
            sourceAssetIds: attachments.map((item) => item.assetId),
            validationResult: 'failed',
            validationError: attemptRecord.validationError,
            rawResponse: attemptRecord.rawResponse,
            repairPrompt: repairContext,
            completedAt: attemptRecord.completedAt
          }).catch(() => {});
        }
      }
      throw lastError instanceof Error ? lastError : new Error('结构化视觉分析未通过校验');
    } catch (error) {
      const cancelled = controller.signal.aborted || (error as Error).name === 'AbortError';
      if (cancelled) throw Object.assign(new Error('用户已取消分析'), { code: 'CANCELLED' });
      const source = error as Error & {
        code?: string;
        issues?: string[];
        details?: unknown;
      };
      await persistValidationAudit('final-validation.json', {
        step: options.step,
        schemaVersion: 'runtime-schema-v1',
        terminalStatus: 'failed',
        modelCallCount,
        errorCode: source.code,
        errorMessage: source.message,
        completedAt: new Date().toISOString()
      }).catch(() => {});
      throw preservePipelineError(Object.assign(source, {
        structuredStep: options.step,
        structuredAttempts
      }), credentials.apiKey);
    } finally {
      active.delete(options.projectId);
    }
  }

  async function selectCurrentProjectAssets(
    projectId: string,
    apiProfileId?: string,
    runtimeContext?: ProjectRuntimeContext
  ) {
    const project = await projects.get(projectId);
    const assets = (project.assets || []).filter((asset) =>
      isAnalysisSourceAsset(asset) && asset.status !== 'deleted' && /^image\//iu.test(asset.mimeType));
    if (!assets.length) {
      return {
        value: [] as CurrentProjectAssetDecision[],
        provider: 'local',
        model: 'deterministic-fallback',
        durationMs: 0,
        modelCallCount: 0
      };
    }
    const results: Awaited<ReturnType<typeof runStructuredReferenceStep<CurrentProjectAssetDecision[]>>>[] = [];
    for (let offset = 0; offset < assets.length; offset += 30) {
      const batch = assets.slice(offset, offset + 30);
      results.push(await runStructuredReferenceStep<CurrentProjectAssetDecision[]>({
        step: `current-project-asset-selection-${Math.floor(offset / 30) + 1}`,
        projectId,
        apiProfileId,
        prompt: buildCurrentProjectAssetSelectionPrompt(project, batch),
        includeVisualAssets: true,
        assetIds: batch.map((asset) => asset.id),
        maxVisualAssets: 30,
        schemaSummary: MODEL_SCHEMA_REGISTRY.assetAuthenticity.summary,
        normalize: (raw) => normalizeCurrentProjectDecisions(
          raw.decisions,
          batch,
          runtimeContext
        ),
        validate: (value) => {
          if (value.length !== batch.length) {
            throw Object.assign(new Error('当前项目资产筛选结果未覆盖当前批次全部可视资产'), {
              code: 'CURRENT_CORE_PACK_INCOMPLETE'
            });
          }
          return value;
        }
      }));
    }
    return {
      value: results.flatMap((item) => item.value),
      provider: results[0]!.provider,
      model: results[0]!.model,
      durationMs: results.reduce((sum, item) => sum + item.durationMs, 0),
      modelCallCount: results.reduce((sum, item) => sum + item.modelCallCount, 0)
    };
  }

  async function selectReferenceAssets(projectId: string, apiProfileId?: string) {
    const project = await projects.get(projectId);
    const assets = (project.assets || []).filter((asset) =>
      isAnalysisSourceAsset(asset) && asset.status !== 'deleted' && /^image\//iu.test(asset.mimeType));
    const results: Awaited<ReturnType<typeof runStructuredReferenceStep<ReferenceAssetDecision[]>>>[] = [];
    for (let offset = 0; offset < assets.length; offset += 30) {
      const batch = assets.slice(offset, offset + 30);
      results.push(await runStructuredReferenceStep<ReferenceAssetDecision[]>({
        step: `reference-master-set-selection-${Math.floor(offset / 30) + 1}`,
        projectId,
        apiProfileId,
        prompt: buildReferenceAssetSelectionPrompt(batch),
        includeVisualAssets: true,
        assetIds: batch.map((asset) => asset.id),
        maxVisualAssets: 30,
        schemaSummary: MODEL_SCHEMA_REGISTRY.referenceAssets.summary,
        normalize: (raw) => normalizeReferenceDecisions(
          raw.decisions,
          batch
        ),
        validate: (value) => {
          if (value.length !== batch.length) {
            throw Object.assign(new Error('参考资产筛选结果未覆盖当前批次全部可视资产'), {
              code: 'REFERENCE_MASTER_SET_INSUFFICIENT'
            });
          }
          return value;
        }
      }));
    }
    return {
      value: results.flatMap((item) => item.value),
      provider: results[0]!.provider,
      model: results[0]!.model,
      durationMs: results.reduce((sum, item) => sum + item.durationMs, 0),
      modelCallCount: results.reduce((sum, item) => sum + item.modelCallCount, 0)
    };
  }

  async function analyzeCurrentProjectProfile(
    projectId: string,
    apiProfileId?: string,
    purpose: VisualAnalysisPurpose = 'current_project_audit',
    assetIds?: string[]
  ) {
    if (purpose !== 'current_project_audit') throw new Error(`不支持的当前项目分析用途：${purpose}`);
    const project = await projects.get(projectId);
    return runStructuredReferenceStep<CurrentProjectProfile>({
      step: 'current-project-profile',
      projectId,
      apiProfileId,
      prompt: buildCurrentProjectFactsPrompt(project),
      includeVisualAssets: true,
      assetIds,
      schemaSummary: ProjectFactsSchema.summary,
      normalize: (raw, assetIds) => {
        const parsedFacts = parseProjectFactsModelOutput(raw);
        const classifiedTouchpoints = normalizeProjectTouchpointClassification({
          packagingStructures: parsedFacts.packagingStructures,
          touchpointInventory: parsedFacts.touchpointInventory
        });
        const identity = resolveAnalyzedProjectIdentity(project, parsedFacts.brandName);
        return {
          schemaVersion: 'current-project-profile-v3',
          projectId: project.id,
          projectName: identity.projectName,
          brandName: identity.brandName,
          industry: !incompleteFact(project.industry)
            ? project.industry
            : parsedFacts.industry || project.detectedIndustry || '',
          coreProducts: parsedFacts.coreProducts,
          targetAudience: parsedFacts.targetAudience,
          targetAudienceDetails: buildAudienceFacts(parsedFacts.targetAudience, assetIds),
          brandPositioning: parsedFacts.brandPositioning,
          pricePositioning: parsedFacts.pricePositioning,
          usageScenarios: parsedFacts.usageScenarios,
          businessTouchpoints: parsedFacts.businessTouchpoints,
          packagingStructures: classifiedTouchpoints.packagingStructures,
          visualSources: parsedFacts.visualSources,
          touchpointInventory: classifiedTouchpoints.touchpointInventory,
          lockedAssets: [...new Set([
            ...(project.logoLocked ? ['当前项目原始 Logo'] : []),
            ...(project.logoFiles || []),
            ...(project.lockedFacts || [])
          ])],
          confirmedFacts: parsedFacts.confirmedFacts,
          sourceArtifactIds: [`project:${project.id}`, ...assetIds],
          currentVisualAssets: (project.assets || []).filter(isAnalysisSourceAsset).map((asset) => asset.originalName)
        };
      },
      validate: (value) => assertCurrentProjectProfile(value)
    });
  }

  async function analyzeReferenceStyle(
    projectId: string,
    apiProfileId?: string,
    purpose: VisualAnalysisPurpose = 'reference_style',
    assetIds?: string[],
    currentProject?: ReferencePackagingProjectInput,
  ) {
    if (purpose !== 'reference_style') throw new Error(`不支持的参考视觉分析用途：${purpose}`);
    if (!currentProject || currentProject.projectId.trim() === '') {
      throw Object.assign(new Error('Reference semantic producer requires current project truth'), {
        code: 'CURRENT_PROJECT_CONTEXT_MISSING',
      });
    }
    return runStructuredReferenceStep<ReferenceFirstAnalysisOutput>({
      step: 'reference-style-profile',
      projectId,
      apiProfileId,
      prompt: buildReferenceStylePrompt(currentProject),
      includeVisualAssets: true,
      assetIds,
      normalize: normalizeReferenceFirstAnalysisOutput,
      validate: (value) => ({
        referenceStyleProfile: validateReferenceStyleProfile(
          value.referenceStyleProfile,
          value.referenceStyleProfile.excludedIdentityTerms,
        ),
        packagingTranslation: value.packagingTranslation,
      }),
    });
  }

  async function generateVisualReconstructionDecision(input: {
    projectId: string;
    apiProfileId?: string;
    currentProjectProfile: CurrentProjectProfile;
    referenceStyleProfile: ReferenceStyleProfile;
    preference?: string;
  }) {
    return runStructuredReferenceStep<VisualReconstructionDirection>({
      step: 'visual-reconstruction-decision',
      projectId: input.projectId,
      apiProfileId: input.apiProfileId,
      prompt: buildVisualReconstructionDecisionPrompt(input),
      includeVisualAssets: false,
      normalize: (raw) => {
        const touchpoints = raw.touchpointRules && typeof raw.touchpointRules === 'object'
          ? raw.touchpointRules as Record<string, unknown>
          : {};
        const anchor = visualAnchorValue(raw.visualAnchor || raw.visualAnchorDefinition);
        const flexibleColorSystem = flexibleColorSystemValue(raw.flexibleColorSystem);
        const flexibleCompositionSystem = flexibleCompositionSystemValue(raw.flexibleCompositionSystem);
        const direction: VisualReconstructionDirection = {
          directionName: directionNameValue(raw.directionName, input.currentProjectProfile.brandName),
          coreProposition: String(raw.coreProposition || raw.coreVisualDirection || '').trim(),
          visualAnchor: [anchor.transformationLogic, anchor.visualForm].filter(Boolean).join('；'),
          visualAnchorDefinition: anchor,
          executionDetailLevel: 'gpt_visual',
          referenceInheritance: referenceInheritanceValue(raw.referenceInheritance),
          currentProjectIdentityToRetain: directionTextArray(raw.currentProjectIdentityToRetain),
          currentVisualElementsToRedesign: directionTextArray(raw.currentVisualElementsToRedesign),
          flexibleCompositionSystem,
          compositionSystem: [
            ...flexibleCompositionSystem.fixedPrinciples,
            ...flexibleCompositionSystem.allowedVariations,
            ...flexibleCompositionSystem.seriesConsistencyRules,
            ...flexibleCompositionSystem.prohibitedLayouts.map((item) => `禁止：${item}`)
          ],
          graphicSystem: directionTextArray(raw.graphicSystem),
          flexibleColorSystem,
          colorSystem: [
            flexibleColorSystem.identityColorRole,
            ...flexibleColorSystem.backgroundOptions,
            ...flexibleColorSystem.textAndStructureColors,
            ...flexibleColorSystem.accentOptions,
            flexibleColorSystem.saturationGuideline,
            ...flexibleColorSystem.touchpointVariations
          ].filter(Boolean),
          typographySystem: directionTextArray(raw.typographySystem),
          materialSystem: directionTextArray(raw.materialSystem),
          lightingSystem: directionTextArray(raw.lightingSystem),
          photographySystem: directionTextArray(raw.photographySystem),
          touchpointRules: {
            packaging: valueArray(touchpoints.packaging),
            poster: valueArray(touchpoints.poster),
            vi: valueArray(touchpoints.vi),
            space: valueArray(touchpoints.space)
          },
          prohibitedActions: valueArray(raw.prohibitedActions)
        };
        return completeVisualDirectionTouchpoints(
          direction,
          input.currentProjectProfile,
          input.referenceStyleProfile
        );
      },
      validate: (value) => {
        validateVisualDirectionExecutability(value, input.currentProjectProfile);
        return value;
      }
    });
  }

  function cancel(projectId: string): boolean {
    const run = active.get(projectId);
    if (!run) return false;
    run.controller.abort();
    return true;
  }

  function isActive(projectId: string): boolean {
    return active.has(projectId);
  }

  const ORPHANED_PROJECT_MESSAGE = '应用在分析运行期间异常退出，任务已自动标记为失败；现在可以删除项目或重新分析。';

  /**
   * 僵尸项目自动降级：项目记录为 running 但当前进程没有对应的活跃分析任务，
   * 说明应用在分析期间异常退出（start 总是先登记 active 再写盘 running）。
   * 降级为 failed，解除“正在分析的项目不能删除”的永久锁死。
   */
  async function reconcileOrphanedProject(project: ProjectRecord): Promise<ProjectRecord> {
    if (project.status !== 'running' || active.has(project.id)) return project;
    try {
      return await projects.update(project.id, { status: 'failed', lastError: project.lastError || ORPHANED_PROJECT_MESSAGE });
    } catch {
      // 写盘失败也返回降级后的视图，避免 UI 永久显示“运行中”
      return { ...project, status: 'failed', lastError: project.lastError || ORPHANED_PROJECT_MESSAGE };
    }
  }

  return {
    start,
    selectCurrentProjectAssets,
    selectReferenceAssets,
    analyzeCurrentProjectProfile,
    analyzeReferenceStyle,
    generateVisualReconstructionDecision,
    cancel,
    isActive,
    reconcileOrphanedProject
  };
}

export type PipelineService = ReturnType<typeof createPipelineService>;
