// pages/ShortChainPage.tsx
//
// 路线 A / P1.4 — ShortChainPage 接入 useShortChainGeneration hook + PreviewCanvas 真组件。
// P1-1 改进: 包上统一 AppShell + TopBar，确保所有页面一致的导航体验。
//
// 当前阶段:
//   - App.tsx 切到 <ShortChainPage /> 渲染 (P1.7a 完成)
//   - BriefEditor 接入 useShortChainBrief 真表单 (P1.3 完成)
//   - PreviewCanvas 接入 useShortChainGeneration (P1.4 完成)
//   - OutputGallery 只展示当前真实生成结果，不注入演示数据

import { useCallback, useEffect, useMemo } from 'react';
import type { ProjectRecord } from '@masterpiece/runtime-core/application-contracts.ts';
import { AppShell } from '../components/layout/AppShell';
import { TopBar, TopBarBrand, TopBarBreadcrumb, TopBarActions } from '../components/layout/TopBar';
import { ThemeToggle } from '../theme';
import { ThreeColumnLayout } from '../components/layout/ThreeColumnLayout';
import { BriefEditor } from '../features/short-chain/BriefEditor';
import { PreviewCanvas } from '../features/short-chain/PreviewCanvas';
import { RightPanel } from '../features/short-chain/RightPanel';
import type { OutputItem } from '../features/short-chain/OutputGallery';
import { useShortChainBrief } from '../features/short-chain/hooks/useShortChainBrief';
import { useShortChainGeneration } from '../features/short-chain/hooks/useShortChainGeneration';
// P1.7 路由切换: import CSS 让 Vite 发现并打包
import '../features/short-chain/brief-editor.css';
import '../features/short-chain/preview-canvas.css';
import '../features/short-chain/right-panel.css';

export interface ShortChainPageProps {
  /** 当前项目 (App.tsx 的 selected: ProjectRecord) — P1.5 才被 hook 消费 */
  project?: ProjectRecord;
  /** 当前启用的生图 Provider profile。 */
  apiProfileId?: string;
  /** 返回项目详情页 */
  onBack?: () => void;
  /** 返回首页 */
  onGoHome?: () => void;
  /** 未配置生图 Provider 时进入设置。 */
  onOpenSettings?: () => void;
}

export function ShortChainPage({ project, apiProfileId = '', onBack, onGoHome, onOpenSettings }: ShortChainPageProps) {
  // P1.3: 顶层调 brief hook, P1.4: 加 generation hook.
  // P1.5 起的 session / continuation 接入待新 hook 设计 (原 useShortChainSession
  // + useShortChainContinuation 已在 audit 2026-08-25 commit F2 中删除).
  // P1.7 起 project prop 由 App.tsx 传入; P1.8+ routes 路由化时由 URL hash 解出.
  const brief = useShortChainBrief();
  const gen = useShortChainGeneration();

  const projectName = project?.projectName || '未命名项目';

  useEffect(() => {
    if (!gen.activeRun?.runId) return undefined;
    return gen.subscribeProgress(gen.activeRun.runId);
  }, [gen.activeRun?.runId, gen.subscribeProgress]);

  const handleGenerate = useCallback(async () => {
    if (!project || brief.compiling || gen.starting) return;
    if (!apiProfileId) {
      onOpenSettings?.();
      return;
    }
    const compiled = await brief.compile(project.id, null);
    if (!compiled) return;
    await gen.startValidated(project.id, compiled, apiProfileId);
  }, [apiProfileId, brief, gen, onOpenSettings, project]);

  const outputItems = useMemo<OutputItem[]>(() => {
    if (!gen.displayableImage) return [];
    const failed = gen.flowState === 'initial_failed'
      || gen.flowState === 'correction_start_failed'
      || gen.flowState === 'correction_still_failed';
    return [{
      id: gen.activeRun?.runId || gen.firstImage?.runId || 'current-output',
      dataUrl: gen.displayableImage,
      thumbnailDataUrl: gen.displayableImage,
      createdAt: gen.activeRun?.createdAt || new Date().toISOString(),
      family: brief.family,
      subtype: brief.subtype,
      status: failed ? 'failed' : gen.flowState === 'passed' ? 'passed' : 'pending',
    }];
  }, [brief.family, brief.subtype, gen.activeRun, gen.displayableImage, gen.firstImage, gen.flowState]);

  return (
    <AppShell
      workspaceMode
      topBar={
        <TopBar
          left={
            <>
              <TopBarBrand name="Masterpiece OS" tag="创作" />
              <TopBarBreadcrumb
                items={[
                  { label: '项目', onClick: onGoHome },
                  { label: projectName, onClick: onBack },
                  { label: '创作' },
                ]}
              />
            </>
          }
          right={
            <TopBarActions>
              {onBack && (
                <button
                  className="ui-button ui-button--ghost ui-button--sm"
                  onClick={onBack}
                >
                  ← 返回项目
                </button>
              )}
              <ThemeToggle />
            </TopBarActions>
          }
        />
      }
    >
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
            onGenerate={() => void handleGenerate()}
            compiling={brief.compiling || gen.starting}
            error={brief.error}
            notice={brief.notice}
          />
        }
        center={
          <PreviewCanvas
            displayableImage={gen.displayableImage}
            flowState={gen.flowState}
            isTerminal={gen.isTerminal}
            hasActiveRun={gen.starting || gen.activeRun !== null}
            activeRun={gen.activeRun}
            generationError={gen.generationError}
          />
        }
        right={
          <RightPanel outputItems={outputItems} />
        }
      />
    </AppShell>
  );
}
