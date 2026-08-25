// pages/CreatePage.tsx
//
// B3 — 从 App.tsx 抽出来的 create screen 统一父组件。
// 负责 create-shell-v2 布局 + AnalysisModeTabs 三态分发。
//
// 三个主要 tab:
//   1. visual-analysis — ProjectWizard (视觉分析)
//   2. creative-intelligence — CreativeIntelligenceWorkspace (智能创意, 内嵌 + hideChrome)
//   3. reference-anchor — ReferenceAnchorWorkspace (参考锚定)
//
// document-context 是 hidden legacy tab (仍保留, 但 UI 不展示,
// AnalysisModeTabs 不显式渲染 document-context button,
// 仅保留 key 用于向后兼容 deep link).

import type { ReactNode } from 'react';
import type { ProjectRecord, PublicSettings } from '@masterpiece/runtime-core/application-contracts.ts';
import type { Screen } from '../lib/useUrlScreen';
import { AnalysisModeTabs, type AnalysisMode } from '../components/AnalysisModeTabs';
import { ProjectWizard } from '../components/ProjectWizard';
import { ReferenceAnchorWorkspace } from '../components/ReferenceAnchorWorkspace';
import { DocumentContextWorkspace } from '../components/DocumentContextWorkspace';
import { CreativeIntelligenceWorkspace } from '../components/CreativeIntelligenceWorkspace';

export interface CreatePageProps {
  // state
  settings: PublicSettings;
  analysisMode: AnalysisMode;
  selectedApiProfileId: string;
  requestedReferenceAnchorRunId: string;
  requestedDocumentContextRunId: string;
  projects: ProjectRecord[];

  // setters / actions
  setAnalysisMode(mode: AnalysisMode): void;
  setSelectedApiProfileId(id: string): void;
  setRequestedReferenceAnchorRunId(id: string): void;
  setRequestedDocumentContextRunId(id: string): void;
  setSelected(project: ProjectRecord): void;
  setScreen(screen: Screen): void;
  setSettingsReturnScreen(screen: Screen): void;
  goHome(): void; // setScreen('home') + refresh
  openImageGeneration(opts: ImageGenerationOpenOpts): void;
  runAnalysis(project: ProjectRecord, force: boolean, profileId: string): void | Promise<void>;
}

// 简化 openImageGeneration 参数类型 (与 App.tsx 中 openImageGeneration 调用点对齐)
export interface ImageGenerationOpenOpts {
  preset: string;
  purpose: string;
  projectId?: string;
  visual?: { projectId: string };
  reference?: { referenceAnchorRunId: string };
  document?: { documentRunId: string };
  userIntent?: Record<string, unknown>;
}

/**
 * 从 Reference Anchor Brief 提取一段方向摘要作为生图 intent。
 * Brief 是 markdown，第一段通常是品牌方向叙述；从开头截取一段作为预填。
 * Runtime 通过通用 RPC 暴露 referenceAnchor.getBrief（ReferenceAnchorWorkspace 也在用），
 * 但 createPage 的类型假设下需要 cast。
 */
async function loadReferenceAnchorIntent(referenceAnchorRunId: string): Promise<Record<string, unknown>> {
  try {
    const api = window.masterpiece as unknown as {
      referenceAnchor?: { getBrief?: (id: string) => Promise<string | null | undefined> };
    };
    if (!api.referenceAnchor?.getBrief) return {};
    const brief = await api.referenceAnchor.getBrief(referenceAnchorRunId);
    if (!brief) return {};
    const trimmed = brief.trim().slice(0, 280);
    return trimmed ? { prompt: trimmed } : {};
  } catch {
    return {};
  }
}

