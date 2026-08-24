// pages/ShortChainPage.tsx
//
// 路线 A / P1.3 — ShortChainPage 顶层装配 4 组件 + 顶层 useShortChainBrief hook。
//
// 当前阶段:
//   - main.tsx 没切换路由 (P1.7 才接)
//   - BriefEditor 接入 useShortChainBrief 真表单 (P1.3 起步完成)
//   - PreviewCanvas / DecisionStream / OutputGallery 仍 EmptyState 占位
//     (分别在 P1.4 / P1.5 / P1.6 才接 hook)

import { ThreeColumnLayout } from '../components/layout/ThreeColumnLayout';
import { BriefEditor } from '../features/short-chain/BriefEditor';
import { PreviewCanvas } from '../features/short-chain/PreviewCanvas';
import { DecisionStream } from '../features/short-chain/DecisionStream';
import { OutputGallery } from '../features/short-chain/OutputGallery';
import { useShortChainBrief } from '../features/short-chain/hooks/useShortChainBrief';

export function ShortChainPage() {
  // P1.3: 顶层调 hook, 把 result 传给 BriefEditor.
  // P1.5 才接 useShortChainSession / useShortChainGeneration / useShortChainContinuation.
  const brief = useShortChainBrief();

  return (
    <ThreeColumnLayout
      left={
        <BriefEditor
          family={brief.family}
          subtype={brief.subtype}
          shot={brief.shot}
          aspectRatio={brief.aspectRatio}
          instruction={brief.instruction}
          mustIncludeText={brief.mustIncludeText}
          mustAvoidText={brief.mustAvoidText}
          logoUsageMode={brief.logoUsageMode}
          canCompile={brief.canCompile}
          setFamily={brief.setFamily}
          changeFamily={brief.changeFamily}
          setSubtype={brief.setSubtype}
          setShot={brief.setShot}
          setAspectRatio={brief.setAspectRatio}
          setInstruction={brief.setInstruction}
          setMustIncludeText={brief.setMustIncludeText}
          setMustAvoidText={brief.setMustAvoidText}
          setLogoUsageMode={brief.setLogoUsageMode}
          onGenerate={() => { /* P1.5 才接 useShortChainGeneration.startValidated */ }}
          compiling={brief.compiling}
          error={brief.error}
          notice={brief.notice}
        />
      }
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