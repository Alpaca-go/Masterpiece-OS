// features/short-chain/BriefEditor.tsx
//
// 路线 A / P1 §5 + §6 P1 — Short-Chain 工作台左栏。
// 当前阶段零运行时影响 — 不被 ShortChainPage import (P1 末段才接)。
//
// 设计:
//   - 顶部: 项目名 / 品牌名 (readonly / inline-edit)
//   - 中部: 创意要求 (instruction) — textarea, 主输入
//   - 下部: 必须包含 / 必须避免 (multiline)
//   - 底部: 智能生成主按钮
//
// P1 起步只占位 (EmptyState 提示). 真正接入 ShortChainWorkspace state 在 P1.1+.

import { EmptyState } from '../../components/primitives/EmptyState';

export function BriefEditor() {
  return (
    <div className="sc-brief-editor">
      <EmptyState
        title="Brief 编辑器"
        description="P1.1 接入 ShortChainGenerationWorkspace 的 subtype / shot / instruction / mustInclude / mustAvoid 状态"
        bordered
      />
    </div>
  );
}