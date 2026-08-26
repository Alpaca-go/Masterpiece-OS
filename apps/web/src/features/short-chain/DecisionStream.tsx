// features/short-chain/DecisionStream.tsx
//
// Short-Chain 工作台右栏的用户态决策历史。
// 历史能力尚未接入时只展示可理解的空状态。

import { EmptyState, EmptyIllustration } from '../../components/primitives';

export function DecisionStream() {
  return (
    <div className="sc-decision-stream">
      <EmptyState
        icon={<EmptyIllustration variant="no-history" />}
        title="决策历史"
        description="生成并确认方案后，重要决定会记录在这里。"
        bordered
      />
    </div>
  );
}
