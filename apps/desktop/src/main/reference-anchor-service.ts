/**
 * Phase 3「参考视觉转换 Anchor 工作流」服务层。
 *
 * 职责（持久化 + 编排；纯逻辑在 reference-anchor-core.ts）：
 * - reference-runs/<run-id>/ 目录结构：input/ outputs/ runtime/ debug/（§6）
 * - 5 阶段流水线：00-load-current-project → 01-reference-analysis →
 *   02-style-capsule → 03-anchor-brief → 04-anchor-decision（§4/§5）
 * - 全程仅 1 次模型调用（pipeline.analyzeReferenceStyle，视觉模型）；胶囊与 Brief 本地确定性编译
 * - §12 阻断门（CURRENT_PROJECT_CONTEXT_MISSING / REFERENCE_BRAND_IDENTITY_LEAK / ...）
 * - §13 AnchorDecision 与重试范围：改 Brief 只重编 Brief；改偏好重编胶囊+Brief；
 *   换参考图重新分析；当前项目不变永不重跑视觉分析
 * - §16 分层缓存：参考分析结果 / 合并上下文落盘复用，重试路径零模型调用
 * - 僵尸任务自动降级（应用异常退出后 running 状态回收）
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  AnchorAspectRatio,
  AnchorDecision,
  DocumentVisualContext,
  ProjectVisualContext,
  PublicSettings,
  ReferenceAnchorProgress,
  ReferenceAnchorResult,
  ReferenceAnchorRun,
  ReferenceAnchorRunStatus,
  ReferenceAnchorStage,
  ReferenceAnchorWarning,
  ReferenceAssetSelection,
  ReferenceStyleCapsule,
  ReferenceStyleProfile,
  StartReferenceAnchorInput
} from '../shared/types';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import { appendRuntimeEvent } from './runtime/event-log.ts';
import { RunWriteCoordinator } from './runtime/run-write-coordinator.ts';
import { assertInside } from './analysis-contract.ts';
import { inspectReferenceAssets } from './reference-translation-service.ts';
import type { ProjectStore } from './project-store.ts';
import type { PipelineService } from './pipeline-service.ts';
import type { ProjectContextService } from './project-context-service.ts';
import type { DocumentContextService } from './document-context-service.ts';
import {
  adaptLegacyReferenceResultToStyleCapsule,
  compileAnchorBrief,
  compileCapsuleMarkdown,
  compileReferenceStyleCapsule,
  detectReferenceIdentityLeaks,
  detectReferenceSignatureReentry,
  ensureProjectFacts,
  filterStyleCapsuleForTask,
  mergeCurrentProjectContext,
  validateAnchorBrief,
  validateReferenceStyleCapsule,
  type MergedCurrentProject
} from './reference-anchor-core.ts';

type SettingsReader = () => Promise<PublicSettings> | PublicSettings;
type ProgressSink = (progress: ReferenceAnchorProgress) => void;

interface ReferenceAnchorDependencies {
  projects: ProjectStore;
  pipeline: PipelineService;
  projectContext: ProjectContextService;
  documentContext: DocumentContextService;
  emitProgress?: ProgressSink;
}

interface ActiveRun {
  cancelled: boolean;
  pipelineProjectId?: string;
  startedAt: string;
}

const RUN_ID_PATTERN = /^[a-f0-9-]{36}$/i;
const MIN_REFERENCE_ASSETS = 4;
const MAX_REFERENCE_ASSETS = 8;
const CAPSULE_FILENAME = 'reference-style-capsule.json';
const CAPSULE_MD_FILENAME = '参考风格胶囊.md';
const BRIEF_FILENAME = 'Anchor-Generation-Brief.md';

// 应用运行期间才可能处于这些状态；重启后发现它们即为僵尸任务
const EXECUTING_STATUSES: ReadonlySet<ReferenceAnchorRunStatus> = new Set([
  'pending', 'preparing', 'analyzing_reference', 'compiling_capsule', 'compiling_brief'
]);

const STAGE_MESSAGES: Record<ReferenceAnchorStage, string> = {
  '00-load-current-project': '正在加载当前项目身份与 Locked Assets',
  '01-reference-analysis': '正在分析参考视觉关系',
  '02-style-capsule': '正在编译参考风格胶囊',
  '03-anchor-brief': '正在编译 Anchor Generation Brief',
  '04-anchor-decision': '等待设计师确认 Anchor 方向'
};

const ORPHANED_RUN_MESSAGE = '应用在任务运行期间异常退出，任务已自动标记为失败；可以删除或重新开始。';

function safeRunId(runId: string): string {
  if (!RUN_ID_PATTERN.test(String(runId || ''))) throw new Error('Reference Anchor Run ID 无效');
  return runId;
}

function blockingError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

async function writeJson(filename: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) {
    throw blockingError('REFERENCE_ANCHOR_WRITE_FAILED', `写入文件失败（${path.basename(filename)}）：${result.errorMessage}`);
  }
}

async function readJson<T>(filename: string): Promise<T> {
  return JSON.parse(await fs.readFile(filename, 'utf8')) as T;
}

export function createReferenceAnchorService(
  readSettings: SettingsReader,
  dependencies: ReferenceAnchorDependencies
) {
  const active = new Map<string, ActiveRun>();
  const writeCoordinator = new RunWriteCoordinator((metrics) => {
    console.info(JSON.stringify({
      event: metrics.success ? 'REFERENCE_ANCHOR_WRITE_SUCCEEDED' : 'REFERENCE_ANCHOR_WRITE_FAILED',
      run_id: metrics.runId,
      operation: metrics.operation,
      write_duration_ms: metrics.durationMs
    }));
  });

  async function dataRoot(): Promise<string> {
    const settings = await readSettings();
    return path.join(path.resolve(settings.defaultDataPath), 'reference-runs');
  }

  async function runRoot(runId: string): Promise<string> {
    return path.join(await dataRoot(), safeRunId(runId));
  }

  async function recordPath(runId: string): Promise<string> {
    return path.join(await runRoot(runId), 'runtime', 'run.json');
  }

  async function rawSaveRun(record: ReferenceAnchorRun): Promise<ReferenceAnchorRun> {
    await writeJson(await recordPath(record.id), record);
    return record;
  }

  async function saveRun(record: ReferenceAnchorRun): Promise<ReferenceAnchorRun> {
    return writeCoordinator.enqueue(record.id, 'run-projection', () => rawSaveRun(record));
  }

  async function readRun(runId: string): Promise<ReferenceAnchorRun> {
    return readJson<ReferenceAnchorRun>(await recordPath(runId));
  }

  /** 僵尸任务自动降级：磁盘为执行中状态但内存 active 表没有 → 应用曾异常退出。 */
  async function reconcileOrphanedRun(record: ReferenceAnchorRun): Promise<ReferenceAnchorRun> {
    if (!EXECUTING_STATUSES.has(record.status) || active.has(record.id)) return record;
    // 已有正式胶囊与 Brief 产物的任务回到人工决策阶段而非直接失败
    const root = await runRoot(record.id);
    const hasOutputs = await Promise.all([
      fs.access(path.join(root, 'outputs', CAPSULE_FILENAME)).then(() => true).catch(() => false),
      fs.access(path.join(root, 'outputs', BRIEF_FILENAME)).then(() => true).catch(() => false)
    ]).then(([capsule, brief]) => capsule && brief);
    const downgraded: ReferenceAnchorRun = hasOutputs
      ? { ...record, status: 'awaiting_decision', currentStage: '04-anchor-decision', errorCode: null, lastError: null }
      : { ...record, status: 'failed', errorCode: record.errorCode || 'MODEL_CALL_FAILED', lastError: record.lastError || ORPHANED_RUN_MESSAGE };
    try {
      const saved = await saveRun(downgraded);
      await appendRuntimeEvent(path.join(root, 'runtime'), record.id, 'ORPHANED_RUN_RECONCILED', {
        previous_status: record.status,
        next_status: downgraded.status
      });
      return saved;
    } catch {
      return downgraded;
    }
  }

  async function getRun(runId: string): Promise<ReferenceAnchorRun> {
    const record = await readRun(safeRunId(runId)).catch(() => null);
    if (!record) throw new Error('Reference Anchor 运行记录不存在');
    return reconcileOrphanedRun(record);
  }

  async function listRuns(): Promise<ReferenceAnchorRun[]> {
    const root = await dataRoot();
    const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
    const records = await Promise.all(entries
      .filter((entry) => entry.isDirectory() && RUN_ID_PATTERN.test(entry.name))
      .map((entry) => getRun(entry.name).catch(() => null)));
    return records
      .filter((record): record is ReferenceAnchorRun => Boolean(record))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async function inspectAssets(paths: string[]): Promise<ReferenceAssetSelection> {
    return inspectReferenceAssets(paths);
  }

  function emit(record: ReferenceAnchorRun, stage: ReferenceAnchorStage, startedAt: string, startedTick: number): void {
    dependencies.emitProgress?.({
      runId: record.id,
      projectName: record.projectName,
      stage,
      status: record.status,
      message: STAGE_MESSAGES[stage],
      startedAt,
      elapsedMs: Math.round(performance.now() - startedTick),
      model: record.model
    });
  }

  function assertNotCancelled(runId: string): void {
    if (active.get(runId)?.cancelled) throw blockingError('CANCELLED', '用户已取消 Anchor 分析');
  }

  // ── §11/§12 加载与合并当前项目上下文 ──

  interface LoadedContext {
    visual: ProjectVisualContext;
    document: DocumentVisualContext | null;
    merged: MergedCurrentProject;
    warnings: ReferenceAnchorWarning[];
  }

  async function loadCurrentProjectContext(projectId: string, documentRunId?: string | null): Promise<LoadedContext> {
    let visual: ProjectVisualContext;
    try {
      visual = await dependencies.projectContext.get(projectId);
    } catch (error) {
      throw blockingError(
        'CURRENT_PROJECT_CONTEXT_MISSING',
        `当前项目视觉上下文缺失：${(error as Error).message}。请先在项目页完成视觉分析并生成 project-visual-context.json`
      );
    }
    const brandName = String(visual.identity?.brandName || '').trim();
    const projectName = String(visual.identity?.projectName || '').trim();
    if (!brandName && !projectName) {
      throw blockingError('CURRENT_PROJECT_IDENTITY_MISSING', '当前项目品牌名与项目名均缺失，无法进行身份隔离，请先补全项目身份');
    }
    const warnings: ReferenceAnchorWarning[] = [];
    let document: DocumentVisualContext | null = null;
    if (documentRunId) {
      document = await dependencies.documentContext.getExtracted(documentRunId).catch(() => null);
      if (!document) {
        warnings.push({ code: 'DOCUMENT_CONTEXT_UNAVAILABLE', message: '所选文档上下文任务不可用，已仅使用当前项目视觉上下文' });
      }
    }
    const merged = mergeCurrentProjectContext({ visual, ...(document ? { document } : {}) });
    if (String(visual.packaging?.status || 'unknown') !== 'confirmed') {
      warnings.push({ code: 'PACKAGING_STRUCTURE_UNCERTAIN', message: '当前项目包装结构未确认，Anchor 中的包装形态需人工复核' });
    }
    if (document && !document.targetAudience?.length) {
      warnings.push({ code: 'TARGET_AUDIENCE_UNKNOWN', message: '文档上下文未提供目标人群信息' });
    }
    return { visual, document, merged, warnings };
  }

  // ── 编译 + 校验 + 落盘（02/03 阶段共用；重试路径零模型调用）──

  interface CompileParams {
    record: ReferenceAnchorRun;
    merged: MergedCurrentProject;
    visual: ProjectVisualContext;
    referenceStyle: ReferenceStyleProfile;
    preference: string | null;
    avoidance: string[];
    aspectRatio?: AnchorAspectRatio;
    baseWarnings: ReferenceAnchorWarning[];
    startedAt: string;
    startedTick: number;
  }

  async function compileAndPersist(params: CompileParams): Promise<ReferenceAnchorResult> {
    const { record, visual, referenceStyle } = params;
    // v5.3.1 §3：兜底重建事实分类（旧缓存 merged 可能缺 facts）。
    const merged: MergedCurrentProject = { ...params.merged, facts: ensureProjectFacts(params.merged) };
    const root = await runRoot(record.id);

    // 02-style-capsule
    let running = await saveRun({ ...record, status: 'compiling_capsule', currentStage: '02-style-capsule' });
    emit(running, '02-style-capsule', params.startedAt, params.startedTick);
    const compiled = compileReferenceStyleCapsule({
      runId: record.id,
      projectId: record.projectId,
      merged,
      referenceStyle,
      userPreference: params.preference,
      userAvoidance: params.avoidance,
      aspectRatio: params.aspectRatio
    });
    const capsule = compiled.capsule;

    // §12 参考身份隔离硬阻断（确定性兜底）
    const inheritedRules = [
      ...capsule.inheritedStyle.color,
      ...capsule.inheritedStyle.layoutAndTypography,
      ...capsule.inheritedStyle.graphicLanguage,
      ...capsule.inheritedStyle.materialAndPhotography,
      ...capsule.inheritedStyle.extensionMechanism
    ];
    const currentIdentityTerms = [
      merged.brandName,
      visual.identity?.projectName || '',
      merged.industry
    ].filter(Boolean);
    const leaks = detectReferenceIdentityLeaks(
      inheritedRules,
      capsule.anchorGoal,
      referenceStyle.excludedIdentityTerms || [],
      currentIdentityTerms
    );
    if (leaks.length) {
      const first = leaks[0]!;
      await writeJson(path.join(root, 'debug', 'validation-details.json'), {
        terminalStatus: 'blocked',
        identityLeaks: leaks
      });
      throw blockingError(first.code, `${first.message}：${first.rule.slice(0, 80)}`);
    }

    // v5.3.1 §4.4 参考专属元素回流硬阻断：正向规则 / anchorGoal 中不得出现禁止的表层专属元素。
    const positiveRules = [...inheritedRules, capsule.anchorGoal];
    const reentry = detectReferenceSignatureReentry(positiveRules, compiled.prohibitedSurfaceElements);
    if (reentry.length) {
      const first = reentry[0]!;
      await writeJson(path.join(root, 'debug', 'validation-details.json'), {
        terminalStatus: 'blocked',
        code: 'PROHIBITED_REFERENCE_ELEMENT_IN_POSITIVE_RULES',
        conflicts: reentry
      });
      throw blockingError(
        'PROHIBITED_REFERENCE_ELEMENT_IN_POSITIVE_RULES',
        `参考专属表层元素「${first.value}」回流到正向继承规则，必须抽象为机制后再使用`
      );
    }

    // §12 Schema 硬校验
    const capsuleValidation = validateReferenceStyleCapsule(capsule);
    if (!capsuleValidation.valid) {
      throw blockingError('SCHEMA_VALIDATION_FAILED', `参考风格胶囊未通过 Schema 校验：${capsuleValidation.errors.join('；')}`);
    }

    // 03-anchor-brief（本地确定性编译）
    running = await saveRun({ ...running, status: 'compiling_brief', currentStage: '03-anchor-brief' });
    emit(running, '03-anchor-brief', params.startedAt, params.startedTick);
    const capsuleMarkdown = compileCapsuleMarkdown(capsule);
    const briefMarkdown = compileAnchorBrief(capsule);
    if (!briefMarkdown.trim()) throw blockingError('ANCHOR_BRIEF_EMPTY', 'Anchor Generation Brief 为空');
    const briefValidation = validateAnchorBrief(briefMarkdown);
    if (!briefValidation.valid) {
      throw blockingError('SCHEMA_VALIDATION_FAILED', `Anchor Brief 未通过校验：${briefValidation.errors.join('；')}`);
    }
    // v5.3.1 §4.4 Brief 级回流阻断：禁止表层元素不得出现在 Brief 的正向规则区域。
    // 注意：只扫描 §A–§E + 继承风格块（正向内容）；§F 禁止事项 / §H 人工注意事项
    // 按定义会列举被禁元素名，必须排除，否则必然误报。
    const briefPositivePart = briefMarkdown.split(/\n## [F-H]\./u)[0] || briefMarkdown;
    const briefReentry = detectReferenceSignatureReentry([briefPositivePart], compiled.prohibitedSurfaceElements);
    if (briefReentry.length) {
      throw blockingError(
        'REFERENCE_SIGNATURE_REENTERED_ANCHOR_BRIEF',
        `Anchor Brief 中出现参考专属表层元素「${briefReentry[0]!.value}」，必须抽象为机制`
      );
    }

    const warnings: ReferenceAnchorWarning[] = [...params.baseWarnings, ...compiled.warnings];

    // §6 正式产物 + debug 产物落盘
    await fs.mkdir(path.join(root, 'outputs'), { recursive: true });
    await fs.mkdir(path.join(root, 'debug'), { recursive: true });
    await Promise.all([
      writeJson(path.join(root, 'outputs', CAPSULE_FILENAME), capsule),
      fs.writeFile(path.join(root, 'outputs', CAPSULE_MD_FILENAME), capsuleMarkdown, 'utf8'),
      fs.writeFile(path.join(root, 'outputs', BRIEF_FILENAME), briefMarkdown, 'utf8'),
      writeJson(path.join(root, 'debug', 'validation-details.json'), {
        terminalStatus: 'passed',
        capsuleValidation,
        briefValidation,
        identityLeaks: [],
        warnings
      })
    ]);

    // 04-anchor-decision：等待设计师确认
    const awaiting: ReferenceAnchorRun = {
      ...running,
      status: 'awaiting_decision',
      decision: 'pending',
      currentStage: '04-anchor-decision',
      preference: params.preference,
      avoidance: params.avoidance,
      warnings,
      briefFilename: BRIEF_FILENAME,
      errorCode: null,
      lastError: null
    };
    const saved = await saveRun(awaiting);
    emit(saved, '04-anchor-decision', params.startedAt, params.startedTick);
    await appendRuntimeEvent(path.join(root, 'runtime'), record.id, 'CAPSULE_AND_BRIEF_COMPILED', {
      warnings: warnings.length,
      brief_chars: briefValidation.lengthChars
    }).catch(() => undefined);
    return { run: saved, capsule, capsuleMarkdown, briefMarkdown };
  }

  // ── 主流程 start（§4/§5：全程 1 次模型调用）──

  async function start(input: StartReferenceAnchorInput): Promise<ReferenceAnchorResult> {
    const currentProjectId = String(input?.currentProjectId || '').trim();
    if (!currentProjectId) throw blockingError('CURRENT_PROJECT_CONTEXT_MISSING', '请先选择当前项目');
    const referencePaths = [...new Set((input?.referenceAssetPaths || []).map((item) => path.resolve(item)))];
    if (!referencePaths.length) throw blockingError('REFERENCE_ASSETS_MISSING', '请至少上传 1 张参考图（建议 4–8 张核心参考图）');

    const settings = await readSettings();
    const project = await dependencies.projects.get(currentProjectId);
    const enabledProfile = (profileId?: string | null): string | undefined =>
      settings.profiles.some((profile) => profile.id === profileId && profile.isEnabled) ? profileId! : undefined;
    const apiProfileId = enabledProfile(input.apiProfileId)
      || enabledProfile(project.apiProfileId)
      || enabledProfile(settings.defaultProfileId)
      || undefined;
    if (!apiProfileId) throw new Error('请先在设置中配置并启用 API Profile');

    const preference = String(input.preference || '').slice(0, 500).trim() || null;
    const avoidance = [...new Set((input.avoidance || []).map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 12);

    const runId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const startedTick = performance.now();
    active.set(runId, { cancelled: false, startedAt: createdAt });

    const baseWarnings: ReferenceAnchorWarning[] = [];
    let usedPaths = referencePaths;
    if (referencePaths.length < MIN_REFERENCE_ASSETS) {
      baseWarnings.push({ code: 'REFERENCE_ASSETS_TOO_FEW', message: `参考图仅 ${referencePaths.length} 张（建议 ${MIN_REFERENCE_ASSETS}–${MAX_REFERENCE_ASSETS} 张），风格判断可能不稳定` });
    } else if (referencePaths.length > MAX_REFERENCE_ASSETS) {
      usedPaths = referencePaths.slice(0, MAX_REFERENCE_ASSETS);
      baseWarnings.push({ code: 'REFERENCE_ASSETS_TRUNCATED', message: `参考图超过 ${MAX_REFERENCE_ASSETS} 张，已仅使用前 ${MAX_REFERENCE_ASSETS} 张核心参考` });
    }

    let record: ReferenceAnchorRun = {
      id: runId,
      projectId: currentProjectId,
      projectName: project.projectName || project.brandName || '当前项目',
      status: 'preparing',
      decision: 'pending',
      apiProfileId,
      provider: '',
      model: '',
      referenceAssetCount: usedPaths.length,
      referenceAssetNames: usedPaths.map((item) => path.basename(item)),
      documentRunId: input.documentRunId || null,
      preference,
      avoidance,
      createdAt,
      startedAt: createdAt,
      currentStage: '00-load-current-project',
      modelCallCount: 0,
      retryCount: 0,
      warnings: [],
      errorCode: null,
      lastError: null,
      briefFilename: null
    };
    record = await saveRun(record);
    const root = await runRoot(runId);
    await appendRuntimeEvent(path.join(root, 'runtime'), runId, 'RUN_CREATED', { project_id: currentProjectId }).catch(() => undefined);
    emit(record, '00-load-current-project', createdAt, startedTick);

    let referenceProjectId: string | null = null;
    try {
      // 00-load-current-project（§11 合并只读视图；§12 上下文/身份缺失硬阻断）
      const loaded = await loadCurrentProjectContext(currentProjectId, input.documentRunId);
      baseWarnings.push(...loaded.warnings);
      await fs.mkdir(path.join(root, 'input'), { recursive: true });
      await writeJson(path.join(root, 'input', 'current-project-context.json'), {
        visual: loaded.visual,
        document: loaded.document,
        merged: loaded.merged
      });

      // 参考图复制到 input/（§16 换参考图才需要重新分析）
      const assetsDir = path.join(root, 'input', 'reference-assets');
      await fs.mkdir(assetsDir, { recursive: true });
      for (let index = 0; index < usedPaths.length; index += 1) {
        const source = usedPaths[index]!;
        const stat = await fs.stat(source).catch(() => null);
        if (!stat?.isFile()) throw blockingError('REFERENCE_ASSETS_MISSING', `参考图不存在：${path.basename(source)}`);
        await fs.copyFile(source, path.join(assetsDir, `${String(index + 1).padStart(2, '0')}-${path.basename(source)}`));
      }
      assertNotCancelled(runId);

      // 01-reference-analysis：唯一一次模型调用（视觉模型识别参考视觉关系 + 品牌身份隔离）
      record = await saveRun({ ...record, status: 'analyzing_reference', currentStage: '01-reference-analysis' });
      emit(record, '01-reference-analysis', createdAt, startedTick);
      const referenceProject = await dependencies.projects.create({ sourcePaths: usedPaths, apiProfileId });
      referenceProjectId = referenceProject.id;
      const activeRun = active.get(runId);
      if (activeRun) activeRun.pipelineProjectId = referenceProject.id;
      await dependencies.projects.scan(referenceProject.id);
      assertNotCancelled(runId);
      let referenceStyle: ReferenceStyleProfile;
      let provider = '';
      let model = '';
      let modelCallCount = 0;
      try {
        const result = await dependencies.pipeline.analyzeReferenceStyle(referenceProject.id, apiProfileId, 'reference_style');
        referenceStyle = result.value;
        provider = result.provider;
        model = result.model;
        modelCallCount = result.modelCallCount;
      } catch (error) {
        if ((error as { code?: string }).code === 'CANCELLED' || active.get(runId)?.cancelled) throw error;
        throw blockingError('MODEL_CALL_FAILED', `参考视觉分析模型调用失败：${(error as Error).message}`);
      }
      assertNotCancelled(runId);

      // §6 debug：原始参考观察（普通用户 UI 不展示）
      await fs.mkdir(path.join(root, 'debug'), { recursive: true });
      await writeJson(path.join(root, 'debug', 'raw-reference-observations.json'), {
        schemaVersion: referenceStyle.schemaVersion,
        referenceStyleProfile: referenceStyle,
        provider,
        model,
        modelCallCount
      });

      record = await saveRun({ ...record, provider, model, modelCallCount });
      const result = await compileAndPersist({
        record,
        merged: loaded.merged,
        visual: loaded.visual,
        referenceStyle,
        preference,
        avoidance,
        aspectRatio: input.aspectRatio,
        baseWarnings,
        startedAt: createdAt,
        startedTick
      });
      return result;
    } catch (error) {
      const cancelled = active.get(runId)?.cancelled || (error as { code?: string }).code === 'CANCELLED';
      const failed: ReferenceAnchorRun = {
        ...(await readRun(runId).catch(() => record)),
        status: cancelled ? 'cancelled' : 'failed',
        completedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - startedTick),
        errorCode: cancelled ? null : (error as { code?: string }).code || 'MODEL_CALL_FAILED',
        lastError: cancelled ? '用户已取消 Anchor 分析' : (error as Error).message
      };
      await saveRun(failed).catch(() => undefined);
      throw error;
    } finally {
      active.delete(runId);
      if (referenceProjectId) await dependencies.projects.remove(referenceProjectId).catch(() => undefined);
    }
  }

  // ── 读取产物 ──

  async function getCapsule(runId: string): Promise<ReferenceStyleCapsule> {
    return readJson<ReferenceStyleCapsule>(path.join(await runRoot(runId), 'outputs', CAPSULE_FILENAME));
  }

  async function getCapsuleMarkdown(runId: string): Promise<string> {
    return fs.readFile(path.join(await runRoot(runId), 'outputs', CAPSULE_MD_FILENAME), 'utf8');
  }

  async function getBrief(runId: string): Promise<string> {
    return fs.readFile(path.join(await runRoot(runId), 'outputs', BRIEF_FILENAME), 'utf8');
  }

  async function briefPath(runId: string): Promise<string> {
    const root = await runRoot(runId);
    await fs.access(path.join(root, 'outputs', BRIEF_FILENAME));
    return path.join(root, 'outputs', BRIEF_FILENAME);
  }

  /** §16 读取缓存的参考分析结果与合并上下文（重试路径零模型调用）。 */
  async function readCachedAnalysis(runId: string): Promise<{
    referenceStyle: ReferenceStyleProfile;
    visual: ProjectVisualContext;
    merged: MergedCurrentProject;
  }> {
    const root = await runRoot(runId);
    const observations = await readJson<{ referenceStyleProfile: ReferenceStyleProfile }>(
      path.join(root, 'debug', 'raw-reference-observations.json')
    ).catch(() => null);
    const context = await readJson<{ visual: ProjectVisualContext; merged: MergedCurrentProject }>(
      path.join(root, 'input', 'current-project-context.json')
    ).catch(() => null);
    if (!observations?.referenceStyleProfile || !context?.visual || !context?.merged) {
      throw new Error('该任务缺少可复用的参考分析缓存，请重新开始分析');
    }
    return { referenceStyle: observations.referenceStyleProfile, visual: context.visual, merged: context.merged };
  }

  // ── §13 重试范围 ──

  /** 修改继承重点/避免项 → 重编胶囊 + Brief（不重跑参考分析）。 */
  async function updatePreference(runId: string, preference: string, avoidance: string[]): Promise<ReferenceAnchorResult> {
    const record = await getRun(runId);
    if (!['awaiting_decision', 'completed', 'rejected', 'failed'].includes(record.status)) {
      throw new Error(`当前状态（${record.status}）不允许修改继承偏好`);
    }
    const cached = await readCachedAnalysis(runId);
    const nextPreference = String(preference || '').slice(0, 500).trim() || null;
    const nextAvoidance = [...new Set((avoidance || []).map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 12);
    const startedAt = new Date().toISOString();
    const startedTick = performance.now();
    const retried: ReferenceAnchorRun = {
      ...record,
      decision: 'pending',
      decisionNote: null,
      decidedAt: null,
      completedAt: undefined,
      retryCount: (record.retryCount || 0) + 1,
      errorCode: null,
      lastError: null
    };
    const result = await compileAndPersist({
      record: retried,
      merged: cached.merged,
      visual: cached.visual,
      referenceStyle: cached.referenceStyle,
      preference: nextPreference,
      avoidance: nextAvoidance,
      baseWarnings: [],
      startedAt,
      startedTick
    });
    await appendRuntimeEvent(path.join(await runRoot(runId), 'runtime'), runId, 'PREFERENCE_UPDATED', {
      retry_count: result.run.retryCount
    }).catch(() => undefined);
    return result;
  }

  /** 只调整 Brief → 只重编（或直接采用编辑后的）Brief，不重编胶囊。 */
  async function retryBrief(runId: string, editedBrief?: string): Promise<ReferenceAnchorResult> {
    const record = await getRun(runId);
    if (!['awaiting_decision', 'completed', 'rejected', 'failed'].includes(record.status)) {
      throw new Error(`当前状态（${record.status}）不允许重编 Anchor Brief`);
    }
    const capsule = await getCapsule(runId).catch(() => {
      throw new Error('该任务尚未生成参考风格胶囊，无法重编 Brief');
    });
    const briefMarkdown = String(editedBrief || '').trim() || compileAnchorBrief(capsule);
    if (!briefMarkdown.trim()) throw blockingError('ANCHOR_BRIEF_EMPTY', 'Anchor Generation Brief 为空');
    const validation = validateAnchorBrief(briefMarkdown);
    if (!validation.valid) {
      throw blockingError('SCHEMA_VALIDATION_FAILED', `Anchor Brief 未通过校验：${validation.errors.join('；')}`);
    }
    const root = await runRoot(runId);
    await fs.writeFile(path.join(root, 'outputs', BRIEF_FILENAME), briefMarkdown, 'utf8');
    await writeJson(path.join(root, 'debug', 'validation-details.json'), {
      terminalStatus: 'passed',
      briefValidation: validation,
      briefSource: editedBrief ? 'user_edited' : 'recompiled'
    });
    const saved = await saveRun({
      ...record,
      status: 'awaiting_decision',
      decision: 'pending',
      decisionNote: null,
      decidedAt: null,
      currentStage: '04-anchor-decision',
      retryCount: (record.retryCount || 0) + 1,
      briefFilename: BRIEF_FILENAME,
      errorCode: null,
      lastError: null
    });
    await appendRuntimeEvent(path.join(root, 'runtime'), runId, 'BRIEF_RETRIED', {
      source: editedBrief ? 'user_edited' : 'recompiled'
    }).catch(() => undefined);
    return {
      run: saved,
      capsule,
      capsuleMarkdown: await getCapsuleMarkdown(runId).catch(() => compileCapsuleMarkdown(capsule)),
      briefMarkdown
    };
  }

  /** 04-anchor-decision：设计师确认 / 重试 / 拒绝（§13）。 */
  async function setDecision(runId: string, decision: AnchorDecision, note?: string): Promise<ReferenceAnchorRun> {
    const record = await getRun(runId);
    if (!['awaiting_decision', 'completed', 'rejected'].includes(record.status)) {
      throw new Error(`当前状态（${record.status}）不允许记录 Anchor 决策`);
    }
    const decidedAt = new Date().toISOString();
    const status: ReferenceAnchorRunStatus = decision === 'approved'
      ? 'completed'
      : decision === 'rejected'
        ? 'rejected'
        : 'awaiting_decision';
    const saved = await saveRun({
      ...record,
      status,
      decision,
      decisionNote: String(note || '').slice(0, 500) || null,
      decidedAt,
      ...(decision === 'approved'
        ? { completedAt: decidedAt, durationMs: Math.max(0, Date.now() - new Date(record.createdAt).getTime()) }
        : {}),
      currentStage: '04-anchor-decision'
    });
    await appendRuntimeEvent(path.join(await runRoot(runId), 'runtime'), runId, 'ANCHOR_DECISION', {
      decision,
      has_note: Boolean(note)
    }).catch(() => undefined);
    return saved;
  }

  // ── §14 Legacy 适配器 ──

  /** 旧 reference-translation-v1 任务 → ReferenceStyleCapsule（尽力提取，绝不编造）。 */
  async function adaptLegacyRun(legacyRunId: string): Promise<ReferenceStyleCapsule> {
    const settings = await readSettings();
    const legacyRoot = path.join(path.resolve(settings.defaultDataPath), 'reference-translation-v1', safeRunId(legacyRunId));
    const run = await readJson<Record<string, unknown>>(path.join(legacyRoot, 'run.json'))
      .catch(async () => readJson<Record<string, unknown>>(path.join(legacyRoot, 'run-record.json')))
      .catch(() => null);
    if (!run) throw new Error('旧参考转译任务不存在或运行记录已损坏');
    const reconstruction = await readJson<Record<string, unknown>>(
      path.join(legacyRoot, 'intermediate', 'reference-style-reconstruction.json')
    ).catch(() => null);
    const profile = reconstruction ? null : await readJson<Record<string, unknown>>(
      path.join(legacyRoot, 'intermediate', 'reference-translation-profile.json')
    ).catch(async () => readJson<Record<string, unknown>>(
      path.join(legacyRoot, 'outputs', 'reference-translation-profile.json')
    )).catch(() => null);
    if (!reconstruction && !profile) throw new Error('旧任务缺少可转换的分析产物（reconstruction / profile 均不存在）');
    return adaptLegacyReferenceResultToStyleCapsule({
      run,
      reconstruction: reconstruction || profile
    });
  }

  // ── 取消 / 删除 ──

  async function cancel(runId: string): Promise<boolean> {
    const activeRun = active.get(safeRunId(runId));
    if (activeRun) {
      activeRun.cancelled = true;
      if (activeRun.pipelineProjectId) dependencies.pipeline.cancel(activeRun.pipelineProjectId);
      return true;
    }
    const record = await readRun(runId).catch(() => null);
    if (!record || !EXECUTING_STATUSES.has(record.status)) return false;
    await saveRun({ ...record, status: 'cancelled', completedAt: new Date().toISOString(), lastError: '用户已取消 Anchor 分析' }).catch(() => undefined);
    return true;
  }

  async function remove(runId: string): Promise<void> {
    if (active.has(safeRunId(runId))) throw new Error('正在运行的 Anchor 任务不能删除，请先取消');
    const root = await runRoot(runId);
    assertInside(await dataRoot(), root);
    await fs.rm(root, { recursive: true, force: true });
  }

  return {
    inspectAssets,
    listRuns,
    getRun,
    start,
    getCapsule,
    getCapsuleMarkdown,
    getBrief,
    briefPath,
    updatePreference,
    retryBrief,
    setDecision,
    adaptLegacyRun,
    cancel,
    remove,
    runRoot
  };
}

export type ReferenceAnchorService = ReturnType<typeof createReferenceAnchorService>;
