// features/short-chain/OutputGallery.tsx
//
// 路线 A / P1 — Short-Chain 工作台右栏 (下半部分: 已生成产物网格)。
// 当前阶段零运行时影响 — 不被 ShortChainPage import。
//
// 设计:
//   - 缩略图网格 (auto-fill, minmax(120, 1fr))
//   - 每条: 缩略图 + 时间戳 + status (confirmed / pending / failed)
//   - 选中态: 大图预览 + 操作按钮 (确认方向 / 取消确认)
//
// P1 起步只占位.

import { EmptyState } from '../../components/primitives/EmptyState';

export function OutputGallery() {
  return (
    <div className="sc-output-gallery">
      <EmptyState
        title="已生成产物"
        description="P1.1 接入 session.history (image 类型), 显示缩略图网格 + 已确认方向标记"
        bordered
      />
    </div>
  );
}