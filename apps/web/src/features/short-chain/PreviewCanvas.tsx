// features/short-chain/PreviewCanvas.tsx
//
// 路线 A / P1 — Short-Chain 工作台中栏 (核心)。
// 当前阶段零运行时影响 — 不被 ShortChainPage import (P1 末段才接)。
//
// 设计:
//   - 16:9 画布占满中栏宽度
//   - 顶部 overlay: 当前运行 status (compiling / running / done / error)
//   - 右下角 overlay: 决策点高亮 (continuation / revival / 跨场景 提示)
//   - 底部: 上次生成时间 / 模型 / 耗时
//
// P1 起步只占位.

import { EmptyState } from '../../components/primitives/EmptyState';

export function PreviewCanvas() {
  return (
    <div className="sc-preview-canvas">
      <EmptyState
        title="Preview Canvas"
        description="P1.1 接入 imageDataUrl + run.status + activeRun, 显示大图 + 决策点 overlay"
      />
    </div>
  );
}