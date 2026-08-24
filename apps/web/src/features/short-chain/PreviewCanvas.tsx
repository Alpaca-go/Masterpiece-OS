// features/short-chain/PreviewCanvas.tsx
//
// 路线 A / P1.4 — ShortChain 工作台中栏 (核心画布)。
// 接入 useShortChainGeneration — 显示 displayableImage + flowState banner。
//
// 当前阶段:
//   - 接受 hook result 通过 props (pure presentational)
//   - 渲染 4 个状态: idle / running / done / error
//   - 真实生成动作由 P1.8 在 ShortChainPage 顶层编排 (BriefEditor.onGenerate
//     → useShortChainGeneration.startValidated)

import type { ShortChainGenerationFlowState } from '@masterpiece/runtime-core/application-contracts.ts';

export interface PreviewCanvasProps {
  // hook result
  displayableImage: string;
  flowState: ShortChainGenerationFlowState | null;
  isTerminal: boolean;
  /** 是否有 active run (用来区分 '还没生成' vs '生成中' vs '已生成') */
  hasActiveRun: boolean;
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

export function PreviewCanvas(props: PreviewCanvasProps) {
  const { displayableImage, flowState, hasActiveRun, generationError } = props;

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
          {hasActiveRun ? (
            <div className="sc-preview-canvas__spinner" aria-hidden>↻</div>
          ) : null}
          <strong>暂无生成结果</strong>
          <p>填写左侧创意要求，点击「智能生成」开始。</p>
        </div>
      )}
    </div>
  );
}