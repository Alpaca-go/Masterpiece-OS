// features/short-chain/PreviewCanvas.tsx
//
// 路线 A / P1.4 — ShortChain 工作台中栏 (核心画布)。
// 接入 useShortChainGeneration — 显示 displayableImage + flowState banner。
// P1-2 改进: 空状态升级为三步快速上手引导。
// P1-3 改进: 生成中状态改为分阶段进度条 (编译 → 提交 → 排队 → 生成 → 下载)。
//
// 当前阶段:
//   - 接受 hook result 通过 props (pure presentational)
//   - 渲染 4 个状态: idle / running / done / error
//   - 真实生成动作由 P1.8 在 ShortChainPage 顶层编排 (BriefEditor.onGenerate
//     → useShortChainGeneration.startValidated)

import type { ShortChainGenerationFlowState } from '@masterpiece/runtime-core/application-contracts.ts';
import type { ImageGenerationRun, ImageGenerationRunStatus } from '@masterpiece/runtime-core/application-contracts.ts';

export interface PreviewCanvasProps {
  // hook result
  displayableImage: string;
  flowState: ShortChainGenerationFlowState | null;
  isTerminal: boolean;
  /** 是否有 active run (用来区分 '还没生成' vs '生成中' vs '已生成') */
  hasActiveRun: boolean;
  activeRun: ImageGenerationRun | null;
  generationError: string;
}

const FLOW_STATE_COPY: Record<ShortChainGenerationFlowState, { tone: string; title: string; detail: string }> = {
  initial_failed: {
    tone: 'fail',
    title: '首次生成失败',
    detail: 'Provider 没有产出可用的图片。可以调整指令后重做，或更换 Provider 配置文件。',
  },
  awaiting_validation: {
    tone: 'info',
    title: '首次生成完成，等待自动对题',
    detail: '首张图已生成，多模态分析正在跑。图被保留；下一步会根据对题结果决定是否自动纠偏。',
  },
  correcting: {
    tone: 'info',
    title: '首次结果未对题，正在自动纠偏',
    detail: '首张图已保留（见下）。系统已发出一次纠偏 Prompt，Provider 正在跑修正版。',
  },
  correction_start_failed: {
    tone: 'warn',
    title: '自动纠偏启动失败',
    detail: '首张图已保留（见下）。Provider 在跑纠偏版时出错；可以调整指令后重做，或更换 Provider 配置文件。',
  },
  correction_still_failed: {
    tone: 'fail',
    title: '纠偏结果仍未通过',
    detail: '首张图已保留（见下）。纠偏版的多模态分析也未通过；系统已停止自动扩展，请调整要求后重做。',
  },
  passed: {
    tone: 'ok',
    title: '结果通过对题验证',
    detail: '可以沿用此方向作为同类型参考；当前 direction 未确认。',
  },
};

const ONBOARDING_STEPS = [
  { num: 1, title: '选择成果物类型', desc: '从空间、包装、VI、海报中选一个' },
  { num: 2, title: '描述你的创意要求', desc: '用自然语言写下风格、场景、氛围' },
  { num: 3, title: '点击智能生成', desc: 'AI 自动编译 Brief 并产出结果' },
];

// 生成阶段定义 — 按顺序排列
const GENERATION_STAGES: Array<{
  key: string;
  label: string;
  statuses: ImageGenerationRunStatus[];
  weight: number;  // 占总进度的百分比权重
}> = [
  { key: 'compiling',  label: '编译验证',  statuses: ['created', 'validating', 'ready', 'blocked'], weight: 10 },
  { key: 'submitting', label: '提交请求',  statuses: ['submitting'],                                       weight: 10 },
  { key: 'queued',     label: '排队中',    statuses: ['queued'],                                           weight: 5  },
  { key: 'running',    label: 'AI 生成',   statuses: ['running'],                                          weight: 60 },
  { key: 'downloading',label: '下载处理',  statuses: ['downloading'],                                      weight: 15 },
];