export function CreatePage(props: CreatePageProps) {
  const {
    settings,
    analysisMode,
    selectedApiProfileId,
    requestedReferenceAnchorRunId,
    requestedDocumentContextRunId,
    projects,
    setAnalysisMode,
    setSelectedApiProfileId,
    setRequestedReferenceAnchorRunId,
    setRequestedDocumentContextRunId,
    setSelected,
    setScreen,
    setSettingsReturnScreen,
    goHome,
    openImageGeneration,
    runAnalysis,
  } = props;

  return (
    <div className="create-shell-v2">
      <header className="create-shell-v2__bar">
        <button
          className="ui-button ui-button--ghost ui-button--sm"
          onClick={goHome}
        >
          <span aria-hidden>←</span> 返回首页
        </button>
        <AnalysisModeTabs
          value={analysisMode}
          onChange={(mode) => {
            setAnalysisMode(mode);
            if (mode !== 'document-context') setRequestedDocumentContextRunId('');
            if (mode !== 'reference-anchor') setRequestedReferenceAnchorRunId('');
          }}
        />
        <div className="create-shell-v2__spacer" />
      </header>
      <div className="create-shell-v2__body">
        {/* Tab 1: 视觉分析 */}
        <div hidden={analysisMode !== 'visual-analysis'}>
          <ProjectWizard
            settings={settings}
            onCancel={goHome}
            onStart={(project, profileId) => {
              setSelected(project);
              setSelectedApiProfileId(profileId);
              void runAnalysis(project, true, profileId);
            }}
          />
        </div>

        {/* Tab 2: 智能创意 (内嵌, 隐藏内层 chrome) */}
        <div hidden={analysisMode !== 'creative-intelligence'}>
          <CreativeIntelligenceWorkspace
            settings={settings}
            selectedApiProfileId={selectedApiProfileId}
            onApiProfileChange={setSelectedApiProfileId}
            onBack={goHome}
            onOpenSettings={() => { setSettingsReturnScreen('create'); setScreen('settings'); }}
            hideChrome
          />
        </div>

        {/* Tab 3: 参考锚定 */}
        <div hidden={analysisMode !== 'reference-anchor'}>
          <ReferenceAnchorWorkspace
            settings={settings}
            selectedApiProfileId={selectedApiProfileId}
            initialRunId={requestedReferenceAnchorRunId}
            onApiProfileChange={setSelectedApiProfileId}
            onBack={goHome}
            onOpenSettings={() => { setSettingsReturnScreen('create'); setScreen('settings'); }}
            onGenerateReferencePreview={async (projectId, referenceAnchorRunId) => {
              const userIntent = await loadReferenceAnchorIntent(referenceAnchorRunId);
              openImageGeneration({
                preset: 'reference_preview',
                purpose: 'exploration',
                projectId,
                reference: { referenceAnchorRunId },
                userIntent,
              });
            }}
            onGenerateMasterAnchor={async (projectId, referenceAnchorRunId) => {
              const userIntent = await loadReferenceAnchorIntent(referenceAnchorRunId);
              openImageGeneration({
                preset: 'integrated_anchor',
                purpose: 'production',
                projectId,
                visual: { projectId },
                reference: { referenceAnchorRunId },
                userIntent,
              });
            }}
            onContinueCreativeProduction={(projectId) => {
              const project = projects.find((item) => item.id === projectId);
              if (project) {
                setSelected(project);
                setScreen('creative-session');
              }
            }}
          />
        </div>

        {/* Legacy hidden tab: 文档分析 (UI 不展示, 仅保留 deep link 兼容) */}
        <div hidden={analysisMode !== 'document-context'}>
          <DocumentContextWorkspace
            settings={settings}
            selectedApiProfileId={selectedApiProfileId}
            initialRunId={requestedDocumentContextRunId}
            onApiProfileChange={setSelectedApiProfileId}
            onBack={goHome}
            onOpenSettings={() => { setSettingsReturnScreen('create'); setScreen('settings'); }}
            onGenerateConcept={(documentRunId) =>
              openImageGeneration({
                preset: 'document_concept',
                purpose: 'exploration',
                document: { documentRunId },
                userIntent: {},
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

// 防止 TS 警告: ReactNode import 用于潜在的 children prop (当前未用, 但保留类型引用)
type _UnusedReactNode = ReactNode;
void 0 as _UnusedReactNode;