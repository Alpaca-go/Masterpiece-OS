// pages/ShortChainPage.tsx
//
// 路线 A / P0 — ShortChainPage 三栏装配 (spec §5 + §6 P0 / P1)。
//
// 当前阶段零运行时影响 — 不被 main.tsx 路由 (main.tsx 没切换到 routes.tsx)。
// P1.1: 接入 ShortChainGenerationWorkspace state (subtype / shot / imageDataUrl ...),
// 替换占位 EmptyState 为真实组件。

import { ThreeColumnLayout } from '../components/layout/ThreeColumnLayout';
import { BriefEditor } from '../features/short-chain/BriefEditor';
import { PreviewCanvas } from '../features/short-chain/PreviewCanvas';
import { DecisionStream } from '../features/short-chain/DecisionStream';
import { OutputGallery } from '../features/short-chain/OutputGallery';

export function ShortChainPage() {
  return (
    <ThreeColumnLayout
      left={<BriefEditor />}
      center={<PreviewCanvas />}
      right={
        <>
          <DecisionStream />
          <OutputGallery />
        </>
      }
    />
  );
}