function getCurrentStageIndex(status: ImageGenerationRunStatus | undefined): number {
  if (!status) return -1;
  return GENERATION_STAGES.findIndex((stage) => stage.statuses.includes(status));
}

function calcProgressPercent(status: ImageGenerationRunStatus | undefined): number {
  const stageIdx = getCurrentStageIndex(status);
  if (stageIdx < 0) return 0;
  // 已完成阶段的权重之和 + 当前阶段的一半（模拟进度）
  let completed = 0;
  for (let i = 0; i < stageIdx; i++) {
    const stage = GENERATION_STAGES[i];
    if (stage) completed += stage.weight;
  }
  const current = GENERATION_STAGES[stageIdx];
  if (current) completed += current.weight * 0.5;
  return Math.min(99, Math.round(completed));
}

function formatElapsed(startedAt: string | undefined): string {
  if (!startedAt) return '00:00';
  const start = new Date(startedAt).getTime();
  const elapsed = Math.floor((Date.now() - start) / 1000);
  const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function PreviewCanvas(props: PreviewCanvasProps) {
  const { displayableImage, flowState, hasActiveRun, activeRun, generationError } = props;

  const isGenerating = hasActiveRun && !displayableImage;
  const currentStageIdx = getCurrentStageIndex(activeRun?.status);
  const progressPct = isGenerating ? calcProgressPercent(activeRun?.status) : 0;
  const currentStage = currentStageIdx >= 0 ? GENERATION_STAGES[currentStageIdx] : null;
  const currentStageLabel = currentStage?.label ?? '准备中';

  return (
    <div className="sc-preview-canvas">
      {/* Flow state banner */}
      {flowState && (
        <div className={`sc-flow-banner sc-flow-banner--${FLOW_STATE_COPY[flowState]?.tone || 'info'}`}>
          <strong>{FLOW_STATE_COPY[flowState]?.title}</strong>
          <p>{FLOW_STATE_COPY[flowState]?.detail}</p>
        </div>
      )}

      {/* Generation error */}
      {generationError && (
        <div className="sc-preview-canvas__error" role="alert">
          {generationError}
        </div>
      )}

      {/* Image canvas */}
      {displayableImage ? (
        <img
          className="sc-preview-canvas__image"
          src={displayableImage}
          alt="生成结果"
        />
      ) : (
        <div className="sc-preview-canvas__placeholder">
          {isGenerating ? (
            <div className="sc-generation-progress">
              <div className="sc-generation-progress__header">
                <div className="sc-generation-progress__spinner" aria-hidden>↻</div>
                <div>
                  <strong className="sc-generation-progress__title">{currentStageLabel}…</strong>
                  <span className="sc-generation-progress__time">
                    用时 {formatElapsed(activeRun?.createdAt)}
                  </span>
                </div>
                <span className="sc-generation-progress__pct">{progressPct}%</span>
              </div>

              <div className="sc-progress-bar" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className="sc-progress-bar__fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <ol className="sc-progress-stages">
                {GENERATION_STAGES.map((stage, i) => {
                  const state =
                    i < currentStageIdx ? 'done' :
                    i === currentStageIdx ? 'active' :
                    'pending';
                  return (
                    <li key={stage.key} className={`sc-progress-stage sc-progress-stage--${state}`}>
                      <span className="sc-progress-stage__dot" aria-hidden />
                      <span className="sc-progress-stage__label">{stage.label}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : (
            <div className="sc-onboarding">
              <div className="sc-onboarding__eyebrow">快速上手</div>
              <h2 className="sc-onboarding__title">三步开始创作</h2>
              <ol className="sc-onboarding__steps">
                {ONBOARDING_STEPS.map((step) => (
                  <li key={step.num} className="sc-onboarding__step">
                    <span className="sc-onboarding__step-num">{step.num}</span>
                    <div className="sc-onboarding__step-body">
                      <strong>{step.title}</strong>
                      <span>{step.desc}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="sc-onboarding__hint">
                💡 提示：越具体的描述，生成结果越符合预期。试试在「本轮要求」里写出风格、材质、光线氛围。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
