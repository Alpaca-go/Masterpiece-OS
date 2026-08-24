// pages/ShortChainPage.tsx
//
// P0 阶段空白路由占位 (路线 A §3.3 信息架构 / §5 目录结构 / §6 P0 验收)
//
// 当前阶段零运行时影响 — 不被 main.tsx 路由。P1 实施时由
// BriefEditor + PreviewCanvas + DecisionStream + OutputGallery 装配。

import { ThreeColumnLayout } from '../components/layout/ThreeColumnLayout';
import { EmptyState } from '../components/primitives/EmptyState';

export function ShortChainPage() {
  return (
    <ThreeColumnLayout
      left={<EmptyState title="Brief 编辑器" description="P1 实施时填充项目/参考/参数表单" bordered />}
      center={<EmptyState title="Preview Canvas" description="P1 实施时填充大图 + 决策点高亮 + 来源标注" />}
      right={<EmptyState title="Inspector / 决策历史" description="P1 实施时填充决策时间线 + 上下文面板" bordered />}
    />
  );
}