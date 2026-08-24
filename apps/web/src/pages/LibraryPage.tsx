// pages/LibraryPage.tsx
//
// P0 阶段空白路由占位 (路线 A §3.3 / §5 / §6)
//
// 当前阶段零运行时影响。P2 实施时由真实只读列表 + 详情填充。

import { EmptyState } from '../components/primitives/EmptyState';

export function LibraryPage() {
  return (
    <div className="ui-page ui-page--library">
      <EmptyState
        title="Library — 历史产物"
        description="P2 实施时填充已生成产物 / 已确认方向的只读列表 + 详情"
        bordered
      />
    </div>
  );
}