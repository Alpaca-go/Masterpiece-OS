// features/short-chain/DecisionStream.tsx
//
// 路线 A / P1 — Short-Chain 工作台右栏 (上半部分: 决策历史)。
// 当前阶段零运行时影响 — 不被 ShortChainPage import。
//
// 设计:
//   - 时间线 (从 session.history 倒序)
//   - 每条 entry: 时间戳 + 类型 (compile / run / confirm / revoke) + 摘要
//   - 可点击跳到对应输出
//
// P1 起步只占位.

import { EmptyState } from '../../components/primitives/EmptyState';

export function DecisionStream() {
  return (
    <div className="sc-decision-stream">
      <EmptyState
        title="决策历史"
        description="P1.1 接入 session.history, 显示时间线 (compile → run → confirm → revoke)"
        bordered
      />
    </div>
  );
}