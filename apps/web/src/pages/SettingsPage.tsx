// pages/SettingsPage.tsx
//
// P0 阶段空白路由占位 (路线 A §3.3 / §5 / §6)
//
// 当前阶段零运行时影响。P2 实施时由真实 Provider / Profile / Registry
// 设置面板填充 — 通过 SDK 写回后端 Profile/Registry。

import { EmptyState } from '../components/primitives/EmptyState';

export function SettingsPage() {
  return (
    <div className="ui-page ui-page--settings">
      <EmptyState
        title="Settings — Provider / Profile / Registry"
        description="P2 实施时通过 SDK 写回后端，重启后保留"
        bordered
      />
    </div>
  );
}